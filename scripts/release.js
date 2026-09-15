#!/usr/bin/env node
/**
 * 一键发布（零依赖，Node 原生）
 *
 * 本仓库的规则：任何面向用户的更新，都必须同步提升版本号并发布到 npm。
 * 这个脚本把整条链路收敛成一条命令，避免「改了代码忘了发版」。
 *
 * 用法：
 *   npm run release              # patch（修 bug / 样式 / 文档）
 *   npm run release -- minor     # minor（新增组件、新增 props/事件/插槽）
 *   npm run release -- major     # major（删除或重命名 props、改变默认行为）
 *   npm run release -- 1.4.2     # 指定具体版本号
 *   npm run release -- minor --dry-run   # 只跑校验与产物生成，不写任何东西
 *
 * 执行顺序：
 *   1. 发布前校验（结构 / 路径 / 类型覆盖 / 模板作用域）
 *   2. 重新生成 index.js、types/index.d.ts、docs/API.md、README.md
 *   3. 提升 package.json 版本号
 *   4. git commit + tag vX.Y.Z
 *   5. git push（分支与 tag）
 *   6. npm publish --access public
 *   7. 回查 registry 确认已上线
 *
 * 需要凭证：项目级 .npmrc 中的、带 Bypass 2FA 的 npm token（否则报 EOTP）。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const YES = args.includes('--yes') || args.includes('-y');
const positional = args.filter((a) => !a.startsWith('-'));

const LEVELS = ['patch', 'minor', 'major'];
const target = positional[0] || 'patch';
const isExplicitVersion = /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(target);

if (!isExplicitVersion && !LEVELS.includes(target)) {
  console.error(`\n  x 无法识别的版本级别: ${target}`);
  console.error('    可用: patch | minor | major | 具体版本号（如 1.4.2）\n');
  process.exit(1);
}

function log(step, msg) {
  console.log(`  [${step}] ${msg}`);
}

/**
 * Windows 上必须借 shell 才能调用 npm.cmd / python 这类包装脚本，
 * 但一旦走 shell，参数就会被 cmd.exe 按空格重新切分——
 * `git commit -m "chore(release): v1.1.0"` 会被拆成 `-m chore(release):` 加
 * 一个凭空多出来的 pathspec `v1.1.0`，导致提交直接失败。所以含空白或
 * shell 元字符的参数必须自己加引号。
 */
function quoteForShell(arg) {
  const s = String(arg);
  if (s === '') return '""';
  if (!/[\s"&|<>^()%!,;=]/.test(s)) return s;
  // 按 MS C runtime 规则转义：反斜杠仅在引号前需要翻倍
  return '"' + s.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, '$1$1') + '"';
}

function run(cmd, cmdArgs, opts = {}) {
  const useShell = opts.shell === undefined ? isWin : opts.shell;
  const res = useShell
    ? spawnSync([cmd, ...cmdArgs].map(quoteForShell).join(' '), {
        cwd: root,
        stdio: opts.capture ? 'pipe' : 'inherit',
        encoding: 'utf8',
        shell: true,
      })
    : spawnSync(cmd, cmdArgs, {
        cwd: root,
        stdio: opts.capture ? 'pipe' : 'inherit',
        encoding: 'utf8',
      });
  return {
    ok: res.status === 0,
    status: res.status,
    out: (res.stdout || '') + (res.stderr || ''),
  };
}

function fail(msg) {
  console.error(`\n  x ${msg}\n`);
  process.exit(1);
}

function bumpVersion(version, level) {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) fail(`package.json 的 version 格式不正确: ${version}`);
  let [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (level === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (level === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function findPython() {
  for (const cmd of ['python', 'python3', 'py']) {
    const res = run(cmd, ['--version'], { capture: true });
    if (res.ok) return cmd;
  }
  return null;
}

console.log('\n[vui-uniapp] 一键发布');
console.log(`  模式: ${DRY_RUN ? 'dry-run（不写入任何内容）' : '正式发布'}`);
console.log(`  版本: ${isExplicitVersion ? `指定为 ${target}` : `按 ${target} 递增`}`);

// ---------- 0. 前置检查 ----------
const pkgPath = path.join(root, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;
const nextVersion = isExplicitVersion ? target : bumpVersion(currentVersion, target);
console.log(`  版本号: ${currentVersion} -> ${nextVersion}`);

const npmrcPath = path.join(root, '.npmrc');
const hasUserNpmrc = fs.existsSync(path.join(process.env.USERPROFILE || process.env.HOME || '', '.npmrc'));
if (!DRY_RUN && !fs.existsSync(npmrcPath) && !hasUserNpmrc) {
  fail('未找到 .npmrc，发布必然失败。请先写入带 Bypass 2FA 的 npm token：\n' +
    '      //registry.npmjs.org/:_authToken=<你的 token>\n' +
    '    注意 token 必须以 npm_ 开头，且创建时勾选 Bypass 2FA。');
}
if (fs.existsSync(npmrcPath)) {
  const gi = run('git', ['check-ignore', '.npmrc'], { capture: true });
  if (!gi.ok) {
    fail('.npmrc 未被 .gitignore 忽略！token 有泄露风险，请先在 .gitignore 中加入 .npmrc。');
  }
}

// ---------- 1. 发布前校验 ----------
console.log('\n[1/7] 发布前校验');
if (!run('node', ['scripts/prepublish-check.js']).ok) fail('校验未通过，已中止发布。');

// ---------- 2. 重新生成产物 ----------
console.log('\n[2/7] 重新生成产物');
const python = findPython();
if (!python) {
  console.log('  ! 未检测到 python，跳过自动生成。');
  console.log('    若刚新增/修改过组件，请先手工刷新 index.js、types/index.d.ts、docs/API.md、README.md，');
  console.log('    否则包内容会与源码脱节。');
} else {
  for (const script of ['scripts/gen-package.py', 'scripts/gen-docs.py']) {
    if (!run(python, [script]).ok) fail(`生成脚本执行失败: ${script}`);
  }
}

// 生成后复校一次，确保产物与源码一致
if (python) {
  console.log('\n       生成后复校');
  if (!run('node', ['scripts/prepublish-check.js']).ok) {
    fail('重新生成产物后校验未通过，请检查组件定义。');
  }
}

if (DRY_RUN) {
  console.log('\n  dry-run 结束：校验与产物生成均已通过，未做任何写入。');
  console.log(`  ${currentVersion} -> ${nextVersion}（未写入）\n`);
  process.exit(0);
}

// ---------- 3. 版本号 ----------
console.log('\n[3/7] 提升版本号');
pkg.version = nextVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
log('ok', `package.json: ${currentVersion} -> ${nextVersion}`);

// 同步 uni_modules 各组件 package.json 的版本（uni-app 插件市场按此识别）
let synced = 0;
const um = path.join(root, 'uni_modules');
if (fs.existsSync(um)) {
  for (const mod of fs.readdirSync(um)) {
    const p = path.join(um, mod, 'package.json');
    if (!fs.existsSync(p)) continue;
    try {
      const m = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (m.version !== nextVersion) {
        m.version = nextVersion;
        fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n', 'utf8');
        synced += 1;
      }
    } catch (e) {
      console.log(`  ! ${mod}/package.json 解析失败，已跳过`);
    }
  }
}
log('ok', `同步 ${synced} 个组件的 package.json 版本`);

// ---------- 4. 提交与打 tag ----------
console.log('\n[4/7] 提交并打 tag');
if (!run('git', ['add', '-A']).ok) fail('git add 失败');
const staged = run('git', ['diff', '--cached', '--name-only'], { capture: true });
if (!staged.out.trim()) {
  console.log('  ! 没有需要提交的改动。');
} else {
  if (!run('git', ['commit', '-m', `chore(release): v${nextVersion}`]).ok) fail('git commit 失败');
}
if (!run('git', ['tag', '-a', `v${nextVersion}`, '-m', `v${nextVersion}`]).ok) {
  fail(`git tag v${nextVersion} 失败（该 tag 可能已存在）`);
}
log('ok', `tag v${nextVersion}`);

// ---------- 5. 推送 ----------
console.log('\n[5/7] 推送分支与 tag');
if (!run('git', ['push', 'origin', 'HEAD']).ok) fail('git push 失败');
if (!run('git', ['push', 'origin', `v${nextVersion}`]).ok) fail('推送 tag 失败（可稍后手动重试）');

// ---------- 6. 发布 ----------
console.log('\n[6/7] 发布到 npm');
if (!YES && process.stdin.isTTY) {
  process.stdout.write(`  即将发布 vui-uniapp@${nextVersion}，确认？(y/N) `);
  const answer = (() => {
    try {
      const buf = Buffer.alloc(16);
      const n = fs.readSync(0, buf, 0, 16, null);
      return buf.slice(0, n).toString('utf8').trim().toLowerCase();
    } catch (e) {
      return 'n';
    }
  })();
  if (answer !== 'y' && answer !== 'yes') fail('已取消发布（分支与 tag 已推送，可稍后单独执行 npm publish）。');
} else if (!YES) {
  console.log('  （非交互环境，自动继续）');
}
if (!run('npm', ['publish', '--access', 'public']).ok) {
  fail('npm publish 失败。常见原因：token 前缀不是 npm_ / token 未开 Bypass 2FA（报 EOTP）/ 版本号已存在于 registry。');
}

// ---------- 7. 回查 ----------
console.log('\n[7/7] 回查 registry');
const view = run('npm', ['view', `vui-uniapp@${nextVersion}`, 'version'], { capture: true });
if (view.ok) {
  log('ok', `vui-uniapp@${nextVersion} 已上线`);
} else {
  console.log('  ! 回查未成功（可能是 CDN 传播延迟）。');
  console.log(`    请稍后手动确认: npm view vui-uniapp@${nextVersion} version`);
}

console.log(`\n  发布完成: vui-uniapp@${nextVersion}`);
console.log('  https://www.npmjs.com/package/vui-uniapp\n');
