#!/usr/bin/env node
/**
 * components.js —— 「本仓库有哪些组件」的唯一实现
 *
 * 为什么必须收敛到一处
 * --------------------
 * 同一个事实（组件集合）此前在 6 个脚本里各算了一遍，而且**语义有三种**：
 *
 *   A. 只看 `uni_modules/<mod>` 目录名               → check-gen.js / check-pack.js / release.js
 *   B. 还要 `components/<comp>/<comp>.vue` 存在       → prepublish-check.js / check-sfc.js（**不存在就静默丢弃**）
 *   C. `uni_modules/**\/*.vue` 的全部 .vue 文件       → check-theme.js / check-template-refs.js
 *
 * 语义 B 的静默丢弃是本文件存在的主要理由。实测（在仓库副本里放一个 `.vue` 名字写错的新组件，
 * 即 `uni_modules/vui-probe/components/vui-probe/index.vue`）：
 *
 *   · `prepublish-check`（`prepublishOnly` 钩子调的就是它）**照样打印「校验通过，可以发布」**；
 *   · 同一个脚本自己的两行输出互相矛盾 —— `组件数量: 48` 与 `模板已查: 49 个组件`
 *     （前者走语义 B、后者走语义 C），而没有任何东西提示这个矛盾；
 *   · AGENTS.md 第三节「组件目录必须严格一致」这条红线的后果是**用户的 easycom 配置静默失效**
 *     （组件根本不在包里），检查却全绿。
 *
 * 所以本模块的约定是：**枚举永不静默丢弃**。目录在、同名 `.vue` 不在，就返回一条
 * `hasVue: false` 的条目，由调用方报错；而不是把它从集合里移出去、让分母变小。
 *
 * 三个导出（都在这里定义一次，调用方不要再自己 `readdirSync` 拼一份）：
 *   · `listComponents()` —— 每个组件一条，含结构问题标记（结构检查用）
 *   · `componentIds()`   —— 组件 id（= `uni_modules` 下的模块目录名，与 CATEGORY 白名单 / tarball 核对 / 版本同步共用）
 *   · `vueFiles()`       —— `uni_modules` 下全部 `.vue`（主题块、模板作用域这类「按文件」的检查用）
 *
 * `vueFiles()` 与 `componentIds()` 的**数量必须一致**（一个组件恰好一个入口 .vue），
 * 这条不变量由 `scripts/check-components.js` 盯着 —— 它正是上面那对矛盾数字的解药。
 */
const fs = require('fs');
const path = require('path');

/** 仓库根目录（scripts/lib/ → 上两级） */
const root = path.resolve(__dirname, '..', '..');
const MODULES_DIR = path.join(root, 'uni_modules');

/** 组件模块目录的前缀（uni-app 插件市场的命名约定） */
const MODULE_PREFIX = 'vui-';

/** 包内每个组件必须齐的四件套（AGENTS.md 第三节） */
const COMPONENT_PARTS = ['package.json', 'readme.md', 'changelog.md'];

/**
 * 枚举 `uni_modules` 下的全部组件。**不静默丢弃任何目录。**
 *
 * 返回 `{ id, mod, comp, dir, compsDir, vue, hasVue, problem }`：
 *   - `id`     组件 id，等于 `uni_modules` 下的模块目录名（等价于组件 id，历史如此）；
 *   - `comp`   实际存放 `.vue` 的子目录名，正常情况下 === `id`；
 *   - `vue`    easycom 要求的入口文件路径（`components/<comp>/<comp>.vue`），恒为字符串，便于报错时点名；
 *   - `hasVue` 该文件是否真的存在。false = 结构坏了，**必须由调用方报错**；
 *   - `problem` `null` | `'no-components-dir'`（缺 `components/`）| `'no-vue'`（缺同名 .vue）
 *              | `'mismatch'`（子目录名与模块名不同 → easycom 通配规则不成立）
 */
function listComponents() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  const out = [];
  const mods = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith(MODULE_PREFIX))
    .map((d) => d.name)
    .sort();

  for (const mod of mods) {
    const dir = path.join(MODULES_DIR, mod);
    const compsDir = path.join(dir, 'components');
    const subs = fs.existsSync(compsDir)
      ? fs
          .readdirSync(compsDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .sort()
      : [];

    if (!subs.length) {
      out.push({
        id: mod,
        mod,
        comp: null,
        dir,
        compsDir,
        vue: path.join(compsDir, mod, mod + '.vue'),
        hasVue: false,
        problem: 'no-components-dir',
      });
      continue;
    }

    for (const comp of subs) {
      const vue = path.join(compsDir, comp, comp + '.vue');
      const hasVue = fs.existsSync(vue);
      out.push({
        id: mod,
        mod,
        comp,
        dir,
        compsDir,
        vue,
        hasVue,
        problem: !hasVue ? 'no-vue' : comp !== mod ? 'mismatch' : null,
      });
    }
  }
  return out;
}

/** 组件 id 列表（去重、升序）—— CATEGORY 白名单比对 / tarball 核对 / 版本同步用 */
function componentIds() {
  return [...new Set(listComponents().map((c) => c.id))].sort();
}

/** `uni_modules` 下全部 `.vue` 文件（绝对路径）—— 按文件而非按组件的检查用 */
function vueFiles(dir = MODULES_DIR, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) vueFiles(p, out);
    else if (entry.name.endsWith('.vue')) out.push(p);
  }
  return out;
}

module.exports = {
  root,
  MODULES_DIR,
  MODULE_PREFIX,
  COMPONENT_PARTS,
  listComponents,
  componentIds,
  vueFiles,
};
