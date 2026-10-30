"""DÍGITO Lock v2 — geometria sólida (manifold3d), verificação cinemática e STL de ensaio.
z = 0 na face do telemóvel; ângulos em graus, anti-horário visto de fora (+z). Rodar para trancar: +60°.
"""
import json, math, os
import numpy as np
import manifold3d as mf
from lock_geom import cyl, sector, box, vol, to_trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, 'lock2_calc.json')))['v2']
P = C['params']; Z = C['z']
r_bore = P['r_core'] + P['c_rad']; r_lug = P['r_core'] + P['lug_proj']; r_ch = r_lug + P['c_rad']
r_tooth = P['arm_ri'] + P['tooth_e']; r_arm_o = P['arm_ri'] + P['arm_t']; r_ring_i = r_arm_o + P['slit']

def wedge_poly(points, z0, z1):
    return mf.Manifold.extrude(mf.CrossSection([points]), z1 - z0).translate([0, 0, z0])

def polar(r, a): return (r * math.cos(math.radians(a)), r * math.sin(math.radians(a)))

def arm_solid(lock_angle, released=0.0):
    """braço do trinco (no insert). Ponta (livre) em lock-arm_lead, raiz em lock-arm_lead+arm_span.
    released: deslocamento radial do braço (simula o braço afastado pelo pino)."""
    a_tip = lock_angle - P['arm_lead']; a_root = a_tip + P['arm_span']
    ri = P['arm_ri'] + released; ro = r_arm_o + released
    n = 96; pts = []
    for i in range(n + 1):
        a = a_tip + (a_root - a_tip) * i / n
        pts.append(polar(ro, a))
    for i in range(n + 1):
        a = a_root - (a_root - a_tip) * i / n
        # rampa na ponta: o raio interior abre até r_tooth+0.1 nos primeiros ramp_deg graus
        k = min(1.0, (a - a_tip) / P['ramp_deg'])
        rr = (r_tooth + 0.10) * (1 - k) + ri * k if released == 0 else ri
        pts.append(polar(rr, a))
    m = wedge_poly(pts, 0, P['band_h'])
    # bolso para o dente na posição bloqueada (com contra-saída na face de retenção)
    hw = P['tooth_deg'] / 2 + 1.0
    pocket = sector(ri - 0.5, r_tooth + 0.15 + released, lock_angle - hw, lock_angle + hw, -0.1, P['band_h'] + 0.1)
    m = m - pocket
    # ranhura em V para o pino de libertação (logo a seguir ao bolso, do lado da raiz), aberta para o telemóvel
    v_a = lock_angle + hw + 3
    vpts = [polar(ri - 0.01, v_a - 3), polar(ri + 0.9, v_a - 3), polar(ri + 0.9, v_a + 3), polar(ri - 0.01, v_a + 3)]
    vcut = mf.Manifold.extrude(mf.CrossSection([vpts]), 0.8).translate([0, 0, -0.01])
    # chanfro 45°: profundidade radial cai de 0,9 a 0 entre z=0 e z=0,8
    vcut = vcut ^ mf.Manifold.revolve(mf.CrossSection([[(ri - 0.02, -0.02), (ri + 0.9, -0.02), (ri - 0.02, 0.9)]]), 128)
    return m - vcut, a_tip, a_root

def insert(released=0.0):
    z0, z1 = Z['insert_bottom'], Z['insert_top']
    m = cyl(P['io_r'], z0, z1)
    for k in range(3):   # chavetas anti-rotação no TPU (uma mais larga = orientação única)
        a = 90 + 120 * k; w = P['key_w'] * (1.4 if k == 0 else 1.0)
        m = m + box(-w / 2, w / 2, P['io_r'] - 0.3, P['io_r'] + P['key_h'], z0, z1).rotate([0, 0, a - 90])
    m = m - cyl(r_bore, z0 - 1, z1 + 1)                              # furo do lábio
    m = m - cyl(r_ch, Z['band_top'], Z['lip_bottom'])                 # canal das patilhas
    m = m - cyl(r_ring_i, z0 - 1, Z['band_top'] + 0.001)              # banda: tudo livre até ao anel exterior
    for a in P['lug_pos']:                                            # ranhuras de entrada das patilhas
        h = P['lug_deg'] / 2 + 2.0
        m = m - sector(r_bore - 0.5, r_ch + 0.1, a - h, a + h, Z['lip_bottom'] - 0.01, z1 + 1)
    for t in P['teeth']:                                              # ranhura do dente no lábio (se não estiver sob uma patilha)
        if not any(abs(((t - a + 180) % 360) - 180) < P['lug_deg'] / 2 for a in P['lug_pos']):
            h = P['tooth_deg'] / 2 + 2.0
            m = m - sector(r_bore - 0.5, r_tooth + 0.2, t - h, t + h, Z['lip_bottom'] - 0.01, z1 + 1)
    for a in P['lug_pos']:                                            # batentes (fim dos 60°), acima da banda
        s0 = a + P['turn'] + P['lug_deg'] / 2 + 1.5
        m = m + sector(r_lug - 0.6, r_ch + 0.5, s0, s0 + 5.0, Z['band_top'] + 0.2, Z['lip_bottom'] + 0.3)
    arms = []
    for t in P['teeth']:
        arm, a_tip, a_root = arm_solid(t + P['turn'], released)
        # raiz: ponte radial do braço ao anel exterior (6° de largura)
        root = sector(P['arm_ri'] + released, r_ring_i + 0.3, a_root - 6, a_root, 0, P['band_h'])
        m = m + arm + root
        arms.append((round(a_tip, 1), round(a_root, 1)))
    return m, arms

def plug(rot=0.0, dz=0.0, test_base=True):
    """macho (pega) na orientação de entrada (rot=0); bloqueado em rot=turn. dz<0 empurra para o telemóvel."""
    tip = Z['plug_tip']; lb = Z['lug_bottom']; lt = Z['lug_top']
    base_bot = Z['insert_top'] + P['stop_ring_gap']
    m = cyl(P['r_core'], tip, base_bot + 0.01)
    for a in P['lug_pos']:
        lug = sector(P['r_core'] - 0.6, r_lug, a - P['lug_deg'] / 2, a + P['lug_deg'] / 2, lb, lt)
        # chanfro 45° na face de baixo (não trabalha): consola de impressão ≤ 0,6 mm
        cham = mf.Manifold.revolve(mf.CrossSection([[(P['r_core'] + 0.6, lb - 0.01), (r_lug + 0.01, lb - 0.01), (r_lug + 0.01, lb + 1.0)]]), 128)
        m = m + (lug - cham)
    for t in P['teeth']:   # dentes do colar: face de retenção radial (com contra-saída), face da frente também reta
        m = m + sector(P['r_core'] - 0.3, r_tooth, t - P['tooth_deg'] / 2, t + P['tooth_deg'] / 2, tip, lb)
    # chanfro de entrada na ponta
    m = m - mf.Manifold.revolve(mf.CrossSection([[(P['r_core'] - 0.4, tip - 0.01), (r_tooth + 1, tip - 0.01), (r_tooth + 1, tip + 0.3 + (r_tooth + 1 - P['r_core'] + 0.4))]]), 128) * 0 if False else m
    if test_base:
        cone = mf.Manifold.cylinder(6.0, P['r_core'], 11.0, 128).translate([0, 0, base_bot])
        top = cyl(11.0, base_bot + 6.0, base_bot + 9.0)
        handle = box(-14, 14, -3, 3, base_bot + 9.0, base_bot + 15.0)
        hole = mf.Manifold.cylinder(8, 2.0, 2.0, 48).rotate([90, 0, 0]).translate([0, 4, base_bot + 12.0])
        m = m + cone + top + (handle - hole.translate([10, 0, 0]) - hole.translate([-10, 0, 0]))
    return m.rotate([0, 0, rot]).translate([0, 0, dz])

def inter(a, b): return vol(a ^ b)

if __name__ == '__main__':
    ins, arms = insert()
    ins_rel, _ = insert(released=P['tooth_e'] + 0.2)
    turn = P['turn']; push = -P['push']
    ck = {}
    ck['bloqueado_encostado'] = inter(plug(turn), ins)
    ck['bloqueado_empurrado'] = inter(plug(turn, push), ins)
    ck['bloqueado_puxado_0.05 (lábio segura)'] = inter(plug(turn, 0.05), ins)
    ck['entrada_axial_max'] = max(inter(plug(0, dz), ins) for dz in np.arange(0, 7.0, 0.25))
    ck['entrada_noutra_orientacao_min'] = min(inter(plug(r, 2.5), ins) for r in (15, 40, 90, 150, 200, 300))
    # rotação de trancar: só os braços devem tocar (deflexão elástica), e só no fim
    path = []
    for r in np.arange(0, turn + 0.01, 2.0):
        path.append((round(float(r), 1), round(inter(plug(r), ins), 3), round(inter(plug(r, push), ins), 3)))
    ck['trancar_caminho (graus, encostado, empurrado)'] = [p for p in path if p[1] > 0 or p[2] > 0]
    ck['abrir_-3_encostado'] = inter(plug(turn - 3), ins)
    ck['abrir_-3_empurrado'] = inter(plug(turn - 3, push), ins)
    ck['sobre_rotacao_+4'] = inter(plug(turn + 4), ins)
    # com os braços afastados (pino de libertação): caminho de volta livre?
    ck['libertado_caminho_max'] = max(inter(plug(r), ins_rel) for r in np.arange(0, turn - 1, 2.0))
    ck['libertado_saida_axial_max'] = max(inter(plug(0, dz), ins_rel) for dz in np.arange(0, 7.0, 0.25))
    # deflexão radial exigida ao braço = sobreposição do dente com o braço indeformado
    ck['deflexao_exigida_mm'] = round(r_tooth + 0.0 - P['arm_ri'], 2)
    res = dict(insert_vol_mm3=round(vol(ins), 1), arms_tip_root_deg=arms, checks=ck)
    print(json.dumps(res, indent=1, ensure_ascii=False))
    json.dump(res, open(os.path.join(HERE, 'lock2_geom.json'), 'w'), indent=1, ensure_ascii=False)
    out = os.path.join(HERE, 'out', 'v2'); os.makedirs(out, exist_ok=True)
    # insert: imprime como na capa, base (braços) na mesa
    to_trimesh(ins).export(os.path.join(out, 'insert_v2_PETG_bracos-na-mesa.stl'))
    # macho de ensaio: ponta (colar com dentes) na mesa
    to_trimesh(plug(0).translate([0, 0, -Z['plug_tip']])).export(os.path.join(out, 'macho_v2_ensaio_PETG_ponta-na-mesa.stl'))
    # bloco de ensaio que simula a capa: o insert v2 num bloco de 24x24 em TPU (ou PETG para o 1.º teste)
    blk = box(-12, 12, -12, 12, 0, Z['boss_top'] - 0.6) - cyl(P['io_r'] + P['key_h'] + 0.1, -1, 20)
    to_trimesh(blk).export(os.path.join(out, 'bloco_capa_ensaio_TPU.stl'))
    print('stl ok')
