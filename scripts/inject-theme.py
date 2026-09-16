# -*- coding: utf-8 -*-
"""为 uni_modules 下的组件注入 / 刷新 VUI 主题变量兜底块（幂等）。

用法：
    python scripts/inject-theme.py

机制说明：uni-app 会把项目根 uni.scss 自动注入到每个组件样式的编译上下文，
且顺序在组件样式之前。因此组件内用 `!default` 声明兜底值，用户在 uni.scss
里赋值即可整体覆盖——这是本组件库支持换肤的基础，缺少该变量块的组件
将脱离项目后无法编译，也无法被主题覆盖。

⚠ 本脚本此前是**只注入不更新**（`'$vui-primary:' in body` 就跳过），
后果：主题层后来新增的变量永远进不了已有组件的兜底块 —— 于是新变量只有在
「新写的组件」里能用；老组件一旦去引用它，`npm run check:sfc`（单独编译组件
样式块，不预置 uni.scss）就会直接报 Undefined variable。而这两件事都不会
有任何提示，属于典型的「两份清单各自漂移」。

现在：块内容与 THEME_BLOCK 不一致即刷新（幂等），组件里的`$vui-*`清单
因此始终等于主题层的清单。
"""
import os
import re

THEME_BLOCK = """/* ===== VUI \u4e3b\u9898\u53d8\u91cf\uff08\u517c\u5e95\u5b9a\u4e49\uff0c\u53ef\u5728\u9879\u76ee uni.scss \u4e2d\u8986\u76d6\uff09 ===== */
/* \u529f\u80fd\u8272 */
$vui-primary: #2979ff !default;
$vui-success: #18bc37 !default;
$vui-warning: #f3a73f !default;
$vui-error: #e43d33 !default;
$vui-info: #8f939c !default;
$vui-region-active-color: #f07b00 !default;
/* \u6587\u5b57\u8272 */
$vui-text-color: #333 !default;
$vui-text-color-regular: #606266 !default;
$vui-text-color-secondary: #909399 !default;
$vui-text-color-placeholder: #c0c4cc !default;
$vui-text-color-disabled: #e4e7ed !default;
$vui-text-color-inverse: #fff !default;
/* \u8fb9\u6846\u8272 */
$vui-border-color: #dcdfe6 !default;
$vui-border-color-light: #ebeef5 !default;
$vui-border-color-lighter: #e5e6eb !default;
/* \u586b\u5145\u4e0e\u80cc\u666f\u8272 */
$vui-bg-color: #fff !default;
$vui-bg-color-hover: #f2f3f5 !default;
$vui-fill-color: #f1f1f1 !default;
$vui-fill-color-light: #f5f7fa !default;
$vui-fill-color-lighter: #fafafa !default;
$vui-track-color: #ebedf0 !default;
$vui-active-bg-color: #f5f9ff !default;
$vui-gray-color: #ccc !default;
$vui-white: #fff !default;
/* \u4ee3\u7801\u5757\uff08\u6df1\u8272\u5e95 + \u914d\u5957\u524d\u666f\uff09\u2014\u2014 vui-code / vui-markdown \u5171\u7528 */
$vui-code-bg: #282c34 !default;
$vui-code-color: #abb2bf !default;
/* ===== VUI \u4e3b\u9898\u53d8\u91cf\u7ed3\u675f ===== */"""

# 兜底块的首尾标记（与 scripts/check-theme.js 的 THEME_BLOCK_RE 同一形状）
BLOCK_RE = re.compile(
    r'/\*[^\n]*VUI[^\n]*\u4e3b\u9898\u53d8\u91cf[^\n]*\*/\n[\s\S]*?'
    r'/\*[^\n]*VUI[^\n]*\u4e3b\u9898\u53d8\u91cf\u7ed3\u675f[^\n]*\*/'
)

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

injected, refreshed, fresh, orphan, no_scss = [], [], [], [], []

for root, dirs, files in os.walk('uni_modules'):
    for fn in files:
        if not fn.endswith('.vue'):
            continue
        p = os.path.join(root, fn)
        t = open(p, encoding='utf-8').read()
        m = re.search(r'(<style[^>]*lang=["\']scss["\'][^>]*>)(.*?)(</style>)', t, re.S)
        if not m:
            no_scss.append(p.replace('\\', '/'))
            continue
        head, body, tail = m.group(1), m.group(2), m.group(3)
        rel = p.replace('\\', '/')

        if BLOCK_RE.search(body):
            new_body = BLOCK_RE.sub(lambda _: THEME_BLOCK, body, count=1)
            if new_body == body:
                fresh.append(rel)
                continue
            t = t[:m.start()] + head + new_body + tail + t[m.end():]
            refreshed.append(rel)
        elif '$vui-primary:' in body:
            # 有变量但不符合标准块形状：不猜，交给人
            orphan.append(rel)
            continue
        else:
            t = t[:m.start()] + head + '\n' + THEME_BLOCK + '\n' + body.lstrip('\n') + tail + t[m.end():]
            injected.append(rel)

        open(p, 'w', encoding='utf-8', newline='\n').write(t)

print('\u65b0\u6ce8\u5165:', len(injected))
for x in injected:
    print('  +', x)
print('\u5df2\u5237\u65b0:', len(refreshed))
for x in refreshed:
    print('  ~', x)
print('\u5df2\u662f\u5f53\u524d\u7248\u672c:', len(fresh))
if orphan:
    print('\u26a0 \u6709 $vui-* \u4f46\u672a\u627e\u5230\u6807\u51c6\u515c\u5e95\u5757\uff08\u9700\u4eba\u5de5\u5904\u7406\uff09:')
    for x in orphan:
        print('  !', x)
if no_scss:
    print('\u26a0 \u65e0 SCSS \u6837\u5f0f\u5757\uff08\u9700\u4eba\u5de5\u5904\u7406\uff09:')
    for x in no_scss:
        print('  !', x)
