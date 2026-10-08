# -*- coding: utf-8 -*-
"""首页 / 掷骰子用的基础小钢炮：一只手挥手，一只手托着发光的纽扣。
用法：python3 tools/gen_hero.py <小钢炮结果图_v5/src 目录>
"""
import os, sys
SRC = sys.argv[1]
sys.path.insert(0, SRC)
from xgp import svg, sleeve, mitten, button_icon, sparkle
from identities import base, finish, SH_L, SH_R

ACC = '#8f7cff'
BODY = '#4b4df2'
L = base(ACC, outfit='url(#gBlue)', look=(0, 2), brows=(-6, 6, 0), mouth_kind='open')
L['sleeves'] = (sleeve(SH_L, (360, 720), (470, 752), BODY, '#3f41e0')
                + sleeve(SH_R, (720, 600), (744, 470), BODY, '#3f41e0'))
L['mid'] = ('<circle cx="520" cy="672" r="80" fill="#fff3c4" opacity=".35" filter="url(#b16)"/>'
            + button_icon(520, 672, 46, fill='#f4e2b8', stroke='#c99a3e', holes='#7a4f12', glow=True))
L['hands'] = mitten(490, 748, rot=-8) + mitten(746, 446, rot=-24, flip=True)
L['front'] = (sparkle(820, 330, 18, '#ffffff', .9) + sparkle(220, 420, 12, ACC, .9)
              + sparkle(600, 640, 9, '#fff3c4', .9) + sparkle(860, 520, 8, '#7cf7ff', .8))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img', '00_hero.svg')
with open(out, 'w', encoding='utf-8') as f:
    f.write(svg(ACC, finish(L)))
print('wrote', os.path.normpath(out))
