#!/usr/bin/env node
'use strict';
/**
 * check-all.js —— 校验链的**唯一入口**：清单从 package.json 现算，不再手写第二份
 *
 * 为什么需要它
 * ------------
 * AGENTS.md 第八节写着「清单的唯一来源是 `npm run check:all`，不要再在别处手写一份清单
 * （两处写法必然漂移）」。但那条规则此前**没有落点**：`check:all` 自己就是一条手写的
 * `&&` 串，而 package.json 里紧挨着还有一整套 `check:*` 独立入口 —— 那正是第二份清单。
 * 两份当时是一致的，差别只在「新加一条 check 时会不会记得接进链里」，而那件事本仓
 * 已经真实发生过一次：`check:sfc` 建立之后长期没进发布链（第 2 轮才补上），
 * 期间发布链一路打印「全绿」，而它一次都没跑过。
 *
 * 现在清单由 package.json 现算，**「接线」这一步在构造上不存在了**：新增一条
 * `check:xxx` 就自动落在链上，不需要记任何事。反方向也锁住：`scripts/check-*.js`
 * 必须都有自己的入口 —— 「脚本写了但没人调它」是另一种静默失效
 * （`check-template-refs.js` 就长期只被 `require`，没有独立入口）。
 *
 * 「不能静默跳过」是本文件的总原则
 * --------------------------------
 * 任何**解析不出来、跑不起来**的入口一律算失败，绝不跳过：
 *   - 入口值不是 `node scripts/xxx.js` 形态  → 失败（而不是「看不懂就不跑」）
 *   - 入口指向的文件不存在                  → 失败
 *   - `scripts/check-*.js` 没有对应入口     → 失败
 *   - 清单条数不足 FLOOR 条                 → 失败
 * 最后一条尤其重要：枚举一旦失灵，其余断言会**在空集上全绿**（本仓
 * `check:rules` 已写过「避免解析失灵导致规则在空集上全绿」这条自证），
 * 所以判据必须带一条「清单足够长」的不变量。
 *
 * 自证
 * ----
 * `plan()` 是纯函数（输入是 package.json 对象 + scripts/ 下的文件名），
 * 本脚本每次运行都会**无条件**先跑一遍 `selfTest()`：四类坏输入必须被判出、同一批输入
 * 正常时必须判绿。所以「守卫自己坏掉」不会表现为静默通过。
 *
 * 用法：node scripts/check-all.js   （= npm run check:all）
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');

/** 清单条数下限。减到 12 条以下说明枚举出了问题，而不是「检查变少了」。 */
const FLOOR = 12;

/** 入口值的唯一合法形态：`node scripts/xxx.js`，可有前导/尾随空格。 */
const ENTRY_RE = /^node\s+scripts\/([\w.-]+\.js)$/;

/**
 * 由 package.json + scripts/ 文件名算出「要跑哪些」与「哪些不对劲」。**纯函数**。
 *
 * @param {Record<string,string>} table package.json 的 scripts 段
 * @param {string[]} scriptFiles scripts/ 目录下的文件名（不含子目录）
 * @returns {{names: string[], errors: string[]}}
 */
function plan(table, scriptFiles) {
  const errors = [];
  const names = Object.keys(table).filter(
    (k) => k !== 'check:all' && (k === 'check' || k.startsWith('check:'))
  );

  // ① 清单必须够长：枚举失灵时不能变成「0 条检查，全部通过」
  if (names.length < FLOOR) {
    errors.push(
      `校验链只枚举出 ${names.length} 条（下限 ${FLOOR}）—— 清单来自 package.json 的 ` +
        '`check` / `check:*` 入口，条数骤降说明枚举或包结构出了问题，不能当作「检查变少了」放过去。'
    );
  }

  // ② 每条入口都必须**跑得起来**：形态不对或文件不存在，一律失败，绝不跳过
  for (const name of names) {
    const value = String(table[name] ?? '').trim();
    const m = ENTRY_RE.exec(value);
    if (!m) {
      errors.push(
        `入口 \`${name}\` 的值不是 \`node scripts/xxx.js\` 形态（实际：${JSON.stringify(value)}）。` +
          'check-all 无法直接执行它 —— 请统一入口形态，或改本脚本的解析；**不许静默跳过**。'
      );
      continue;
    }
    if (!scriptFiles.includes(m[1])) {
      errors.push(`入口 \`${name}\` 指向的 scripts/${m[1]} 不存在。`);
    }
  }

  // ③ 反方向：scripts/check-*.js 必须有自己的入口（「脚本写了但没人调它」也是静默失效）
  const declared = new Set(names.map((n) => (ENTRY_RE.exec(String(table[n]).trim()) || [])[1]).filter(Boolean));
  const allValues = Object.values(table).map((v) => String(v)).join('\n');
  const orphan = scriptFiles
    .filter((f) => /^check-.*\.js$/.test(f))
    .filter((f) => !declared.has(f) && !allValues.includes(`scripts/${f}`));
  if (orphan.length) {
    errors.push(
      `scripts/ 下有校验脚本没有对应入口，等于**从来不会被执行**：${orphan.join('、')}。` +
        '请为它在 package.json 里加一条 `check:xxx` 入口（自动就会进校验链）。'
    );
  }

  return { names, errors };
}

/**
 * 自证。**每次运行都会走一遍**，四类坏输入必须判出、正常输入必须判绿。
 * 判据刻意从「被扫对象之外」现算：坏输入是我当场构造的，不依赖仓库当前状态。
 */
function selfTest() {
  const files = ['check-ok.js', 'check-probe.js'];
  const base = { 'check:all': 'node scripts/check-all.js' };
  const full = { ...base };
  for (let i = 0; i < FLOOR; i += 1) full[`check:dummy${i}`] = 'node scripts/check-ok.js';

  const cases = [
    { name: '正常输入', table: full, files: files.filter((f) => f === 'check-ok.js'), want: [] },
    {
      name: '注入·脚本存在但没有入口（check-probe.js 孤零零）',
      table: full,
      files,
      want: ['check-probe.js'],
    },
    {
      name: '注入·入口值不是 node scripts/xxx.js 形态',
      table: { ...full, 'check:dummy0': 'echo hello' },
      files: files.filter((f) => f === 'check-ok.js'),
      want: ['不是'],
    },
    {
      name: '注入·入口指向的文件不存在',
      table: { ...full, 'check:dummy1': 'node scripts/check-gone.js' },
      files: files.filter((f) => f === 'check-ok.js'),
      want: ['check-gone.js'],
    },
    {
      name: '注入·清单只剩 2 条（枚举失灵）',
      table: { ...base, 'check:a': 'node scripts/check-ok.js', 'check:b': 'node scripts/check-ok.js' },
      files: files.filter((f) => f === 'check-ok.js'),
      want: ['下限'],
    },
  ];

  let bad = 0;
  console.log('\n[vui-uniapp] 校验链清单的自证');
  for (const c of cases) {
    let got = [];
    try {
      got = plan(c.table, c.files).errors;
    } catch (e) {
      got = [`抛异常：${e && e.message}`];
    }
    const hit = c.want.every((w) => got.some((g) => g.includes(w)));
    const extra = c.want.length === 0 ? got.length === 0 : true;
    if (hit && extra) {
      console.log(`  ok  ${c.name}`);
    } else {
      bad += 1;
      console.log(`  x   ${c.name}\n      期望含：${JSON.stringify(c.want)}\n      实际：${JSON.stringify(got)}`);
    }
  }
  if (bad) {
    console.log('\n  校验链的自证没通过 —— 下面这次「全绿」不可信。\n');
    return false;
  }
  console.log('  4 类坏输入都被判出，正常输入判绿。\n');
  return true;
}

function main() {
  if (!selfTest()) process.exit(1);

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const table = pkg.scripts || {};
  const scriptFiles = fs
    .readdirSync(path.join(root, 'scripts'), { encoding: 'utf8' })
    .filter((f) => fs.statSync(path.join(root, 'scripts', f)).isFile());

  const { names, errors } = plan(table, scriptFiles);
  if (errors.length) {
    console.log('\n[vui-uniapp] 校验链清单有问题：');
    errors.forEach((e) => console.log(`  x ${e}`));
    console.log('');
    process.exit(1);
  }

  console.log(`[vui-uniapp] 校验链：${names.length} 条（清单由 package.json 现算，无第二份）`);
  console.log(`  ${names.join(' → ')}\n`);

  const failed = [];
  for (const name of names) {
    const value = String(table[name]).trim();
    const file = ENTRY_RE.exec(value)[1];
    process.stdout.write(`\n──────── npm run ${name}  (scripts/${file})\n`);
    const r = spawnSync(process.execPath, [path.join('scripts', file)], {
      cwd: root,
      encoding: 'utf8',
    });
    const out = `${r.stdout || ''}${r.stderr || ''}`.replace(/\s+$/, '');
    if (out) process.stdout.write(out + '\n');
    if (r.status !== 0) {
      failed.push({ name, status: r.status });
      console.log(`  ✗ ${name} 失败（退出码 ${r.status}）`);
    }
  }

  console.log('\n[vui-uniapp] 校验链结果');
  for (const name of names) {
    const f = failed.find((x) => x.name === name);
    console.log(`  ${f ? 'x' : 'ok'}  ${name}${f ? `  (exit ${f.status})` : ''}`);
  }
  if (failed.length) {
    console.log(`\n${failed.length} / ${names.length} 条未通过：${failed.map((f) => f.name).join('、')}\n`);
    process.exit(1);
  }
  console.log(`\n${names.length} 条全部通过。\n`);
}

if (require.main === module) main();

module.exports = { plan, FLOOR };
