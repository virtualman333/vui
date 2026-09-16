#!/usr/bin/env node
/**
 * 发布前置检查的自检（零依赖，Node 原生）
 *
 * 为什么需要它
 * ------------
 * `scripts/release-preflight.js` 的结论决定「要不要真的往下走」：它说没问题，
 * `release.js` 就会改写 `package.json`、打 tag、推远端、发布。而这条逻辑**平时走不到
 * 失败分支** —— 本机只有「没登录」一种情形会真实触发，其余判据（目标版本已被 registry
 * 占用、本地 tag 已存在、`.npmrc` 未被忽略）只有真的踩到那一天才会执行。
 * 「从没红过的断言不算锁」，所以这里注入假环境，把每条判据单独跑一遍。
 *
 * 其中专门锁住一个**曾经的漏洞**：旧实现只检查 `.npmrc` **文件是否存在**，
 * 于是「有 .npmrc、但没有 token」会一路放行到 `npm publish`，把仓库留在
 * 「版本已升、tag 已推、包没发」的状态。用例「只有 registry 配置的 ~/.npmrc」为它而写。
 *
 * 另有一条**结构断言**：`release.js` 必须在任何写入之前调用 `preflight` —— 判据是
 * `preflight(` 的位置早于第一个 `fs.writeFileSync(` 与第一个 `git add`。
 * 把检查挪到 bump 之后就等于没查（那时文件已经改完了）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const { preflight, inspectRegistryHit } = require('./release-preflight');

const PKG = 'vui-uniapp';
const NEXT = '1.2.1';

/** 构造一个假环境；未指定的命令一律抛错，用来暴露「多调了不该调的命令」 */
function mkEnv(o = {}) {
  const calls = [];
  const res = (spec) => {
    if (spec === undefined) throw new Error(`未预期的调用: ${calls[calls.length - 1]}`);
    if (typeof spec === 'string') return { ok: false, status: 1, out: spec };
    return spec;
  };
  const run = (cmd, args) => {
    const line = `${cmd} ${args.join(' ')}`;
    calls.push(line);
    if (cmd === 'npm' && args[0] === 'whoami') return res(o.whoami);
    if (cmd === 'npm' && args[0] === 'view') return res(o.view);
    if (cmd === 'git' && args[0] === 'rev-parse') return res(o.tag);
    if (cmd === 'git' && args[0] === 'check-ignore') return res(o.ignore);
    throw new Error(`未预期的调用: ${line}`);
  };
  const fileExists = (p) => Boolean(o.hasNpmrc) && path.basename(p) === '.npmrc';
  const go = (extra = {}) => preflight({ nextVersion: NEXT, pkgName: PKG, cwd: root, run, fileExists, ...extra });
  return { run, fileExists, calls, go };
}

const OK_AUTH = { ok: true, status: 0, out: 'virtualman\n' };
const FREE = { ok: false, status: 1, out: 'npm error code E404\nnpm error 404 Not Found' };

const CASES = [];
const t = (name, fn) => CASES.push({ name, fn });

// ── 正常路径 ────────────────────────────────────────────────────────────
t('全部正常时放行', () => {
  const r = mkEnv({ whoami: OK_AUTH, view: FREE, tag: { ok: false, status: 1, out: '' } }).go();
  if (!r.ok) throw new Error(`不该拦，却拦了：${r.blockers.map((b) => b.id).join(', ')}`);
  if (!r.notes.some((n) => n.includes('virtualman'))) throw new Error('notes 里应当有 npm 身份');
  return `放行；notes=${r.notes.length} 条`;
});

// ── 凭证 ────────────────────────────────────────────────────────────────
t('★ 只有 registry 配置的 ~/.npmrc（文件在、token 不在）也必须拦下', () => {
  // 这正是旧实现的漏洞：它只看 `.npmrc` 存不存在，于是这里会被放行。
  const r = mkEnv({
    hasNpmrc: true,
    ignore: { ok: true, status: 0, out: '.npmrc\n' },
    whoami: { ok: false, status: 1, out: 'npm error code ENEEDAUTH\nnpm error need auth' },
    tag: { ok: false, status: 1, out: '' },
  }).go();
  if (r.ok) throw new Error('文件存在≠凭证可用，必须拦下');
  if (!r.blockers.some((b) => b.id === 'auth')) throw new Error('应当给出 auth 拦截');
  return '已拦下（auth）';
});

t('whoami 退出码 0 但输出为空 → 仍视为凭证不可用', () => {
  const r = mkEnv({ whoami: { ok: true, status: 0, out: '   \n' }, tag: { ok: false, status: 1, out: '' } }).go();
  if (r.ok) throw new Error('空身份不算登录成功');
  if (!r.blockers.some((b) => b.id === 'auth')) throw new Error('应当给出 auth 拦截');
  return '已拦下（auth）';
});

// ── 目标版本是否已被占用 ────────────────────────────────────────────────
t('registry 已有目标版本 → 拦下（否则 publish 才报，而 tag 已推）', () => {
  const r = mkEnv({
    whoami: OK_AUTH,
    view: { ok: true, status: 0, out: `${NEXT}\n` },
    tag: { ok: false, status: 1, out: '' },
  }).go();
  if (r.ok) throw new Error('版本已被占用必须拦下');
  if (!r.blockers.some((b) => b.id === 'version-taken')) throw new Error('应当给出 version-taken');
  return '已拦下（version-taken）';
});

t('registry 查询返回 E404 → 说明版本未被占用，放行', () => {
  const r = mkEnv({ whoami: OK_AUTH, view: FREE, tag: { ok: false, status: 1, out: '' } }).go();
  if (!r.ok) throw new Error(`不该拦：${r.blockers.map((b) => b.id).join(', ')}`);
  if (!r.notes.some((n) => n.includes('尚无'))) throw new Error('应当说明「registry 上尚无该版本」');
  return '放行';
});

t('registry 查询因网络失败 → 说不清时不拦（交给 publish 自己报错）', () => {
  const r = mkEnv({
    whoami: OK_AUTH,
    view: { ok: false, status: 1, out: 'npm error code ETIMEDOUT' },
    tag: { ok: false, status: 1, out: '' },
  }).go();
  if (!r.ok) throw new Error('网络不可达不该当成版本冲突');
  if (!r.notes.some((n) => n.includes('无法确认'))) throw new Error('应当如实说「无法确认」');
  return '放行（并如实说明无法确认）';
});

t('未登录时不去查 registry（免得把「没登录」误报成「版本冲突」）', () => {
  const env = mkEnv({ whoami: { ok: false, status: 1, out: 'need auth' }, tag: { ok: false, status: 1, out: '' } });
  env.go();
  if (env.calls.some((c) => c.startsWith('npm view'))) throw new Error('未登录时不该查 registry');
  return '未查 registry';
});

// ── 本地 tag ────────────────────────────────────────────────────────────
t('本地已有同名 tag → 拦下（否则 git tag 会在改完文件之后才失败）', () => {
  const r = mkEnv({
    whoami: OK_AUTH,
    view: FREE,
    tag: { ok: true, status: 0, out: 'abcdef1234567890\n' },
  }).go();
  if (r.ok) throw new Error('tag 已存在必须拦下');
  if (!r.blockers.some((b) => b.id === 'tag-exists')) throw new Error('应当给出 tag-exists');
  return '已拦下（tag-exists）';
});

// ── .npmrc 保护 ─────────────────────────────────────────────────────────
t('.npmrc 存在且未被 gitignore 忽略 → 拦下（token 明文）', () => {
  const r = mkEnv({
    hasNpmrc: true,
    whoami: OK_AUTH,
    view: FREE,
    tag: { ok: false, status: 1, out: '' },
    ignore: { ok: false, status: 1, out: '' },
  }).go();
  if (r.ok) throw new Error('.npmrc 未被忽略必须拦下');
  if (!r.blockers.some((b) => b.id === 'npmrc-tracked')) throw new Error('应当给出 npmrc-tracked');
  return '已拦下（npmrc-tracked）';
});

// ── 组合 ────────────────────────────────────────────────────────────────
t('多个问题同时存在时全部列出（不能只报第一个）', () => {
  const r = mkEnv({
    hasNpmrc: true,
    whoami: { ok: false, status: 1, out: 'need auth' },
    tag: { ok: true, status: 0, out: 'deadbeef\n' },
    ignore: { ok: false, status: 1, out: '' },
  }).go();
  const ids = r.blockers.map((b) => b.id);
  for (const want of ['auth', 'tag-exists', 'npmrc-tracked']) {
    if (!ids.includes(want)) throw new Error(`漏报了 ${want}（实际：${ids.join(', ')}）`);
  }
  return `列出 ${ids.length} 条`;
});

t('每条拦截都给出「用户要做的那个动作」', () => {
  const envs = [
    { whoami: { ok: false, status: 1, out: 'need auth' }, tag: { ok: false, status: 1, out: '' } },
    { whoami: OK_AUTH, view: { ok: true, status: 0, out: `${NEXT}\n` }, tag: { ok: false, status: 1, out: '' } },
    { whoami: OK_AUTH, view: FREE, tag: { ok: true, status: 0, out: 'x' } },
    { hasNpmrc: true, whoami: OK_AUTH, view: FREE, tag: { ok: false, status: 1, out: '' }, ignore: { ok: false, status: 1, out: '' } },
  ];
  for (const e of envs) {
    const r = mkEnv(e).go();
    for (const b of r.blockers) {
      if (!b.action || !b.action.trim()) throw new Error(`${b.id} 没有给出 action`);
      if (!b.title || !b.detail) throw new Error(`${b.id} 的 title/detail 不完整`);
    }
  }
  return '四条拦截都带 action';
});

t('inspectRegistryHit：E404 与网络错误必须区分开', () => {
  const free = inspectRegistryHit({ ok: false, status: 1, out: 'npm error 404 Not Found - GET ...' });
  const net = inspectRegistryHit({ ok: false, status: 1, out: 'npm error code ETIMEDOUT' });
  const taken = inspectRegistryHit({ ok: true, status: 0, out: '1.2.1\n' });
  if (free.state !== 'free') throw new Error(`E404 应为 free，实际 ${free.state}`);
  if (net.state !== 'unknown') throw new Error(`超时应为 unknown，实际 ${net.state}`);
  if (taken.state !== 'taken') throw new Error(`查到版本应为 taken，实际 ${taken.state}`);
  return 'free / unknown / taken 三态正确';
});

// ── 结构锁：preflight 必须在任何写入之前 ────────────────────────────────
const rel = fs.readFileSync(path.join(root, 'scripts', 'release.js'), 'utf8');

t('release.js 确实调用了 preflight', () => {
  if (!/require\('\.\/release-preflight'\)/.test(rel)) throw new Error('没有 require release-preflight');
  if (!rel.includes('preflight({')) throw new Error('没有调用 preflight');
  return '已调用';
});

t('★ preflight 的位置早于第一个写入（挪到 bump 之后 = 没查）', () => {
  const at = rel.indexOf('preflight({');
  const write = rel.indexOf('fs.writeFileSync(pkgPath');
  const gitAdd = rel.indexOf("['add', '-A']");
  if (at < 0) throw new Error('找不到 preflight 调用');
  if (write < 0) throw new Error('找不到版本号写入点');
  if (gitAdd < 0) throw new Error('找不到 git add');
  if (!(at < write)) throw new Error('preflight 出现在 package.json 写入之后');
  if (!(at < gitAdd)) throw new Error('preflight 出现在 git add 之后');
  return `位置 ${at} < 写入 ${write} < git add ${gitAdd}`;
});

t('release.js 里不再有「只看 .npmrc 文件存在」的旧判据', () => {
  if (rel.includes('hasUserNpmrc')) throw new Error('旧的 hasUserNpmrc 判据还在');
  if (/existsSync\(npmrcPath\)/.test(rel)) throw new Error('仍在用 existsSync(npmrcPath) 判断凭证');
  return '旧判据已移除';
});

// ── 跑 ──────────────────────────────────────────────────────────────────
console.log('\n[vui-uniapp] 发布前置检查自检');
let bad = 0;
for (const c of CASES) {
  try {
    const note = c.fn();
    console.log(`  ok  ${c.name}${note ? `  —— ${note}` : ''}`);
  } catch (e) {
    bad += 1;
    console.log(`  x   ${c.name}`);
    console.log(`        ${e.message}`);
  }
}

if (bad) {
  console.log(`\n  x ${bad} / ${CASES.length} 条未通过`);
  console.log('    改法：修正 scripts/release-preflight.js 或其调用位置（scripts/release.js 第 0 步）。\n');
  console.log('发布前置检查自检未通过。\n');
  process.exit(1);
}
console.log(`\n  ${CASES.length} 条全部通过（含 4 类拦截 + 3 条结构锁）`);
console.log('\n发布前置检查自检通过。\n');
