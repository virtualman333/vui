#!/usr/bin/env node
/**
 * 发布前置检查（`release.js` 的第 0 步）—— **在任何写入之前**跑完
 *
 * 为什么必须单独成文件、且必须在最前面
 * --------------------------------
 * `release.js` 的顺序是：
 *
 *   校验 → 生成产物 → 改 package.json 版本 → commit + tag → push → npm publish
 *
 * 后四步都是**不可回退**的：tag 一推，这个版本号就被占住了。所以凡是「发布一定会
 * 失败」的原因，都必须在前三步之前查出来，否则会留下 AGENTS.md 第一节明令禁止的
 * 状态 —— **版本已升、tag 已推，包却没发**；而且下次再跑 `release` 会跳到下一个
 * 版本号，等于把失败那次永久留在了历史里。
 *
 * 曾经的实现只检查 `.npmrc` **文件是否存在**：
 *
 *   if (!fs.existsSync('./.npmrc') && !fs.existsSync('~/.npmrc')) fail(...)
 *
 * 「文件存在」与「凭证可用」是两件事。一个只写了 `registry=https://registry.npmmirror.com/`
 * 的 `~/.npmrc`（国内换源时极常见）能通过这道检查，而 `npm whoami` 依然回答未登录。
 * 于是脚本会一路走完 bump → commit → tag → push，最后倒在 `npm publish`。
 *
 * 所以这里改成**实探**，回答的是「这台机器现在到底发得出去吗」：
 *
 *   1. `npm whoami` 必须成功      —— 直接回答「有没有可用凭证」；
 *   2. 目标版本在 registry 上必须还不存在 —— 否则 publish 必报「版本号已存在」，
 *      而那时 tag 已经推上去了；
 *   3. 本地不能已有同名 tag        —— 否则 `git tag` 会在 package.json 已经改完、
 *      产物已经生成之后才失败。
 *   4. `.npmrc` 若存在，必须被 gitignore 忽略 —— token 明文进仓库等同泄露。
 *
 * 为了让这些判据可被离线自检（`scripts/check-release.js` 在 `check:all` 里跑），
 * 本模块是**纯函数 + 依赖注入**：`run` / `fileExists` 都由调用方传进来，
 * 自己不做任何 IO、不读环境、不抛异常。
 */

'use strict';

const path = require('path');

/** 取输出的第一行，去掉换行与多余空白（报错信息往往有好几行） */
function firstLine(text) {
  const s = String(text || '').trim();
  if (!s) return '(无输出)';
  return s.split('\n')[0].trim();
}

/** `npm whoami` 成功但输出为空，也算没回答出「我是谁」 */
function npmIdentity(out) {
  const line = firstLine(out);
  if (!line || /^\(无输出\)$/.test(line)) return null;
  return line;
}

/**
 * 目标版本是否**确定**已存在于 registry。
 * 只有 `npm view <pkg>@<ver>` 成功（说明查到了）才算「已存在」；
 * 失败要再分两种情况：E404 是「确实不存在」，其它（网络不可达 / registry 报错）
 * 是「说不清」—— 说不清时不拦截，交给 publish 自己报错，避免把网络抖动当成版本冲突。
 */
function inspectRegistryHit(res) {
  const out = String(res.out || '');
  if (res.ok) {
    const v = out.trim().split(/\s+/)[0];
    if (/^\d+\.\d+\.\d+/.test(v)) return { state: 'taken', version: v };
    return { state: 'unknown', reason: `npm view 返回了无法识别的结果：${firstLine(out)}` };
  }
  if (/E404|404 Not Found|is not in this registry/i.test(out)) return { state: 'free' };
  return { state: 'unknown', reason: firstLine(out) };
}

/**
 * 跑一遍前置检查。
 *
 * @param {object}   opts
 * @param {string}   opts.nextVersion  即将发布的版本号（不带 v 前缀）
 * @param {string}   opts.pkgName      npm 包名
 * @param {string}   opts.cwd          仓库根目录（用于定位 .npmrc）
 * @param {function} opts.run          (cmd, args, {capture}) => { ok, status, out }
 * @param {function} opts.fileExists   (absPath) => boolean
 * @returns {{ ok: boolean, blockers: object[], notes: string[] }}
 *          `blockers` 里每项形如 `{ id, title, detail, action }`，
 *          `action` 是**用户唯一要做的那个动作**（不给一串可能性）。
 */
function preflight(opts) {
  const { nextVersion, pkgName, cwd, run, fileExists } = opts;
  const blockers = [];
  const notes = [];

  // ── 1. 凭证：实探，不看文件在不在 ─────────────────────────────────────
  const who = run('npm', ['whoami'], { capture: true });
  const identity = who.ok ? npmIdentity(who.out) : null;
  if (!who.ok) {
    blockers.push({
      id: 'auth',
      title: 'npm 未登录 —— 发布一定会失败',
      detail: `\`npm whoami\` 返回非 0：${firstLine(who.out)}`,
      action:
        '在这台机器执行一次 `npm login`（或把带 Bypass 2FA 的 npm token 写进 ~/.npmrc）。' +
        '注意「~/.npmrc 文件存在」不等于「凭证可用」—— 只有 registry 配置的 .npmrc 同样会走到这一步。',
    });
  } else if (!identity) {
    blockers.push({
      id: 'auth',
      title: 'npm whoami 没回答出身份 —— 凭证不可用',
      detail: '`npm whoami` 退出码为 0，但输出为空',
      action: '重新 `npm login`，或检查 token 是否已失效/被撤销',
    });
  } else {
    notes.push(`npm 身份: ${identity}`);
  }

  // ── 2. 目标版本不能被 registry 占用 ───────────────────────────────────
  // 未登录时 registry 查询同样会失败，报「版本冲突」只会误导，故跳过。
  if (who.ok && identity) {
    const view = run('npm', ['view', `${pkgName}@${nextVersion}`, 'version'], { capture: true });
    const hit = inspectRegistryHit(view);
    if (hit.state === 'taken') {
      blockers.push({
        id: 'version-taken',
        title: `registry 上已有 ${pkgName}@${hit.version}`,
        detail:
          '`npm publish` 会报「版本号已存在」；而在那之前 package.json 已被改写、' +
          'tag 已经推送到远端。',
        action: `换一个更高的版本号（\`npm run release -- minor\`，或直接指定具体版本号）`,
      });
    } else if (hit.state === 'free') {
      notes.push(`registry 上尚无 ${pkgName}@${nextVersion}（可以发）`);
    } else {
      notes.push(`无法确认 ${pkgName}@${nextVersion} 是否已被占用：${hit.reason}`);
    }
  }

  // ── 3. 本地 tag 不能已存在 ───────────────────────────────────────────
  const tagRef = `refs/tags/v${nextVersion}`;
  const tag = run('git', ['rev-parse', '-q', '--verify', tagRef], { capture: true });
  if (tag.ok) {
    blockers.push({
      id: 'tag-exists',
      title: `本地已有 tag v${nextVersion}`,
      detail:
        'release.js 第 4 步的 `git tag` 会失败，而那时 package.json 与各组件版本号' +
        '都已经改好、产物也已经重新生成。',
      action: '改用更高的版本号（已推送过的 tag 不要去删）',
    });
  }

  // ── 4. .npmrc 若存在，必须被 gitignore 忽略 ──────────────────────────
  const npmrcPath = path.join(cwd, '.npmrc');
  if (fileExists(npmrcPath)) {
    const gi = run('git', ['check-ignore', '.npmrc'], { capture: true });
    if (!gi.ok) {
      blockers.push({
        id: 'npmrc-tracked',
        title: '.npmrc 未被 .gitignore 忽略',
        detail: '它含 npm token 明文，提交进仓库等同泄露',
        action: '把 `.npmrc` 加进 .gitignore，再确认 `git check-ignore -v .npmrc` 有输出',
      });
    } else {
      notes.push('.npmrc 存在，且已被 .gitignore 忽略');
    }
  }

  return { ok: blockers.length === 0, blockers, notes };
}

module.exports = { preflight, inspectRegistryHit, firstLine };
