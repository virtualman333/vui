# -*- coding: utf-8 -*-
import os
# 统一以项目根目录为工作目录，保证脚本可从任意位置执行
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
"""从各组件实际的 props/emits 定义 + JSDoc 注释生成 npm 包产物：
   - index.js         Vue3 插件入口（全量注册）
   - types/index.d.ts TS 类型声明
"""
import os
import re
import json
import glob

TYPE_MAP = {
    'String': 'string', 'Number': 'number', 'Boolean': 'boolean',
    'Array': 'any[]', 'Object': 'Record<string, any>', 'Function': '(...args: any[]) => any',
}
PASCAL = lambda k: ''.join(w.capitalize() for w in k.split('-'))


def find_matching_brace(s, start):
    """start 指向 '{'，返回配对 '}' 的下标。"""
    depth = 0
    i = start
    in_str = None
    while i < len(s):
        ch = s[i]
        if in_str:
            if ch == '\\':
                i += 2
                continue
            if ch == in_str:
                in_str = None
        elif ch in '\'"`':
            in_str = ch
        elif ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def split_top_level(body):
    """按顶层逗号切分对象体。"""
    parts, depth, buf, in_str = [], 0, '', None
    for i, ch in enumerate(body):
        if in_str:
            buf += ch
            if ch == '\\':
                continue
            if ch == in_str and body[i - 1] != '\\':
                in_str = None
            continue
        if ch in '\'"`':
            in_str = ch
            buf += ch
            continue
        if ch in '{[(':
            depth += 1
        elif ch in '}])':
            depth -= 1
        if ch == ',' and depth == 0:
            parts.append(buf)
            buf = ''
        else:
            buf += ch
    if buf.strip():
        parts.append(buf)
    return parts


def drop_leading_comment_lines(seg):
    """去掉段首那些**整行都是注释**的行，返回剩下的正文。

    为什么必须有这一步
    ------------------
    段是按顶层逗号切的，而「prop 上面单独一行写 `// 说明`」这种写法会让那行注释
    **跟着下一个 prop 一起被切进同一段**。旧实现是 `if seg.startswith('//'): continue`
    —— 于是整段被当成注释丢掉，**那个 prop 连同它的注释一起从产物里消失**。

    实测（本文件与 gen-docs.py 同源同一处）：vui-tag 的 `text` prop 因为上面有一行
    `// 标签内容`，从 `types/index.d.ts` 与 `docs/API.md` 里**静默消失了很久** ——
    TS 用户写 `<vui-tag text="x">` 没有类型提示，API 文档里也查不到这个属性，
    而所有检查一路全绿。

    只剔「整行都是注释」的行，不做全文替换：`default: 'https://…'` 这类值里
    也会出现 `//`，按行首判据不会误伤它。

    ⚠ 段首还可能是**空行**（段是按逗号切的，闭括号后面紧跟着换行）。
    第一版没跳过空行，`' '.strip() == ''` 不以 `//` 开头，循环当场就 break 了 ——
    补丁看起来改了、`vui-tag.text` 依然不见。判据要写成「空行 或 注释行」。
    """
    lines = seg.split('\n')
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if not s or s.startswith('//') or (s.startswith('/*') and s.endswith('*/')):
            i += 1
            continue
        break
    return '\n'.join(lines[i:])


def parse_props(script):
    """解析选项式 props 定义 -> [(name, tstype, default_repr)]"""
    m = re.search(r'\bprops\s*:\s*\{', script)
    if not m:
        return []
    brace = script.index('{', m.start())
    end = find_matching_brace(script, brace)
    if end < 0:
        return []
    body = script[brace + 1:end]

    out = []
    for seg in split_top_level(body):
        seg = drop_leading_comment_lines(seg).strip()
        if not seg:
            continue
        mm = re.match(r'^([A-Za-z_$][\w$]*)\s*:\s*(.+)$', seg, re.S)
        if not mm:
            continue
        name, val = mm.group(1), mm.group(2).strip()
        if val.startswith('{'):
            b2 = val.index('{')
            e2 = find_matching_brace(val, b2)
            inner = val[b2 + 1:e2] if e2 > 0 else ''
            tm = re.search(r'\btype\s*:\s*([A-Za-z]+)', inner)
            vm = re.search(r'\bdefault\s*:\s*(.+)', inner, re.S)
            ts = TYPE_MAP.get(tm.group(1), 'any') if tm else 'any'
            default = vm.group(1).strip().rstrip(',') if vm else None
        else:
            ts = TYPE_MAP.get(val.split('(')[0].strip(), 'any')
            default = None
        out.append((name, ts, default))
    return out


def parse_jsdoc(t):
    """返回 (desc, {prop: comment}, [events])"""
    m = re.search(r'/\*\*(.*?)\*/', t, re.S)
    if not m:
        return '', {}, []
    doc = m.group(1)
    desc = ''
    for line in doc.split('\n'):
        s = line.strip().lstrip('*').strip()
        if s and not s.startswith('@'):
            desc = s
            break
    props = {}
    for pm in re.finditer(r'@property\s*\{[^}]*\}\s*([A-Za-z_$][\w$]*)\s*(.*)', doc):
        props[pm.group(1)] = pm.group(2).strip()
    events = []
    # ⚠ 事件名字符类必须含 `:`（与 gen-docs.py 逐字一致）：`update:modelValue` 这类
    #   「带修饰的事件名」旧版被切成名字 `update` + 说明 `:modelValue …`。下方写
    #   `%sEmits` 时那句「不是合法标识符就加引号」的判断就是为它准备的，但从未生效过。
    for em in re.finditer(r'@event\s*\{[^}]*\}\s*([A-Za-z_$][\w$:-]*)\s*(.*)', doc):
        events.append((em.group(1), em.group(2).strip()))
    return desc, props, events


# ---------- 收集组件 ----------
COMPS = []
for f in sorted(glob.glob('uni_modules/*/components/*/*.vue')):
    f = f.replace('\\', '/')
    cid = f.split('/')[-1][:-4]
    t = open(f, encoding='utf-8').read()
    sm = re.search(r'<script>(.*?)</script>', t, re.S)
    script = sm.group(1) if sm else ''
    props = parse_props(script)
    desc, jprops, events = parse_jsdoc(script)
    em = re.search(r"emits\s*:\s*\[(.*?)\]", script, re.S)
    if em:
        for e in re.findall(r"['\"]([^'\"]+)['\"]", em.group(1)):
            if e.startswith('update:'):
                continue
            if not any(x[0] == e for x in events):
                events.append((e, ''))
    modelv = any(p[0] == 'modelValue' for p in props)
    COMPS.append({'id': cid, 'path': f, 'pascal': PASCAL(cid),
                  'props': props, 'desc': desc, 'jprops': jprops,
                  'events': events, 'vmodel': modelv})

print('组件数:', len(COMPS))
missing = [c['id'] for c in COMPS if not c['props']]
print('未解析到 props 的组件:', missing)

# ---------- 同步 package.json 描述中的组件数量 ----------
# 描述里的数字写死会随迭代过期（npm 页面直接展示它），这里统一由脚本维护。
PKG_PATH = 'package.json'
if os.path.exists(PKG_PATH):
    pkg = json.load(open(PKG_PATH, encoding='utf-8'))
    desc_new = ('Virtual UI (VUI) —— 基于 uni-app 的 Vue3 跨端组件库，%d 个开箱即用的高质量组件，'
                '覆盖基础 / 表单 / 数据展示 / 反馈 / 媒体 / AI 场景，支持 iOS / Android / H5 / 各家小程序'
                % len(COMPS))
    if pkg.get('description') != desc_new:
        pkg['description'] = desc_new
        open(PKG_PATH, 'w', encoding='utf-8', newline='\n').write(
            json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')
        print('package.json 描述已同步组件数量:', len(COMPS))

# ---------- 生成 index.js ----------
lines = [
    '/**',
    ' * VUI (Virtual UI) - 基于 uni-app 的 Vue3 组件库',
    ' *',
    ' * 用法一（推荐）：配合 easycom 自动按需引入，无需 import，见 README',
    ' * 用法二：全量注册',
    ' *   import VUI from \'vui-uniapp\'',
    ' *   app.use(VUI)',
    ' */',
    '',
]
for c in COMPS:
    lines.append("import %s from './%s'" % (c['pascal'], c['path']))
lines.append('')
lines.append('const components = {')
for c in COMPS:
    lines.append('\t%s,' % c['pascal'])
lines.append('};')
lines.append('')
lines.append('const VUI = {')
lines.append('\tinstall(app) {')
lines.append('\t\tObject.keys(components).forEach((name) => {')
lines.append('\t\t\tapp.component(name, components[name]);')
lines.append('\t\t});')
lines.append('\t\t// 同时注册 kebab-case 名称，兼容 <vui-button> 写法')
lines.append('\t\tObject.keys(components).forEach((name) => {')
lines.append('\t\t\tapp.component(kebab(name), components[name]);')
lines.append('\t\t});')
lines.append('\t\treturn app;')
lines.append('\t}');
lines.append('};')
lines.append('')
lines.append('function kebab(str) {')
lines.append("\treturn str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();")
lines.append('}')
lines.append('')
lines.append('export { components, kebab };')
lines.append('export default VUI;')
lines.append('')
for c in COMPS:
    lines.append('export { default as %s } from \'./%s\';' % (c['pascal'], c['path']))
lines.append('')

open('index.js', 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))

# ---------- 生成 types/index.d.ts ----------
d = ['/**',
     ' * VUI (Virtual UI) 类型声明',
     ' * 由各组件实际的 props 定义自动生成，与源码保持同步。',
     ' */',
     "import type { DefineComponent, Plugin } from 'vue';",
     '']
for c in COMPS:
    d.append('/** %s */' % (c['desc'] or c['id']))
    d.append('export interface %sProps {' % c['pascal'])
    for name, ts, default in c['props']:
        cmt = c['jprops'].get(name, '')
        d.append('\t/** %s */' % cmt if cmt else '\t/** */')
        d.append('\t%s?: %s;' % (name, ts))
    d.append('}')
    d.append('')
    if c['events']:
        d.append('/** %s 事件 */' % (c['desc'] or c['id']))
        d.append('export interface %sEmits {' % c['pascal'])
        for en, ec in c['events']:
            key = en if re.match(r'^[A-Za-z_$][\w$]*$', en) else "'%s'" % en
            d.append('\t/** %s */' % ec if ec else '\t/** */')
            d.append('\t%s: (...args: any[]) => void;' % key)
        d.append('}')
        d.append('')
    if c['vmodel']:
        d.append('export type %sModelValue = %sProps[\'modelValue\'];' % (c['pascal'], c['pascal']))
        d.append('')
    d.append('export const %s: DefineComponent<%sProps>;' % (c['pascal'], c['pascal']))
    d.append('')

d.append('export declare const components: Record<string, DefineComponent<any>>;')
d.append('export declare function kebab(str: string): string;')
d.append('declare const VUI: Plugin;')
d.append('export default VUI;')
d.append('')
d.append('declare module \'vue\' {')
d.append('\tinterface GlobalComponents {')
for c in COMPS:
    d.append('\t\t%s: typeof %s;' % (c['pascal'], c['pascal']))
    d.append('\t\t\'%s\': typeof %s;' % (c['id'], c['pascal']))
d.append('\t}')
d.append('}')
d.append('')

os.makedirs('types', exist_ok=True)
open('types/index.d.ts', 'w', encoding='utf-8', newline='\n').write('\n'.join(d))

print('index.js 行数:', len(lines))
print('types/index.d.ts 行数:', len(d))
print('总 props:', sum(len(c['props']) for c in COMPS))
