#!/usr/bin/env node
'use strict';
/**
 * check-h5.js —— **把库真的跑起来**：构建 H5 → 起服务 → headless Chrome 打开每个页面 → 断言 DOM
 *
 * 为什么需要它
 * ------------
 * AGENTS.md 第八节此前自己写着「至今**没有任何一轮**做过 H5 / 真机实跑」。也就是说
 * `check:all` 的十五条全部是**静态**校验：语法、主题变量、产物一致性、tarball 清单、
 * 组件枚举 —— 它们可以全绿，而组件**渲染出来的东西是错的，甚至根本没渲染**。
 * 第一节又承诺「支持 iOS / Android / H5 / 各家小程序」，这条承诺此前**没有任何东西在扛**。
 *
 * 它第一次跑就抓到一个：`vui-tag` 的根节点是两行并列的
 * `v-if="os == 'android'"` / `v-if="os == 'ios'"`，而 `os` 取自
 * `uni.getSystemInfoSync().osName` —— H5 桌面上是 `windows`、macOS 上是 `macOS`，
 * 两个小写串都不匹配 → **整个标签在所有页面上什么都不渲染**，而且**没有任何报错**。
 * 同时抓出 5 处 `console.log` 进了生产包（vui-tag 1 处、vui-region-picker 4 处）。
 *
 * 判据（全部从源码 / DOM 现算，不手抄清单）
 * ----------------------------------------
 *   ① 产物完整性：`index.html` 引用的**每个**本地资源都真的在磁盘上；
 *   ② 页面真的挂载：DOM 里出现 `<uni-page`；
 *   ③ **痕迹**：页面用到的每个 `vui-*` 组件，必须把自己**模板**里的那个静态类名片段
 *      渲染进 DOM —— 组件没挂上 / 渲染成空，这条就红；
 *   ④ console 不许有未登记的日志 —— 生产包里带调试输出，或运行时报错，都在这条。
 *
 * 「懒渲染」必须登记，且登记表两向
 * --------------------------------
 * 根节点带 `v-if="visible"` 的弹层（modal / drawer / message / notification）、要滚动才
 * 出现的 backtop、以及落在 `v-for` 空列表里的 chat 组件，**按设计**首屏无痕迹。它们登记在
 * `LAZY_RENDER`，理由逐条对着源码写；反方向也锁着：**登记了却渲染出痕迹** → 报「请把登记
 * 删掉」。这样这张表不会烂成一张「什么都放行」的白名单（AGENTS.md 里已经写死过这条教训：
 * 一个会误报的检查最后一定会被加白名单加到失效）。
 *
 * 为什么不在 `check:all` 里
 * -------------------------
 * 它需要本机的 HBuilderX（自带 node + vite）与 Chrome —— 而 `check:all` 必须能在**没装**的
 * 机器上跑（AGENTS.md 第八节）。所以它是**离链**入口，登记在 `check-all.js` 的 `OFF_CHAIN`。
 * 但「离链」不等于「可以静默不跑」：工具链缺失时本脚本**打印缺什么并以非 0 退出**，
 * 绝不会打印「通过」。`check-all.js` 会反过来核对这个入口确实还在、形态合法。
 *
 * 用法：npm run check:h5
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync, spawn } = require('child_process');

const root = path.resolve(__dirname, '..');

/** HBuilderX 候选位置（env 优先）。用自带 node + vite，不需要任何 npm 安装。 */
const HX_CANDIDATES = [
  process.env.HBUILDERX_HOME,
  'D:\\Program Files\\HBuilderX',
  'C:\\Program Files\\HBuilderX',
  'D:\\HBuilderX',
  'E:\\HBuilderX',
].filter(Boolean);

/** Chrome 候选位置（env 优先）。 */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')
    : null,
].filter(Boolean);

/**
 * 按设计首屏无痕迹的组件。`reason` 必须对着源码写（根元素上的 `v-if`、或宿主页的
 * `v-for` 空列表），不许写「大概是因为懒加载」。
 */
const LAZY_RENDER = {
  'vui-backtop': '根元素 `v-if="visible"`，未滚过 `visibility-height` 时不渲染',
  'vui-modal': '根元素 `v-if="visible"`；宿主页 `v-model="modalVisible"` 初值 false',
  'vui-drawer': '根元素 `v-if="visible"`；宿主页 `v-model="drawerVisible"` 初值 false',
  'vui-message': '根元素 `v-if="visible"`；靠 ref 调 `show()`，未触发时无内容',
  'vui-notification': '根元素 `v-if="visible"`；靠 ref 调 `show()`，未触发时无内容',
  'vui-chat-bubble':
    '模板无 v-if，但宿主页把它放在 `v-for="(msg, index) in messages"` 里，`messages` 初值为空',
  'vui-feedback': '模板无 v-if，同上 —— 位于空 `messages` 的 v-for 内',
  'vui-thinking': '模板无 v-if，同上 —— 位于空 `messages` 的 v-for 内',
};

/**
 * 模板里连一个静态 class 片段都没有的组件：无法用「痕迹」判定，改用别的可观测物。
 * 同样两向：登记项必须**确实**没有 class 片段。
 */
const NO_CLASS_TRACE = {
  'vui-switch': {
    observe: 'uni-switch',
    why: '模板只有一个 uni 原生 `<switch>`，全组件没有任何 class 字面量（连绑定里也没有）',
  },
};

/**
 * 允许出现在 console 里的日志。判据是「这句话不是缺陷」。
 * 生产包里出现未登记的 `console.xxx` 一律算缺陷（它会刷用户的控制台）。
 */
const CONSOLE_ALLOW = [
  { re: /^"App (Launch|Show|Hide)"$/, why: 'App.vue 的生命周期日志，属演示页代码、不进 npm 包' },
  {
    re: /^"method 'uni\.getRecorderManager' not supported"$/,
    why:
      'uni-app 框架在 H5 上自己的提示：H5 没有录音能力。vui-voice-input 已对它降级' +
      '（initRecorder 里 try/catch 后 recorder=null，按下时 emit 一次 error），不是本组的缺陷',
  },
];

// ─────────────────────────── 工具链探测 ───────────────────────────

function probeHBuilderX() {
  for (const dir of HX_CANDIDATES) {
    const node = path.join(dir, 'plugins', 'node', 'node.exe');
    const cli = path.join(dir, 'plugins', 'uniapp-cli-vite');
    const vite = path.join(cli, 'node_modules', 'vite', 'bin', 'vite.js');
    const cfg = path.join(cli, 'vite.config.js');
    if (fs.existsSync(node) && fs.existsSync(vite) && fs.existsSync(cfg)) {
      return { ok: true, dir, node, cli, vite };
    }
  }
  return {
    ok: false,
    why:
      `HBuilderX 没找到（找过：${HX_CANDIDATES.join(' / ')}）。` +
      '需要它自带的 node + vite 才能构建 H5 —— 可用 HBUILDERX_HOME 指定目录。',
  };
}

function probeChrome() {
  for (const exe of CHROME_CANDIDATES) {
    if (fs.existsSync(exe)) return { ok: true, exe };
  }
  return {
    ok: false,
    why:
      `Chrome 没找到（找过：${CHROME_CANDIDATES.join(' / ')}）。` +
      '渲染断言必须在真浏览器里做 —— 可用 CHROME_PATH 指定可执行文件。',
  };
}

// ─────────────────────────── 源码侧的真值 ───────────────────────────

const stripHtmlComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const stripJsonComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function readPageList() {
  const data = JSON.parse(stripJsonComments(fs.readFileSync(path.join(root, 'pages.json'), 'utf8')));
  return (data.pages || []).map((x) => x.path).filter(Boolean);
}

const pageSource = (page) =>
  fs.readFileSync(path.join(root, page.split('/').join(path.sep) + '.vue'), 'utf8');

/** 页面模板里用到的 `vui-*` 组件（剥掉注释再扫）。 */
function componentsUsedBy(page) {
  const hits = stripHtmlComments(pageSource(page)).match(/<(vui-[a-z0-9-]+)[\s/>]/g) || [];
  return [...new Set(hits.map((h) => h.slice(1).replace(/[\s/>]+$/, '')))].sort();
}

function componentTemplate(comp) {
  const p = path.join(root, 'uni_modules', comp, 'components', comp, comp + '.vue');
  const m = /<template>([\s\S]*)<\/template>/.exec(fs.readFileSync(p, 'utf8'));
  return stripHtmlComments(m ? m[1] : '');
}

/**
 * 该组件在模板里留下的**第一个静态类名片段** —— 就是「痕迹」。
 *
 * 两处都要收：`class="vui-tag"` 是字面量，而 `:class="'vui-button--' + type"` 里的
 * `vui-button--` 同样是静态的（`vui-button` 就靠它判定，它的 `class` 全是绑定）。
 * 返回 `null` 表示模板里一个都没有 → 必须登记进 `NO_CLASS_TRACE`。
 */
function classTrace(comp) {
  const t = componentTemplate(comp);
  const frags = [];
  const push = (s) => {
    for (const tok of String(s).split(/\s+/)) if (/^[A-Za-z][\w-]*$/.test(tok)) frags.push(tok);
  };
  for (const m of t.matchAll(/(?<!:)class="([^"]*)"/g)) push(m[1]);
  for (const m of t.matchAll(/:class="([^"]*)"/g)) {
    for (const lit of m[1].matchAll(/'([^']*)'|"([^"]*)"/g)) push(lit[1] || lit[2] || '');
  }
  return frags.length ? frags[0] : null;
}

/**
 * 痕迹是否真的渲染进了 DOM。
 *
 * ⚠ 以 `-` 结尾的片段（`:class="'vui-button--' + type"` 提取出来的就是 `vui-button--`）
 * **不能再要求词尾边界**：真实 DOM 里它后面接着 `default` / `primary`，加了 `(?![\w-])`
 * 会把「渲染得好好的」判成「没渲染」—— 这条假红是本脚本第一次真跑时抓出来的。
 */
function traceInDom(trace, dom) {
  const esc = trace.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w-])${esc}${trace.endsWith('-') ? '' : '(?![\\w-])'}`).test(dom);
}

// ─────────────────────────── 构建 ───────────────────────────

function copyTree(src, dst, skip) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const a = path.join(src, e.name);
    const b = path.join(dst, e.name);
    if (e.isDirectory()) copyTree(a, b, skip);
    else if (e.isFile()) fs.copyFileSync(a, b);
  }
}

function patchManifest(srcDir) {
  const p = path.join(srcDir, 'manifest.json');
  let s = fs.readFileSync(p, 'utf8');
  if (/"h5"\s*:/.test(s)) return;
  const anchor = '"vueVersion" : "3"';
  if (s.split(anchor).length - 1 !== 1) {
    throw new Error(`manifest.json 里找不到唯一的 ${anchor} 锚点，无法补 h5 段`);
  }
  s = s.replace(
    anchor,
    '"h5" : {\n        "title" : "VUI 组件演示",\n        "router" : {\n            "base" : "/"\n        }\n    },\n    ' +
      anchor
  );
  fs.writeFileSync(p, s);
}

function build(hx, srcDir, outDir, distDir) {
  const env = {
    ...process.env,
    UNI_PLATFORM: 'h5',
    UNI_INPUT_DIR: srcDir,
    UNI_OUTPUT_DIR: outDir,
    UNI_CLI_CONTEXT: hx.cli,
    UNI_HBUILDERX_PLUGINS: path.join(hx.dir, 'plugins'),
    NODE_ENV: 'production',
  };
  const r = spawnSync(hx.node, [hx.vite, 'build', '--mode', 'production'], {
    cwd: hx.cli,
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) {
    return { ok: false, detail: `${r.stdout || ''}${r.stderr || ''}`.slice(-2000) };
  }
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    return { ok: false, detail: `构建退出码 0，但 ${distDir} 下没有 index.html —— 产物没落盘` };
  }
  return { ok: true };
}

/** 合并产物：bundle（index.html + assets）落在 `<副本>/dist`，`static/` 落在 `UNI_OUTPUT_DIR`。 */
function mergeArtifacts(distDir, outDir, serveDir) {
  copyTree(distDir, serveDir, new Set());
  const st = path.join(outDir, 'static');
  if (fs.existsSync(st)) copyTree(st, path.join(serveDir, 'static'), new Set());
  fs.writeFileSync(path.join(serveDir, '.nojekyll'), '');
}

/** ① 产物完整性：index.html 引用的本地资源必须在磁盘上（否则线上就是 404）。 */
function assetIntegrity(serveDir) {
  const html = fs.readFileSync(path.join(serveDir, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((u) => u && !/^(https?:)?\/\//.test(u) && !u.startsWith('data:') && !u.startsWith('#'));
  const missing = refs.filter(
    (u) => !fs.existsSync(path.join(serveDir, u.replace(/^\//, '').split('?')[0].split('/').join(path.sep)))
  );
  return { refs, missing };
}

// ─────────────────────────── 本地服务 + 浏览器 ───────────────────────────

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** 起一个只读静态服务；**必须真的在监听之后**才返回端口。 */
function serve(serveDir) {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let file = path.join(serveDir, url.split('/').join(path.sep));
    if (!file.startsWith(serveDir)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404).end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const CONSOLE_RE = /INFO:CONSOLE:\d+\]\s*([\s\S]*?),\s*source:/g;

/**
 * 打开一个页面，取渲染后的 DOM 与 console。
 *
 * ⚠ **必须用异步的 `spawn`，不能用 `spawnSync`**：静态服务就跑在本进程里，而
 * `spawnSync` 会把事件循环**整个阻塞住** —— Chrome 请求 `assets/index-*.js` 时没人应答，
 * 页面永远到不了「加载完成」，`--virtual-time-budget` 也就不再往前走，于是**死锁**
 * （实测挂满 20 分钟没有任何输出，且临时目录里构建产物明明已经齐了）。
 * 先前手工试验没撞上，是因为服务是 `python -m http.server` 单独一个进程。
 */
function renderPage(chrome, profDir, url) {
  return new Promise((resolve, reject) => {
    const child = spawn(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      '--enable-logging=stderr',
      '--log-level=0',
      `--user-data-dir=${profDir}`,
      '--virtual-time-budget=25000',
      '--dump-dom',
      url,
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    child.on('error', reject);
    child.on('close', () => {
      const logs = [];
      for (const m of stderr.matchAll(CONSOLE_RE)) logs.push(m[1].trim());
      resolve({ dom: stdout, logs });
    });
  });
}

// ─────────────────────────── 主流程 ───────────────────────────

async function main() {
  const errors = [];
  const notes = [];

  const hx = probeHBuilderX();
  const chrome = probeChrome();
  const problems = [hx, chrome].filter((x) => !x.ok).map((x) => x.why);
  if (problems.length) {
    console.log('\n[vui-uniapp] H5 实跑：**未验证** —— 本机缺依赖，这条检查没有跑。');
    problems.forEach((p) => console.log(`  x ${p}`));
    console.log('\n  这不是「通过」。装齐工具链后重跑 `npm run check:h5`。\n');
    process.exit(1);
  }

  // 有中文 / 空格的临时目录会让 Chrome 的原生参数解析出问题 —— 用之前先确认是 ASCII。
  if (!/^[\x20-\x7E]+$/.test(os.tmpdir())) {
    console.log(`\n[vui-uniapp] H5 实跑：**未验证** —— 临时目录含非 ASCII 字符（${os.tmpdir()}）。`);
    console.log('  Chrome 的 --user-data-dir 走原生参数解析，非 ASCII 路径会静默失败。\n');
    process.exit(1);
  }

  const work = path.join(os.tmpdir(), `vui-check-h5-${process.pid}`);
  const srcDir = path.join(work, 'src');
  const distDir = path.join(srcDir, 'dist');
  const outDir = path.join(work, 'out');
  const serveDir = path.join(work, 'serve');
  const profBase = path.join(work, 'prof');

  let server = null;
  try {
    const pages = readPageList();
    if (pages.length < 4) {
      console.log(`\n[vui-uniapp] H5 实跑：pages.json 只解析出 ${pages.length} 个页面 —— 解析面塌了，这次的「全绿」不可信。\n`);
      process.exit(1);
    }

    console.log('\n[vui-uniapp] H5 实跑（真构建 + 真浏览器）');
    console.log(`  HBuilderX: ${hx.dir}`);
    console.log(`  Chrome   : ${chrome.exe}`);
    console.log(`  页面     : ${pages.length} 个 → ${pages.join('、')}\n`);

    copyTree(root, srcDir, new Set(['.git', 'node_modules', 'unpackage', '.vscode', 'dist']));
    const repoNm = path.join(root, 'node_modules');
    if (!fs.existsSync(path.join(repoNm, 'sass'))) {
      throw new Error('仓库里没有 node_modules/sass —— vite 从项目根解析 sass，没有它构建不起来（先 npm i）');
    }
    copyTree(repoNm, path.join(srcDir, 'node_modules'), new Set());
    patchManifest(srcDir);

    console.log('  · 构建中 …');
    const b = build(hx, srcDir, outDir, distDir);
    if (!b.ok) {
      errors.push(`H5 构建失败：\n${b.detail}`);
      throw new Error('build-failed');
    }
    mergeArtifacts(distDir, outDir, serveDir);

    const integ = assetIntegrity(serveDir);
    if (integ.refs.length < 1) errors.push('index.html 里一个本地资源引用都没解析出来 —— 解析面塌了');
    if (integ.missing.length) {
      errors.push(`index.html 引用了不存在的资源（线上就是 404）：${integ.missing.join('、')}`);
    }
    notes.push(`index.html 引用的 ${integ.refs.length} 个本地资源全部落盘`);

    const started = await serve(serveDir);
    server = started.server;

    for (const page of pages) {
      const r = await renderPage(
        chrome.exe,
        path.join(profBase, page.split('/').pop()),
        `http://127.0.0.1:${started.port}/#/${page}`
      );
      console.log(`  · ${page}：DOM ${r.dom.length} 字节，console ${r.logs.length} 条`);

      if (!r.dom.includes('<uni-page')) {
        errors.push(`${page} 渲染后 DOM 里没有 <uni-page —— 页面没挂载起来（白屏）`);
        continue;
      }

      const used = componentsUsedBy(page);
      const lazyHit = [];
      for (const comp of used) {
        const trace = classTrace(comp);
        const observed = trace
          ? traceInDom(trace, r.dom)
          : NO_CLASS_TRACE[comp]
            ? r.dom.includes(NO_CLASS_TRACE[comp].observe)
            : false;

        if (observed) {
          if (LAZY_RENDER[comp]) lazyHit.push(comp);
          continue;
        }
        if (LAZY_RENDER[comp]) continue;
        if (!trace && !NO_CLASS_TRACE[comp]) {
          errors.push(`${page} 用到 <${comp}>，但它的模板里没有任何可判定的类名 —— 请登记进 NO_CLASS_TRACE`);
        } else if (!trace) {
          errors.push(`${page} 用到 <${comp}>，但 DOM 里既没有类名痕迹、也没有 ${NO_CLASS_TRACE[comp].observe}`);
        } else {
          errors.push(
            `${page} 用到 <${comp}>，DOM 里却找不到它的痕迹 \`${trace}\` —— 组件没渲染出来` +
              '（页面上凭空少一块，且不会有任何报错）。它确实是按设计懒渲染的话，请登记进 LAZY_RENDER 并写清理由'
          );
        }
      }
      if (lazyHit.length) {
        errors.push(`${page}：这些组件已经真的渲染出痕迹了，请把 LAZY_RENDER 里的登记删掉 —— ${lazyHit.join('、')}`);
      }

      for (const line of r.logs) {
        if (CONSOLE_ALLOW.some((a) => a.re.test(line))) continue;
        errors.push(`${page} 的 console 有未登记的日志（生产包里带调试输出 / 运行时出错）：${line}`);
      }
    }

    // 登记表两向：表里的组件必须仍被某个演示页用到，且理由描述的现象仍成立
    const allUsed = new Set(pages.flatMap((p) => componentsUsedBy(p)));
    for (const comp of Object.keys(LAZY_RENDER)) {
      if (!allUsed.has(comp)) errors.push(`LAZY_RENDER 里的 ${comp} 已经没有任何演示页在用了 —— 请把登记删掉`);
    }
    for (const comp of Object.keys(NO_CLASS_TRACE)) {
      if (!allUsed.has(comp)) errors.push(`NO_CLASS_TRACE 里的 ${comp} 已经没有任何演示页在用了 —— 请把登记删掉`);
      const t = classTrace(comp);
      if (t !== null) errors.push(`NO_CLASS_TRACE 里的 ${comp} 已经有静态类名（\`${t}\`）了 —— 请把登记删掉`);
    }
  } catch (e) {
    if (e.message !== 'build-failed') errors.push(`执行异常（按失败折算）：${e.message}`);
  } finally {
    if (server) server.close();
    for (let i = 0; i < 5; i += 1) {
      try {
        fs.rmSync(work, { recursive: true, force: true });
        break;
      } catch (e) {
        if (i === 4) console.log(`  ! 临时目录没删干净（${e.code || e.message}）：${work}`);
      }
    }
  }

  console.log('\n[vui-uniapp] H5 实跑结果');
  notes.forEach((n) => console.log(`  · ${n}`));
  if (errors.length) {
    console.log('');
    [...new Set(errors)].forEach((e) => console.log(`  x ${e}`));
    console.log(`\n${errors.length} 处未通过。\n`);
    process.exit(1);
  }
  console.log('\n  全部页面都在真浏览器里渲染出来了，且每个被用到的组件都留下了自己的痕迹。\n');
}

main().catch((e) => {
  console.log(`\n[vui-uniapp] H5 实跑：执行异常（按失败折算）—— ${e && e.stack ? e.stack : e}\n`);
  process.exit(1);
});
