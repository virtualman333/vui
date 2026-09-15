# -*- coding: utf-8 -*-
"""为 uni_modules 下的组件注入 VUI 主题变量兜底块（幂等）。

用法：
    python scripts/inject-theme.py

机制说明：uni-app 会把项目根 uni.scss 自动注入到每个组件样式的编译上下文，
且顺序在组件样式之前。因此组件内用 `!default` 声明兜底值，用户在 uni.scss
里赋值即可整体覆盖——这是本组件库支持换肤的基础，缺少该变量块的组件
将脱离项目后无法编译，也无法被主题覆盖。

新增组件后跑一次本脚本即可，已注入过的组件会被自动跳过。
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
/* ===== VUI \u4e3b\u9898\u53d8\u91cf\u7ed3\u675f ===== */
"""

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

injected, skipped, no_scss = [], [], []

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
        if '$vui-primary:' in body:
            skipped.append(p.replace('\\', '/'))
            continue
        t = t[:m.start()] + head + '\n' + THEME_BLOCK + body.lstrip('\n') + tail + t[m.end():]
        open(p, 'w', encoding='utf-8', newline='\n').write(t)
        injected.append(p.replace('\\', '/'))

print('\u5df2\u6ce8\u5165\u4e3b\u9898\u53d8\u91cf:', len(injected))
for x in injected:
    print('  +', x)
print('\u5df2\u5305\u542b\u8df3\u8fc7:', len(skipped))
if no_scss:
    print('\u26a0 \u65e0 SCSS \u6837\u5f0f\u5757\uff08\u9700\u4eba\u5de5\u5904\u7406\uff09:')
    for x in no_scss:
        print('  !', x)
