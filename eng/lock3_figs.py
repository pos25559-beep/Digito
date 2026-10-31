import math, os
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from lock3_geom import insert, plug, P, Z, H
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'v3')
INK, PETG, CF = '#202124', '#8ab4f8', '#3c4043'
def draw(ax, man, z, fc, alpha=1):
    for poly in man.slice(z).to_polygons(): ax.add_patch(Polygon(poly, closed=True, fc=fc, ec=INK, lw=.6, alpha=alpha))
ins, _ = insert()
fig, axs = plt.subplots(1, 4, figsize=(20, 5.6))
views = [(0, 1.0, 'Entrada (0°) · plano das patilhas'), (45, 1.0, 'A trancar (45°): patilha afasta o braço'), (60, 1.0, 'Bloqueado (60°): dente atrás da patilha'), (60, 2.6, 'Bloqueado · plano das abas (z = 2,6)')]
for ax, (rot, z, t) in zip(axs, views):
    draw(ax, ins, z, PETG); draw(ax, plug(rot, test_base=False), z, CF, .9)
    ax.set_xlim(-10.5, 10.5); ax.set_ylim(-10.5, 10.5); ax.set_aspect('equal'); ax.axis('off'); ax.set_title(t, fontsize=12)
fig.suptitle('DÍGITO Lock v3 · plantas vistas de fora (insert azul = capa; cinzento = pega)', fontsize=13)
fig.tight_layout(); fig.savefig(os.path.join(OUT, 'v3_plantas.png'), dpi=150)
fig, ax = plt.subplots(figsize=(11, 4.2))
for man, fc in ((ins, PETG), (plug(60, test_base=False), CF)):
    for poly in man.rotate([90, 0, 0]).slice(0.0).to_polygons():
        ax.add_patch(Polygon([(x, -y) for x, y in poly], closed=True, fc=fc, ec=INK, lw=.6, alpha=.95))
ax.axhline(0, color=INK, lw=1.2); ax.text(-10.8, -0.45, 'telemóvel', fontsize=9)
ax.axhline(H, color='#188038', lw=1, ls='--'); ax.text(9.9, H + 0.1, f'costas da capa z = {H:.2f}', fontsize=9, color='#188038')
ax.set_xlim(-11, 15); ax.set_ylim(-0.8, 5.0); ax.set_aspect('equal'); ax.set_xlabel('mm'); ax.set_title('Corte vertical, bloqueado: tudo abaixo das costas (3,2 mm)')
fig.tight_layout(); fig.savefig(os.path.join(OUT, 'v3_corte.png'), dpi=150); print('ok')
