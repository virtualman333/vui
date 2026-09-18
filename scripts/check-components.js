#!/usr/bin/env node
/**
 * 组件枚举与结构检查的自检（零依赖，Node 原生）
 *
 * 为什么需要它
 * ------------
 * `scripts/lib/components.js` 收敛了 6 处重复的组件枚举，其中最关键的一条是
 * **枚举不得静默丢弃结构坏掉的组件**。这条不变量无法靠「读一遍代码」保住：
 * 旧实现（`if (fs.existsSync(vue)) out.push(...)`）读起来完全正常，直到你真的放一个
 * 名字写错的 `.vue` 进去，才会发现 `prepublish-check` 打印的是「校验通过，可以发布」、
 * 而同一段输出里两个组件数（48 / 49）互相矛盾。
 *
 * 因此这里用**子进程真跑一遍**：在仓库副本里注入一个结构坏掉的组件，
 * `prepublish-check` 必须非 0 退出，且必须点名那个组件。
 * 同时锁住「枚举只有一份」这条结构约束 —— 被删掉的闸门不会让任何行为断言变红。
 *
 * 用例：
 *   1. 行为锁 · 目录在、同名 .vue 不在（`.vue` 名字写错）→ 必须拦下
 *   2. 行为锁 · 整个 components/ 目录缺失 → 必须拦下
 *   3. 反向对照 · 未注入时副本里的 prepublish-check 必须是绿的（否则上两条是假红）
 *   4. 不变量 · 组件数 == uni_modules 下的 .vue 数
 *   5. 结构锁 · scripts/ 下只有 lib/components.js 会去 readdir 'uni_modules'
 *   6. 结构锁 · 临时副本的删除只有一条出口（`rmTemp`），不许再出现裸删除
 *   7. 行为锁 · 清理函数对「删不掉」的目录不得抛错（见下面的 rmTemp）
 *
 * ⚠ 第 6/7 条不是洁癖，是一条**假红**换来的：Windows 上删临时副本会偶发
 * `EBUSY: resource busy or locked`（副本里刚跑过子进程，句柄还没释放，或被索引器按住）。
 * 实测同一份代码连跑三次：一次红、两次绿。那一下正好抛在 `finally` 里，被外层 catch
 * 收成「自检执行失败」→ 整条 `check:all` 判红，且报的是跟组件结构毫无关系的一句话。
 * **假红的代价比不删目录大得多**：人一旦开始怀疑这条检查，它守的东西就全都没人管了。
 *
 * 用法：
 *   node scripts/check-components.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { listComponents, componentIds, vueFiles } = require('./lib/components');

const root = path.resolve(__dirname, '..');
let failed = false;

function ok(name, note) {
  console.log(`  ok  ${name}${note ? `  —— ${note}` : ''}`);
}
function bad(name, note) {
  failed = true;
  console.log(`  x   ${name}${note ? `  —— ${note}` : ''}`);
}

/** 复制仓库到临时目录（跳过 node_modules / .git / dist —— prepublish-check 零依赖） */
function copyRepo() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vui-components-'));
  const skip = new Set(['node_modules', '.git', 'dist', '.hbuilderx']);
  fs.cpSync(root, tmp, {
    recursive: true,
    filter: (src) => !src.split(path.sep).some((seg) => skip.has(seg)),
  });
  return tmp;
}

const sleep = (ms) => {
  // Node 主线程允许 Atomics.wait；拿不到 SharedArrayBuffer 时退化成忙等
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      /* busy wait */
    }
  }
};

/**
 * 删临时副本 —— **删不掉不许把校验判红**。
 *
 * 为什么要重试而不是直接删：Windows 上 `fs.rmSync` 对刚跑过子进程的目录会偶发
 * `EBUSY / EPERM`（句柄释放慢一拍、或被杀毒/索引器按住）。这是环境抖动，
 * 不是包里有什么问题；而它抛的位置恰好是 `finally`，会把一个本来全绿的校验判成红。
 * 所以：退避重试几次，最终仍删不掉就**打印一句警告并留着**，结论照常往下走。
 * 返回值只用于测试观察，不参与判定。
 */
function rmTemp(dir) {
  if (!dir) return true;
  const waits = [0, 50, 200, 600];
  for (let i = 0; i < waits.length; i++) {
    if (waits[i]) sleep(waits[i]);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    } catch (e) {
      if (i === waits.length - 1) {
        console.log(`  !  临时副本删除失败（${e.code || e.message}），先留着：${dir}`);
        console.log('     这不影响校验结论 —— 系统临时目录里的一个残留副本不是包里的缺陷。');
        return false;
      }
    }
  }
  return false;
}

function runPrepublish(dir) {
  const r = spawnSync(process.execPath, [path.join('scripts', 'prepublish-check.js')], {
    cwd: dir,
    encoding: 'utf8',
  });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

/** 在副本里造一个结构坏掉的组件；kind = 'no-vue'（名字写错）| 'no-dir'（缺 components/） */
function injectBroken(dir, kind) {
  const id = 'vui-probe';
  fs.mkdirSync(path.join(dir, 'uni_modules', id), { recursive: true });
  fs.writeFileSync(path.join(dir, 'uni_modules', id, 'package.json'), '{"id":"vui-probe"}\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'uni_modules', id, 'readme.md'), '# probe\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'uni_modules', id, 'changelog.md'), '# 1.0.0\n', 'utf8');
  if (kind === 'no-dir') return id;
  // 目录在、但入口文件名不对（easycom 找不到它）
  const compDir = path.join(dir, 'uni_modules', id, 'components', id);
  fs.mkdirSync(compDir, { recursive: true });
  fs.writeFileSync(
    path.join(compDir, 'index.vue'),
    '<template><view /></template>\n<script>export default { name: "vui-probe" };</script>\n',
    'utf8'
  );
  return id;
}

// ── 4. 不变量：组件数 == .vue 数 ──────────────────────────────────────────
const comps = listComponents();
const vues = vueFiles();
if (comps.length === vues.length && comps.length > 0) {
  ok('组件数与 uni_modules 下的 .vue 数一致', `${comps.length} = ${vues.length}`);
} else {
  bad('组件数与 .vue 数不一致', `组件 ${comps.length} 个、.vue ${vues.length} 个`);
}

// ── 5. 结构锁：枚举只有一份 ───────────────────────────────────────────────
const scriptFiles = fs
  .readdirSync(path.join(root, 'scripts'), { recursive: true, encoding: 'utf8' })
  .filter((p) => p.endsWith('.js'))
  .map((p) => path.join(root, 'scripts', p));
const outOfLib = scriptFiles.filter(
  (f) => !f.endsWith(path.join('lib', 'components.js')) && /readdirSync\([^)]*uni_modules/.test(fs.readFileSync(f, 'utf8'))
);
if (!outOfLib.length) {
  ok('组件枚举只有一份（scripts/lib/components.js）', `扫了 ${scriptFiles.length} 个脚本`);
} else {
  bad(
    'scripts/ 下又出现了自己 readdir uni_modules 的实现',
    outOfLib.map((f) => path.relative(root, f).replace(/\\/g, '/')).join(', ')
  );
}

// ── 1/2/3. 行为锁：在副本里注入坏结构，prepublish-check 必须拦下 ─────────
let tmp = null;
try {
  tmp = copyRepo();

  const base = runPrepublish(tmp);
  if (base.code === 0) {
    ok('反向对照 · 未注入时副本里是绿的', '否则下面两条会是假红');
  } else {
    bad('反向对照失败：未注入时副本里 prepublish-check 就不通过', `exit=${base.code}`);
  }
  rmTemp(tmp);
  tmp = null;

  for (const [kind, name] of [
    ['no-vue', '目录在、同名 .vue 不在（.vue 文件名写错）'],
    ['no-dir', '组件缺 components/ 目录'],
  ]) {
    const dir = copyRepo();
    try {
      const id = injectBroken(dir, kind);
      const r = runPrepublish(dir);
      if (r.code !== 0 && r.out.includes(id)) {
        ok(`注入「${name}」被拦下`, `exit=${r.code}，点名了 ${id}`);
      } else if (r.code === 0) {
        bad(`注入「${name}」没被拦下`, 'prepublish-check 照样通过了');
      } else {
        bad(`注入「${name}」被拦下但没点名 ${id}`, '报错必须指出是哪个组件');
      }
    } finally {
      rmTemp(dir);
    }
  }
} catch (e) {
  bad('自检执行失败', e.message);
} finally {
  rmTemp(tmp);
}

// ── 6. 结构锁：临时副本的删除只有一条出口 ─────────────────────────────────
// 「只有一条出口」的判据要能**抓住绕过**：把 rmTemp 里的重试去掉、直接裸删，
// 这条就该红。断言的是调用次数，不是「有没有出现过 rmTemp 这个名字」。
const selfSrc = fs.readFileSync(__filename, 'utf8');
// 判据要求 `(` 后面紧跟标识符 —— 否则本文件里解释这件事的**文字**（消息、注释里的
// 「fs.rmSync( 出现 N 处」）会被自己数进去，变成一条自己触发的假红。
const bareRm = (selfSrc.match(/fs\.rmSync\(\s*[A-Za-z_$]/g) || []).length;
if (bareRm === 1) {
  ok('临时副本的删除只有一条出口（rmTemp）', '裸 fs.rmSync 1 处（就是 rmTemp 自己那次）');
} else {
  bad(
    '出现了绕过 rmTemp 的裸删除',
    `fs.rmSync( 出现 ${bareRm} 处（应为 1）—— 裸删在 Windows 上会偶发 EBUSY，抛在 finally 里就是一次假红`
  );
}

// ── 7. 行为锁：**删不掉**的时候清理函数不许抛错 ───────────────────────────
// 只测「不存在的目录」是假锁：`force: true` 对不存在的目录本来就不抛，
// 把 rmTemp 改回 `throw e` 它照样绿。这里**确定性造一个删不掉的目录**：
// 让一个子进程把它的 cwd 设成那个目录 —— Windows 上这会稳定挡掉 rmdir。
{
  const busyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vui-components-busy-'));
  fs.writeFileSync(path.join(busyDir, 'x.json'), '{}', 'utf8');
  const holder = require('child_process').spawn(
    process.execPath,
    ['-e', 'setTimeout(function(){}, 8000)'],
    { cwd: busyDir, stdio: 'ignore' }
  );
  sleep(300);
  let threw = null;
  let resumed = false;
  try {
    rmTemp(busyDir);
  } catch (e) {
    threw = e;
  }
  if (threw) {
    bad('临时副本删不掉时清理函数抛错了', `${threw.code || threw.message} —— 抛在 finally 里就是把环境抖动变成校验假红`);
  } else {
    ok('临时副本删不掉时只警告、不抛错', '判据是「删不掉也没关系」，不是「删得掉」');
  }
  holder.kill();
  sleep(400);
  try {
    // 句柄释放后应当能自愈；这一步只做观察，不参与判定
    resumed = rmTemp(busyDir) !== false;
  } catch {
    resumed = false;
  }
  if (resumed) ok('子进程退出后残留副本可被删掉', '清理不是一次性的死路');
  else console.log('  !  子进程退出后仍没能删掉残留副本（不影响结论，见上面那条警告）');
}

console.log('');
if (failed) {
  console.log('  组件枚举 / 结构检查自检未通过。\n');
  process.exit(1);
}
console.log('  组件枚举 / 结构检查自检通过。\n');
