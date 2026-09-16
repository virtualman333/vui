#!/usr/bin/env node
/**
 * 类型声明校验 —— 落实 AGENTS.md 第八节「类型声明」一条。
 *
 * 为什么需要它
 * ------------
 * `types/index.d.ts`（1357 行）是 npm 包对使用方的**全部类型接口**，由
 * `scripts/gen-package.py` 从各组件的 props 自动生成，每次发布重新生成。
 * 它此前没有任何校验：
 *  - check-sfc 只解析 `.vue`
 *  - prepublish-check 只核对「index.js 导出的组件在 d.ts 里都有」（覆盖性）
 * 覆盖性 ≠ 合法性：d.ts 完全可以「每个组件都在，但文件本身语法/类型是错的」，
 * 此时使用方 IDE 里 `import { VuiButton } from 'vui-uniapp'` 会一片报红，
 * 而本仓库静态检查全绿。
 *
 * 做法（对应第八节括号里的要求）
 * ------------------------------
 * `tsc --noEmit` + 自建 `vue` 模块 stub + `moduleResolution: bundler`。
 * stub 是必须的：本包只把 vue 列为 peerDependency 且 optional，仓库里并没有
 * 安装 vue，直接跑 tsc 会因 `import type { DefineComponent } from 'vue'`
 * 解析失败而报一堆与真实性无关的错。
 *
 * 关键点：`skipLibCheck` 必须为 **false**
 * --------------------------------------
 * 默认的 skipLibCheck:true 会**跳过所有 .d.ts 的检查**——而本脚本要查的正是
 * 一个 .d.ts。开着它跑，等于什么都没查。
 *
 * 临时产物（stub / tsconfig / d.ts 副本）都写在系统临时目录，不落进仓库根，
 * 避免给 HBuilderX 与 easycom 留下多余文件。
 *
 * 用法：
 *   npm run check:types
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const DTS = path.join(root, 'types', 'index.d.ts');

console.log('\n[vui-uniapp] 类型声明校验');

// ---------- 前置：依赖与产物 ----------
let tscJs;
try {
  // 与调用方的 node 版本绑定，不依赖 PATH（Windows 上 .cmd 包装脚本还会被 shell 重新切分参数）
  tscJs = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
} catch {
  tscJs = null;
}
if (!tscJs || !fs.existsSync(tscJs)) {
  console.log('  x 未安装 typescript（本仓库把它放在 devDependencies）。');
  console.log('    修复：npm install   # 或 npm install --save-dev typescript\n');
  process.exit(1);
}
if (!fs.existsSync(DTS)) {
  console.log('  x 找不到 types/index.d.ts');
  console.log('    请先执行 python scripts/gen-package.py 生成类型声明。\n');
  process.exit(1);
}

// ---------- 搭临时工程 ----------
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vui-types-'));

// vue stub：只声明本包 d.ts 用到的两个导出，够 tsc 解析即可
const VUE_STUB = `declare module "vue" {
  export type DefineComponent<P = Record<string, unknown>, R = unknown> = {
    new (): { $props: P; $slots: Record<string, (...args: unknown[]) => unknown> };
    props?: P;
  } & Record<string, unknown>;
  export interface Plugin {
    install(app: unknown, ...options: unknown[]): unknown;
  }
}
`;

const TSCONFIG = {
  compilerOptions: {
    noEmit: true,
    target: 'ES2020',
    module: 'ESNext',
    moduleResolution: 'bundler',
    strict: true,
    // 必须 false：要检查的就是 .d.ts 本身
    skipLibCheck: false,
    types: [],
  },
  files: ['vue-stub.d.ts', 'index.d.ts'],
};

let res;
try {
  fs.writeFileSync(path.join(tmpDir, 'vue-stub.d.ts'), VUE_STUB, 'utf8');
  fs.copyFileSync(DTS, path.join(tmpDir, 'index.d.ts'));
  fs.writeFileSync(
    path.join(tmpDir, 'tsconfig.json'),
    JSON.stringify(TSCONFIG, null, 2),
    'utf8'
  );
  res = spawnSync(process.execPath, [tscJs, '-p', path.join(tmpDir, 'tsconfig.json')], {
    cwd: tmpDir,
    encoding: 'utf8',
  });
} finally {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* 清理失败不影响判定 */
  }
}

if (res.error) {
  console.log(`  x 无法执行 tsc: ${res.error.message}\n`);
  process.exit(1);
}

const out = `${res.stdout || ''}${res.stderr || ''}`.trim();

if (res.status !== 0) {
  const decls = (fs.readFileSync(DTS, 'utf8').match(/^export\s+(const|interface|type)\s/gm) || [])
    .length;
  console.log(`  声明条数:     ${decls}`);
  console.log('\n  错误:');
  console.log(out.split(/\r?\n/).map((l) => `    ${l}`).join('\n'));
  console.log('\n类型声明存在错误，校验未通过。使用方引入本包时 IDE 会报错。\n');
  process.exit(1);
}

const src = fs.readFileSync(DTS, 'utf8');
const decls = (src.match(/^export\s+(const|interface|type)\s/gm) || []).length;
const lines = src.split(/\r?\n/).length;
console.log(`  行数:         ${lines}`);
console.log(`  声明条数:     ${decls}`);
console.log(`  tsc 版本:     ${require('typescript/package.json').version}`);
console.log('\n  类型声明校验通过。\n');
