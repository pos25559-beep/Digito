"""Cortes do Lock v2 (planta à altura dos braços e corte vertical) -> out/v2/*.png"""
import math, os, json
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
import manifold3d as mf
from lock2_geom import insert, plug, P, Z
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'v2')
INK, PETG, CF, TPU = '#202124', '#8ab4f8', '#3c4043', '#9aa0a6'

def draw_cs(ax, man, z, fc, ec=INK, alpha=1, lw=0.6):
    cs = man.slice(z)
    for poly in cs.to_polygons():
        ax.add_patch(Polygon(poly, closed=True, fc=fc, ec=ec, lw=lw, alpha=alpha))

fig, axs = plt.subplots(1, 3, figsize=(15, 5.3))
ins, _ = insert()
for ax, (rot, t) in zip(axs, [(0, 'Entrada (0°): dente na folga'), (45, 'A trancar (45°): dente afasta o braço'), (60, 'Bloqueado (60°): dente no bolso')]):
    draw_cs(ax, ins, 1.0, PETG)
    draw_cs(ax, plug(rot, test_base=False), 1.0, CF, alpha=.9)
    ax.set_xlim(-9.5, 9.5); ax.set_ylim(-9.5, 9.5); ax.set_aspect('equal'); ax.axis('off'); ax.set_title(t, fontsize=12)
axs[0].annotate('braço (PETG)\nflete para fora', xy=(-5.4, 2.6), xytext=(-9.3, 7.6), fontsize=9, arrowprops=dict(arrowstyle='-', lw=.6))
axs[2].annotate('pino de libertação\n(por dentro da capa)', xy=(math.cos(math.radians(184))*5.6, math.sin(math.radians(184))*5.6), xytext=(-9.3, -8.4), fontsize=9, arrowprops=dict(arrowstyle='-', lw=.6))
fig.suptitle('DÍGITO Lock v2 · planta a z = 1,0 mm (banda dos braços, vista de fora)', fontsize=13)
fig.tight_layout(); fig.savefig(os.path.join(OUT, 'v2_planta_bracos.png'), dpi=160)

# corte vertical (plano XZ) bloqueado
fig, ax = plt.subplots(figsize=(10, 4.6))
def xz(man):
    m = man.rotate([90, 0, 0])   # y -> z: cortar em y=0 equivale a fatiar z=0 depois de rodar
    return m
for man, fc in ((ins, PETG), (plug(60, test_base=False), CF)):
    cs = xz(man).slice(0.0)
    for poly in cs.to_polygons():
        ax.add_patch(Polygon([(x, -y) for x, y in poly], closed=True, fc=fc, ec=INK, lw=.6, alpha=.95))
ax.axhline(0, color=INK, lw=1.2); ax.text(-9.6, -0.45, 'telemóvel', fontsize=9)
for k, v in (('lábio', Z['lip_bottom']), ('banda dos braços', P['band_h'])):
    ax.axhline(v, color='#c5221f', lw=.6, ls='--'); ax.text(9.7, v, f'{k} z={v:.2f}', fontsize=8, va='center')
ax.set_xlim(-10, 14); ax.set_ylim(-0.8, 7.5); ax.set_aspect('equal'); ax.set_xlabel('mm'); ax.set_title('Corte vertical, bloqueado (insert azul = capa; cinzento = pega)')
fig.tight_layout(); fig.savefig(os.path.join(OUT, 'v2_corte.png'), dpi=160)
print('ok')
