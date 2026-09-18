#!/usr/bin/env node
/**
 * source.js —— 「从组件源码里读出结构化事实」的唯一实现
 *
 * 为什么要有它
 * ------------
 * `check-rules.js` 早就写了一份 `stripComments` / `scriptBlock` / `templateBlock`，
 * 第 23 轮的 `check-api.js` 要用同一套东西（props 名、`@property`、`<slot>`、`@slot`）。
 * 再抄一份就是「同一事实写两处」—— 本仓已经栽过：`components.js` 的注释里记着，
 * 组件集合曾在 6 个脚本里各算一遍、语义有三种，其中一种还会**静默丢弃**新组件。
 *
 * 所以这里只留一份，两个调用方都 import 它。**改这里等于同时改两个检查**。
 *
 * 「先剥注释」是硬规则
 * --------------------
 * 这套解析器服务的都是「读源码做判定」的检查，而注释里出现被判定词是常态
 * （`vui-markdown` 的 JSDoc 就写着「不使用 v-html」，`vui-chat-input` 的
 * `@property stopText` 也长得跟真用法一样）。不剥注释的第一版会把它们全报成违规，
 * 或者反过来 —— 把注释当成实现、把真实现当成没事。
 *
 * ⚠ 与 Python 生成器的**等价性**
 * ------------------------------
 * `propsOf` / `SLOT_RE` 与 `scripts/gen-package.py`、`scripts/gen-docs.py` 里的
 * 同名解析是同一套语义，`check-api.js` 会拿生成出来的 `types/index.d.ts` 与
 * `docs/API.md` 反向对账 —— 两边一旦漂移，`check:all` 立刻红。
 * 注意 Python 的 `\w` 在 str 模式下**会匹配中文**而 JS 的 `\w` 只匹配 ASCII，
 * 所以这里的字符类一律写显式 ASCII 范围（`[A-Za-z0-9_]`），不用 `\w`。
 */
'use strict';

/** 剥掉 `//` 行注释、`/* *\/` 块注释与 `<!-- -->` HTML 注释，并保护字符串字面量。 */
function stripComments(src) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (quote) {
      if (c === '\\') {
        out += c + (n === undefined ? '' : n);
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      out += c;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === '/' && n === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    // HTML 注释（模板块里）
    if (c === '<' && src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i);
      i = end === -1 ? src.length : end + 3;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** 取 `<script>` 块（保留注释，供 JSDoc 判定用）；取不到返回 null */
function scriptBlock(raw) {
  const m = /<script[^>]*>([\s\S]*?)<\/script>/.exec(raw);
  return m ? m[1] : null;
}

/**
 * 取根 `<template>` 块。不能简单用非贪婪匹配到第一个 `</template>`：
 * 组件里普遍有 `<template v-if>` 子块，那样会截断。根块固定在最外层，
 * 因此取「第一个 `<template`」到「`<script` 之前的最后一个 `</template>`」。
 */
function templateBlock(raw) {
  const start = raw.indexOf('<template');
  if (start === -1) return null;
  const scriptAt = raw.indexOf('<script');
  const region = scriptAt === -1 ? raw : raw.slice(0, scriptAt);
  const end = region.lastIndexOf('</template>');
  if (end === -1 || end <= start) return null;
  return raw.slice(start, end + '</template>'.length);
}

/** 首块 JSDoc 的正文（不含 `/**` 与 `*\/`）；没有就返回 '' */
function firstJsDoc(script) {
  if (!script) return '';
  const m = /\/\*\*([\s\S]*?)\*\//.exec(script);
  return m ? m[1] : '';
}

/**
 * 找到 `key: {` 的配对 `}`，返回 `[体起点, 体终点]`（含端点之间的正文不在这里返回）。
 * 字符串字面量与转义都会被跳过，所以 `default: '}'` 里那个花括号不会算数。
 */
function braceSpan(src, openAt) {
  let depth = 0;
  let i = openAt;
  let inStr = null;
  while (i < src.length) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === inStr) inStr = null;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
    } else if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return [openAt, i];
    }
    i += 1;
  }
  return null;
}

/** 按顶层逗号切分对象体（括号 / 引号里的逗号不算） */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let buf = '';
  let inStr = null;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (inStr) {
      buf += ch;
      if (ch === '\\') {
        buf += body[i + 1] || '';
        i += 1;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      buf += ch;
      continue;
    }
    if (ch === '{' || ch === '[' || ch === '(') depth += 1;
    else if (ch === '}' || ch === ']' || ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf);
  return parts;
}

/**
 * 去掉段首那些**整行都是注释**的行。
 *
 * 段是按顶层逗号切的，所以「prop 上面单独一行写 `// 说明`」会让那行注释跟着下一个
 * prop 被切进同一段。旧生成器是 `if (seg.startsWith('//')) continue` —— 于是**整个
 * prop 被当成注释丢掉**。实测 `vui-tag` 的 `text` 就这么从 `types/index.d.ts` 与
 * `docs/API.md` 里消失了（TS 无提示、文档查不到），而所有检查全绿。
 * 只剔行首注释、不做全文替换：`default: 'https://…'` 里的 `//` 不会被误伤。
 *
 * ⚠ 段首还可能是**空行**（段是按逗号切的，闭括号后面紧跟着换行）。第一版没跳过空行，
 * `''.startsWith('//')` 为假、循环当场就 break —— 补丁看起来改了、`vui-tag.text`
 * 依然不见。判据必须是「空行 **或** 注释行」。
 */
function dropLeadingCommentLines(seg) {
  const lines = seg.split('\n');
  let i = 0;
  while (i < lines.length) {
    const s = lines[i].trim();
    if (!s || s.startsWith('//') || (s.startsWith('/*') && s.endsWith('*/'))) {
      i += 1;
      continue;
    }
    break;
  }
  return lines.slice(i).join('\n');
}

/**
 * `props: { … }` 的**顶层键名**（顺序即源码顺序）。
 * 与 `gen-package.py` / `gen-docs.py` 的 `parse_props` 同语义。
 */
function propsOf(script) {
  if (!script) return [];
  const m = /\bprops\s*:\s*\{/.exec(script);
  if (!m) return [];
  const openAt = script.indexOf('{', m.index);
  const span = braceSpan(script, openAt);
  if (!span) return [];
  const body = script.slice(span[0] + 1, span[1]);
  const out = [];
  for (const raw of splitTopLevel(body)) {
    const seg = dropLeadingCommentLines(raw).trim();
    if (!seg) continue;
    const mm = /^([A-Za-z_$][A-Za-z0-9_$]*)\s*:/.exec(seg);
    if (mm) out.push(mm[1]);
  }
  return out;
}

/** 去掉 `props: { … }` 整块之后的源码（查「这个 prop 全库有没有人读」用） */
function withoutPropsBlock(src) {
  const m = /\bprops\s*:\s*\{/.exec(src);
  if (!m) return src;
  const openAt = src.indexOf('{', m.index);
  const span = braceSpan(src, openAt);
  if (!span) return src;
  return src.slice(0, span[0]) + src.slice(span[1] + 1);
}

/** JSDoc `@property {T} name 说明` 的名字集合（顺序即文档顺序） */
function propertyNames(doc) {
  const out = [];
  for (const m of doc.matchAll(/@property\s*\{[^}]*\}\s*([A-Za-z_$][A-Za-z0-9_$]*)/g)) {
    out.push(m[1]);
  }
  return out;
}

/**
 * JSDoc 里的插槽登记：`@slot [名称] [{作用域参数}] 说明`
 *
 * ⚠ 与 `scripts/gen-docs.py` 的 `SLOT_RE` **必须逐字一致**（字符类显式 ASCII，
 *   别用 `\w` —— Python 的 `\w` 会匹配中文，JS 的不会）。`check-api.js` 拿本函数
 *   的解析结果去对账 `docs/API.md`，两边漂移就会红。
 */
const SLOT_RE = /@slot\s*([A-Za-z_$][A-Za-z0-9_$.-]*)?\s*(?:\{([^}]*)\})?\s*(.*)/g;

/** `@slot` → Map(名称 → 作用域参数原文，无作用域为 '')；未写名称记作 default */
function slotDocs(doc) {
  const out = new Map();
  for (const m of doc.matchAll(SLOT_RE)) {
    out.set(m[1] || 'default', (m[2] || '').trim());
  }
  return out;
}

/**
 * 模板里的插槽：`{ literal: Map(名 → 出现次数), dynamic: [表达式] }`。
 *
 * 名称是字符串字面量的算字面量槽；`:name="expr"` / `v-bind:name="expr"` 归到
 * `dynamic`（静态对账抓不到它，交给 check-api 的 DYNAMIC_SLOTS 登记表盯着，
 * **不许静默漏掉**）；没有 name 属性的算默认插槽。
 */
function templateSlots(tpl) {
  const literal = new Map();
  const dynamic = [];
  if (!tpl) return { literal, dynamic };
  for (const m of tpl.matchAll(/<slot\b([^>]*)>/g)) {
    const attrs = m[1];
    /* ⚠ 字面量 name 的判据必须是「空白（或串首）紧跟在 name 之前」。
       写成 `\bname\s*=` 会把 `<slot :name="column.key">` **当成字面量槽** ——
       `:` 是非单词字符，`\b` 在它后面成立，于是动态插槽被读成一个叫 column.key
       的普通插槽：名字碰巧对得上，`dynamic` 却是空的，DYNAMIC_SLOTS 登记表
       随即被判「已失效」。实测（首跑）就是这个症状。 */
    const lit = /(?:^|\s)name\s*=\s*"([^"]*)"/.exec(attrs) || /(?:^|\s)name\s*=\s*'([^']*)'/.exec(attrs);
    if (lit) {
      literal.set(lit[1], (literal.get(lit[1]) || 0) + 1);
      continue;
    }
    const dyn = /(?::|v-bind:)name\s*=\s*"([^"]*)"/.exec(attrs) || /(?::|v-bind:)name\s*=\s*'([^']*)'/.exec(attrs);
    if (dyn) {
      dynamic.push(dyn[1]);
      continue;
    }
    literal.set('default', (literal.get('default') || 0) + 1);
  }
  return { literal, dynamic };
}

/**
 * 极简 Markdown 表格解析：把一段文本里**连续的 `|` 行**各当成一张表。
 * 返回 `[{ header: [...], rows: [[...]] }]`，单元格已 trim 并去掉包裹的反引号。
 */
function markdownTables(text) {
  const strip = (s) => s.trim().replace(/^`(.*)`$/, '$1');
  const tables = [];
  let cur = null;
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|')) {
      cur = null;
      continue;
    }
    const cells = line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(strip);
    if (!cur) {
      cur = { header: cells, rows: [] };
      tables.push(cur);
      continue;
    }
    if (cells.every((c) => /^-{2,}$/.test(c.replace(/:/g, '-')))) continue; // 分隔行
    cur.rows.push(cells);
  }
  return tables;
}

module.exports = {
  dropLeadingCommentLines,
  firstJsDoc,
  markdownTables,
  propertyNames,
  propsOf,
  scriptBlock,
  splitTopLevel,
  slotDocs,
  stripComments,
  templateBlock,
  templateSlots,
  withoutPropsBlock,
  SLOT_RE,
};
