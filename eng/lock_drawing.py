"""Desenho técnico A3 (SVG -> PDF) a partir de cortes reais dos sólidos de lock_geom.py"""
import json, math, os
import numpy as np
import trimesh
import lock_geom as L

HERE = os.path.dirname(__file__); OUT = os.path.join(HERE, 'out')
Z, P = L.Z, L.P
ins = L.to_trimesh(L.insert()); plg = L.to_trimesh(L.plug(base=False).__add__(L.cyl(9.0, L.base_bot, L.base_bot + 2.0).rotate([0, 0, 0]))); tpu = L.to_trimesh(L.tpu_boss(2.0))
plg_bare = L.to_trimesh(L.plug(base=False))

W, H = 1587, 1123   # A3 a 96 dpi (420 × 297 mm)
S = []              # elementos SVG
INK = '#202124'; SOFT = '#5F6368'; BLUE = '#1A73E8'
HATCH = {'insert': '#D2E3FC', 'macho': '#FCE8E6', 'tpu': '#E6F4EA'}
def txt(x, y, t, size=11, anchor='start', color=SOFT, weight=400, family='DM Mono'):
    S.append(f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}, monospace" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}">{t}</text>')
def line(x1, y1, x2, y2, c=SOFT, w=0.8, dash=None):
    S.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{c}" stroke-width="{w}"' + (f' stroke-dasharray="{dash}"' if dash else '') + '/>')
def poly(pts, fill='none', c=INK, w=1.1, close=True):
    d = 'M' + ' L'.join(f'{x:.2f},{y:.2f}' for x, y in pts) + (' Z' if close else '')
    S.append(f'<path d="{d}" fill="{fill}" stroke="{c}" stroke-width="{w}" stroke-linejoin="round"/>')
def arrow(x, y, ang, c=SOFT):
    a = math.radians(ang); s = 6
    p1 = (x - s * math.cos(a - 0.35), y - s * math.sin(a - 0.35)); p2 = (x - s * math.cos(a + 0.35), y - s * math.sin(a + 0.35))
    S.append(f'<path d="M{x:.1f},{y:.1f} L{p1[0]:.1f},{p1[1]:.1f} L{p2[0]:.1f},{p2[1]:.1f} Z" fill="{c}"/>')
def dim_h(x1, x2, y, label, yref1=None, yref2=None, above=True):
    if yref1 is not None: line(x1, yref1, x1, y + (-4 if above else 4), w=0.6)
    if yref2 is not None: line(x2, yref2, x2, y + (-4 if above else 4), w=0.6)
    line(x1, y, x2, y, w=0.7); arrow(x1, y, 180); arrow(x2, y, 0)
    txt((x1 + x2) / 2, y - 5 if above else y + 14, label, 11, 'middle', INK)
def dim_v(x, y1, y2, label, xref1=None, xref2=None, left=True):
    if xref1 is not None: line(xref1, y1, x + (4 if left else -4), y1, w=0.6)
    if xref2 is not None: line(xref2, y2, x + (4 if left else -4), y2, w=0.6)
    line(x, y1, x, y2, w=0.7); arrow(x, y1, -90 if y1 < y2 else 90); arrow(x, y2, 90 if y1 < y2 else -90)
    S.append(f'<text x="{x - 6 if left else x + 6:.1f}" y="{(y1 + y2) / 2 + 4:.1f}" font-family="DM Mono, monospace" font-size="11" fill="{INK}" text-anchor="{"end" if left else "start"}">{label}</text>')

def section_paths(mesh, origin, normal):
    sec = mesh.section(plane_origin=origin, plane_normal=normal)
    if sec is None: return []
    return [np.asarray(e) for e in sec.discrete]

def view_section(cx, cy, k, angle_deg, title):
    """corte vertical por um plano que contém o eixo, a 'angle_deg' (atravessa a patilha bloqueada)"""
    a = math.radians(angle_deg); u = np.array([math.cos(a), math.sin(a), 0]); n = np.array([-math.sin(a), math.cos(a), 0])
    for name, mesh in [('tpu', tpu), ('insert', ins), ('macho', plg)]:
        for path in section_paths(mesh, [0, 0, 0], n):
            pts = [(cx + k * float(np.dot(p, u)), cy - k * float(p[2])) for p in path]
            poly(pts, fill=HATCH[name], c=INK, w=1.0)
    line(cx, cy - k * 8.5, cx, cy + k * 0.8, c=BLUE, w=0.8, dash='10 3 2 3')  # eixo
    line(cx - k * 11, cy, cx + k * 11, cy, c=SOFT, w=0.8, dash='4 3')       # face do telemóvel
    txt(cx + k * 11 + 6, cy + 4, 'face traseira do telemóvel (z = 0)', 10)
    txt(cx - k * 11, cy - k * 8.5 - 18, title, 13, 'start', INK, 500, 'Inter')
    txt(cx + k * 3, cy - k * 8.0 + 4, 'base da pega (representação)', 10, 'start', SOFT)
    return u

def zz(cy, k, z): return cy - k * z
def view_plan(cx, cy, k, z, mesh, title, extra=None, fill='#D2E3FC'):
    for path in section_paths(mesh, [0, 0, z], [0, 0, 1]):
        pts = [(cx + k * p[0], cy - k * p[1]) for p in path]
        poly(pts, fill=fill, w=1.0)
    line(cx - k * 10, cy, cx + k * 10, cy, c=BLUE, w=0.6, dash='10 3 2 3'); line(cx, cy - k * 10, cx, cy + k * 10, c=BLUE, w=0.6, dash='10 3 2 3')
    txt(cx - k * 10, cy - k * 10 - 14, title, 13, 'start', INK, 500, 'Inter')

# ---------- folha ----------
S.append(f'<rect x="0" y="0" width="{W}" height="{H}" fill="#FFFFFF"/>')
S.append(f'<rect x="20" y="20" width="{W - 40}" height="{H - 40}" fill="none" stroke="{INK}" stroke-width="1.4"/>')

# Vista 1: corte A–A da montagem bloqueada (escala 10:1)
k = 30.0; cx, cy = 470, 560
view_section(cx, cy, k, P['turn'], 'CORTE A–A · montagem bloqueada · ≈ 8:1 em A3')
# cotas verticais (z)
xr = cx + k * 9.0 + 70
xr = cx + k * 9.0 + 30
for i, (z1, z2, lab) in enumerate([(0, Z['insert_bottom'], f"{Z['insert_bottom']:.2f} TPU sob o insert"), (Z['insert_bottom'], Z['lip_bottom'], f"{Z['lip_bottom'] - Z['insert_bottom']:.2f} canal"), (Z['lip_bottom'], Z['insert_top'], f"{P['lip_t']:.2f} lábio"), (Z['insert_top'], L.boss_top, f"{P['cap_t']:.2f} tampa de TPU"), (L.boss_top, L.base_bot, f"{P['base_gap']:.2f} folga da base")]):
    dim_v(xr + 150 * (i % 2), zz(cy, k, z1), zz(cy, k, z2), lab, xref1=cx + k * 9.2, xref2=cx + k * 9.2, left=False)
dim_v(cx - k * 9.0 - 30, zz(cy, k, 0), zz(cy, k, Z['insert_top']), f"{Z['insert_top']:.2f} topo do insert", xref1=cx - k * 9.2, xref2=cx - k * 8.0)
dim_v(cx - k * 9.0 - 30, zz(cy, k, Z['insert_top']), zz(cy, k, L.boss_top), '', xref1=cx - k * 9.2, xref2=cx - k * 9.0)
txt(cx - k * 9.0 - 36, zz(cy, k, L.boss_top) - 8, f"bossa {L.boss_top:.2f}", 11, 'end', INK)
# cotas radiais
yb = zz(cy, k, -0.9)
dim_h(cx, cx + k * L.r_lug, yb + 20, f'R{L.r_lug:.1f} patilha', above=False)
dim_h(cx, cx + k * L.r_ch, yb + 52, f'R{L.r_ch:.1f} canal', above=False)
dim_h(cx, cx + k * P['boss_r'], yb + 84, f'R{P["boss_r"]:.1f} bossa', above=False)
dim_h(cx - k * L.r_bore, cx, yb + 20, f'R{L.r_bore:.1f} furo', above=False)
# legenda de materiais
lx, ly = 60, 960
for i, (n, lab) in enumerate([('insert', 'insert · PETG (FDM) ou PA12 / resina tough'), ('macho', 'pega (macho) · PETG-CF, PA12, resina ou Ti6Al4V'), ('tpu', 'capa · TPU 95A, com pilar-mola')]):
    S.append(f'<rect x="{lx}" y="{ly + i * 22}" width="16" height="12" fill="{HATCH[n]}" stroke="{INK}" stroke-width="0.8"/>'); txt(lx + 24, ly + i * 22 + 11, lab, 11, 'start', INK)

# Vista 2: insert visto de cima (corte no lábio) · 8:1
k2 = 18.0; cx2, cy2 = 1000, 270
view_plan(cx2, cy2, k2, Z['insert_top'] - 0.3, ins, 'INSERT · corte B–B no lábio (ranhuras de entrada) · ≈ 5:1')
for a in P['lug_pos']:
    r = L.r_ch - 0.8; x = cx2 + k2 * r * math.cos(math.radians(a)); y = cy2 - k2 * r * math.sin(math.radians(a))
    txt(x, y + 4, f'{a}°', 10, 'middle', BLUE)
dim_h(cx2 - k2 * P['ins_af'] / 2, cx2 + k2 * P['ins_af'] / 2, cy2 + k2 * 9.6, f'{P["ins_af"]:.1f} entre faces (hex)', yref1=cy2 + k2 * 4, yref2=cy2 + k2 * 4, above=False)
txt(cx2 + k2 * 8.9, cy2 + 18, 'chave', 10, 'start', BLUE)
# Vista 3: insert no canal (entalhes e batentes) · 8:1
cx3, cy3 = 1390, 270
view_plan(cx3, cy3, k2, Z['lip_bottom'] + P['notch'] / 2, ins, 'INSERT · corte C–C nos entalhes · ≈ 5:1')
for a in P['lug_pos']:
    al = a + P['turn']; r = L.r_ch - 0.8
    txt(cx3 + k2 * r * math.cos(math.radians(al)), cy3 - k2 * r * math.sin(math.radians(al)) + 4, f'{al:.0f}°', 10, 'middle', BLUE)
# Vista 4: macho visto de baixo · 8:1
cx4, cy4 = 800, 985
k4 = 11.0
view_plan(cx4, cy4, k4, Z['lug_bottom_locked'] + 0.5, L.to_trimesh(L.plug(rot=0, base=False)), 'MACHO · corte D–D nas patilhas · ≈ 3:1', fill='#FCE8E6')
dim_h(cx4 - k4 * P['r_core'], cx4 + k4 * P['r_core'], cy4 + k4 * 7.4, f'Ø{2 * P["r_core"]:.1f} núcleo', yref1=cy4, yref2=cy4, above=False)
txt(cx4 + k4 * 9, cy4 - 10, '3 patilhas de 40°', 10.5, 'start', INK)
txt(cx4 + k4 * 9, cy4 + 6, 'a 0°, 110° e 240°', 10.5, 'start', INK)
txt(cx4 + k4 * 9, cy4 + 22, '(uma só orientação)', 10.5, 'start', SOFT)

# Tabela de parâmetros e bloco de título
tx, ty = 1170, 560
rows = [('Rotação de bloqueio', f'{P["turn"]:.0f}° (anti-horário, visto de fora)'), ('Curso para libertar', f'{-L.Z["lug_top_pushed"] + L.Z["lug_top_locked"]:.2f} mm (empurrar)'),
        ('Entalhe', f'{P["notch"]:.2f} mm de profundidade'), ('Patilha', f'{P["lug_t"]:.2f} × {P["lug_proj"]:.2f} mm, {P["lug_deg"]:.0f}°'), ('Folga radial', f'{P["c_rad"]:.2f} mm FDM · 0,10 resina'),
        ('Folga axial a rodar', f'{P["clr_ax"]:.2f} mm'), ('Pré-carga da mola', f'{P["preload"]:.2f} mm'), ('Pilar-mola (TPU)', 'Ø2,0 nominal · escolher no provete'),
        ('Furo cego no macho', f'Ø{P["recess_d"]:.1f} × {P["recess"]:.1f} mm'), ('Pausa da impressão (capa)', f'z = {Z["insert_top"]:.2f} mm → colocar insert')]
S.append(f'<rect x="{tx}" y="{ty}" width="390" height="{24 * len(rows) + 34}" fill="#F8F9FA" stroke="{INK}" stroke-width="1"/>')
txt(tx + 12, ty + 22, 'PARÂMETROS DE PROJETO', 12, 'start', INK, 600, 'Inter')
for i, (a, b) in enumerate(rows):
    txt(tx + 12, ty + 46 + 24 * i, a, 10, 'start', SOFT); txt(tx + 378, ty + 46 + 24 * i, b, 10, 'end', INK)
bx, by = 1100, 900
S.append(f'<rect x="{bx}" y="{by}" width="{W - 20 - bx}" height="{H - 20 - by}" fill="none" stroke="{INK}" stroke-width="1.2"/>')
txt(bx + 16, by + 32, 'DÍGITO Lock v1', 22, 'start', INK, 500, 'Inter')
txt(bx + 16, by + 58, 'Baioneta de bloqueio positivo · empurrar e rodar · sem peças móveis', 12, 'start', INK, 400, 'Inter')
txt(bx + 16, by + 90, 'mm · tol. geral ±0,10 FDM (bico 0,4 / camada 0,2) · ±0,05 MSLA', 10.5)
txt(bx + 16, by + 112, 'Gerado por eng/lock_geom.py a partir dos sólidos · rev. A · 30-10-2026', 10.5)
txt(bx + 16, by + 134, 'Projeto: P. Silva · DÍGITO · Fabrico Aditivo, NOVA FCT', 10.5)
txt(bx + 16, by + 156, 'Folha 1/1 · A3 · ângulos + anti-horários vistos de fora', 10.5)

svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">' + ''.join(S) + '</svg>'
open(os.path.join(OUT, 'DIGITO_Lock_v1_desenho.svg'), 'w').write(svg)
print('svg ok')
