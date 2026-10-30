"""DÍGITO Lock v1 — geometria sólida (manifold3d) da baioneta, verificação cinemática e STL de ensaio.
z = 0 na face traseira do telemóvel; ângulos em graus, positivos no sentido anti-horário vistos de fora (de +z).
"""
import json, math, os
import numpy as np
import manifold3d as mf
import trimesh

HERE = os.path.dirname(__file__)
C = json.load(open(os.path.join(HERE, 'lock_calc.json')))
Z = C['z']; G = C['geom']
P = dict(r_core=5.0, c_rad=0.20, lug_proj=1.6, lug_t=1.4, lug_deg=40.0, lug_pos=[0, 110, 240], turn=60.0,
         lip_t=1.8, notch=0.40, clr_ax=0.15, preload=0.15, tpu_floor=0.6, pillar_root=0.3, recess=1.0, recess_d=3.4,
         ins_af=16.0, slot_extra=2.0, notch_extra=1.0, stop_w=5.0, stop_gap=1.5, key_w=1.2, key_h=0.6,
         cap_t=0.6, cap_ri=7.0, boss_r=9.0, base_gap=0.7, lead=0.3)
r_lug = P['r_core'] + P['lug_proj']; r_bore = P['r_core'] + P['c_rad']; r_ch = r_lug + P['c_rad']
H = Z['insert_top'] - Z['insert_bottom']                     # altura do insert
z_ins = Z['insert_bottom']
z_lipb = Z['lip_bottom']
boss_top = Z['insert_top'] + P['cap_t']
base_bot = boss_top + P['base_gap']
SEG = 128

def cyl(r, z0, z1, segs=SEG): return mf.Manifold.cylinder(z1 - z0, r, r, segs).translate([0, 0, z0])
def sector(r1, r2, a1, a2, z0, z1, n=48):
    pts = [(r2 * math.cos(math.radians(a1 + (a2 - a1) * i / n)), r2 * math.sin(math.radians(a1 + (a2 - a1) * i / n))) for i in range(n + 1)]
    pts += [(r1 * math.cos(math.radians(a2 - (a2 - a1) * i / n)), r1 * math.sin(math.radians(a2 - (a2 - a1) * i / n))) for i in range(n + 1)]
    return mf.Manifold.extrude(mf.CrossSection([pts]), z1 - z0).translate([0, 0, z0])
def hexprism(af, z0, z1, rot=0):
    R = af / 2 / math.cos(math.radians(30)); pts = [(R * math.cos(math.radians(rot + 60 * k)), R * math.sin(math.radians(rot + 60 * k))) for k in range(6)]
    return mf.Manifold.extrude(mf.CrossSection([pts]), z1 - z0).translate([0, 0, z0])
def box(x0, x1, y0, y1, z0, z1): return mf.Manifold.cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0])
def cone_cut(r0, z0, depth, outward=True):
    """anel triangular de revolução (chanfro a 45°) para cortar arestas"""
    if outward: pts = [(r0, z0), (r0 + depth, z0), (r0, z0 - depth)]
    else: pts = [(r0, z0), (r0 + depth, z0), (r0 + depth, z0 - depth)]
    return mf.Manifold.revolve(mf.CrossSection([pts]), SEG)

def insert():
    z0, z1 = z_ins, Z['insert_top']
    m = hexprism(P['ins_af'], z0, z1, rot=0)
    # chave numa face (orientação única no bolso da capa); face do hexágono a 0° está em x = +af/2
    m = m + box(P['ins_af'] / 2 - 0.5, P['ins_af'] / 2 + P['key_h'], -P['key_w'] / 2, P['key_w'] / 2, z0, z1)
    m = m - cyl(r_bore, z0 - 1, z1 + 1)                                  # furo do núcleo
    m = m - cyl(r_ch, z0 - 1, z_lipb)                                     # canal sob o lábio
    for a in P['lug_pos']:
        h = P['lug_deg'] / 2 + P['slot_extra']
        m = m - sector(r_bore - 0.5, r_ch + 0.1, a - h, a + h, z_lipb - 0.01, z1 + 1)          # ranhuras de entrada
        hn = P['lug_deg'] / 2 + P['notch_extra']; al = a + P['turn']
        m = m - sector(r_bore - 0.5, r_ch + 0.1, al - hn, al + hn, z_lipb - 0.5, z_lipb + P['notch'])  # entalhes de bloqueio
        s0 = al + P['lug_deg'] / 2 + P['stop_gap']
        m = m + sector(P['r_core'] + 0.35, r_ch + 0.5, s0, s0 + P['stop_w'], z0, z_lipb + 0.3)   # batente
    # entrada chanfrada 0,3 mm no topo do furo
    lead = mf.Manifold.revolve(mf.CrossSection([[(r_bore - 0.01, z1 + 0.01), (r_bore - 0.01, z1 - P['lead']), (r_bore + P['lead'], z1 + 0.01)]]), SEG)
    return m - lead

def plug(rot=None, dz=0.0, base=True):
    """macho na posição bloqueada (rot = turn) por defeito; dz desloca ao longo de z"""
    rot = P['turn'] if rot is None else rot
    zb = Z['lug_bottom_locked']
    m = cyl(P['r_core'], zb, base_bot + (0.01 if base else 2.0))
    for a in P['lug_pos']:
        m = m + sector(P['r_core'] - 0.6, r_lug, a - P['lug_deg'] / 2, a + P['lug_deg'] / 2, zb, zb + P['lug_t'])
    m = m - cyl(P['recess_d'] / 2, zb - 1, zb + P['recess'])
    if base:  # base da pega de ensaio: cone a 45° até Ø22 (imprime sem suportes) + pega em T com furo para pendurar pesos
        cone = mf.Manifold.cylinder(6.0, P['r_core'], 11.0, SEG).translate([0, 0, base_bot])
        top = cyl(11.0, base_bot + 6.0, base_bot + 9.0)
        handle = box(-14, 14, -3, 3, base_bot + 9.0, base_bot + 15.0)
        hole = mf.Manifold.cylinder(8, 2.0, 2.0, 48).rotate([90, 0, 0]).translate([0, 4, base_bot + 12.0])
        m = m + cone + top + (handle - hole.translate([10, 0, 0]) - hole.translate([-10, 0, 0]))
    return m.rotate([0, 0, rot]).translate([0, 0, dz])

def tpu_boss(d_pillar, plate=None):
    m = cyl(P['boss_r'], 0, boss_top)
    m = m - cyl(r_ch, z_ins, boss_top + 1)                    # espaço livre acima do chão do insert
    m = m - hexprism(P['ins_af'], z_ins, Z['insert_top'])     # bolso do insert
    m = m - box(P['ins_af'] / 2 - 0.5, P['ins_af'] / 2 + P['key_h'], -P['key_w'] / 2, P['key_w'] / 2, z_ins, Z['insert_top'])  # ranhura da chave
    m = m - cyl(P['cap_ri'], Z['insert_top'] - 0.01, boss_top + 1)   # abertura da tampa de TPU (raio > canal)
    m = m - cyl(2.6, Z['pillar_root'], z_ins + 0.01)          # poço à volta da raiz do pilar
    m = m + cyl(d_pillar / 2, Z['pillar_root'] - 0.01, Z['pillar_top_free'], 48)
    return m

def vol(m): return m.volume() if hasattr(m, 'volume') else m.get_volume()
def to_trimesh(m):
    mesh = m.to_mesh(); v = np.array(mesh.vert_properties)[:, :3]; f = np.array(mesh.tri_verts)
    return trimesh.Trimesh(v, f, process=False)

if __name__ == '__main__':
    ins = insert(); res = {'insert_vol_mm3': round(vol(ins), 1)}
    # ---------- verificação cinemática ----------
    def inter(a, b): return vol(a ^ b)
    dz_push = Z['lug_top_pushed'] - Z['lug_top_locked']
    checks = {}
    checks['bloqueado'] = inter(plug(), ins)
    checks['bloqueado_puxado_0.05'] = inter(plug(dz=0.05), ins)                   # deve tocar no teto do entalhe
    checks['bloqueado_rodado_-3'] = inter(plug(rot=P['turn'] - 3), ins)           # paredes do entalhe bloqueiam
    checks['bloqueado_rodado_+3'] = inter(plug(rot=P['turn'] + 3), ins)
    rot_path = [inter(plug(rot=r, dz=dz_push), ins) for r in np.arange(0, P['turn'] + 0.01, 2.5)]
    checks['rotacao_empurrado_max'] = max(rot_path)
    checks['sobre_rotacao_+6_empurrado'] = inter(plug(rot=P['turn'] + 6, dz=dz_push), ins)   # batente
    entry = [inter(plug(rot=0, dz=dz), ins) for dz in np.arange(dz_push, 6.0, 0.25)]
    checks['entrada_axial_max'] = max(entry)
    wrong = [inter(plug(rot=r, dz=1.0), ins) for r in (10, 30, 55, 90, 120, 200)]
    checks['entrada_noutra_orientacao_min'] = min(wrong)   # só entra numa orientação (espaçamento irregular)
    # mola: interferência do pilar com o fundo do furo do macho
    for d in (2.0,):
        b = tpu_boss(d)
        checks[f'pilar_d{d}_bloqueado'] = inter(plug(), b)
        checks[f'pilar_d{d}_empurrado'] = inter(plug(rot=P['turn'], dz=dz_push), b)
    res['checks_mm3'] = {k: round(v, 3) for k, v in checks.items()}
    res['dz_push'] = round(dz_push, 3); res['boss_top'] = boss_top; res['base_bottom_locked'] = base_bot
    print(json.dumps(res, indent=1))
    # ---------- ficheiros STL ----------
    out = os.path.join(HERE, 'out')
    # insert impresso com o lábio na mesa (sem pontes nem suportes)
    to_trimesh(ins.rotate([180, 0, 0]).translate([0, 0, Z['insert_top']])).export(os.path.join(out, 'insert_PETG_x4_labio-na-mesa.stl'))
    # macho de ensaio: ponta para baixo (face de apoio das patilhas fica como face superior)
    to_trimesh(plug(rot=0).translate([0, 0, -Z['lug_bottom_locked']])).export(os.path.join(out, 'macho_ensaio_PETG.stl'))
    # provete de TPU: placa 3 mm com 4 bossas e pilares Ø1,6/2,0/2,4/2,8 (marcas: 1 a 4 furos)
    plate = box(-44, 44, -13, 13, 0, 3.0)
    diams = [1.6, 2.0, 2.4, 2.8]
    for i, d in enumerate(diams):
        x = -30 + 20 * i
        plate = plate - cyl(P['boss_r'] - 0.01, -1, 3.01).translate([x, 0, 0]) + tpu_boss(d).translate([x, 0, 0])
        for k in range(i + 1): plate = plate - cyl(0.6, 2.2, 3.1, 24).translate([x - 3 + 2 * k, -11, 0])
    to_trimesh(plate).export(os.path.join(out, 'provete_TPU95A_pilares_1.6-2.0-2.4-2.8.stl'))
    res['pause_z_TPU'] = Z['insert_top']
    json.dump(res, open(os.path.join(HERE, 'lock_geom.json'), 'w'), indent=1)
    # vistas para o desenho: montagem bloqueada em corte
    asm = [('insert', ins), ('macho', plug(base=True)), ('tpu', tpu_boss(2.0))]
    for n, m in asm: to_trimesh(m).export(os.path.join(out, f'_asm_{n}.stl'))
