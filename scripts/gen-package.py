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
        seg = seg.strip()
        if not seg or seg.startswith('//'):
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
    for em in re.finditer(r'@event\s*\{[^}]*\}\s*([A-Za-z_$][\w$-]*)\s*(.*)', doc):
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
