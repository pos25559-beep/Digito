"""DÍGITO Lock v3 — encaixe rente às costas da capa (sem bossa).
Ideia: os trincos deixam de estar numa banda própria por baixo das patilhas. Passam a estar no MESMO plano
das patilhas, por fora do raio delas, e o lábio contínuo é substituído por 3 abas só onde as patilhas
ficam bloqueadas. Por cima dos braços não há lábio, por isso imprimem-se a partir da mesa sem pontes.
z = 0 face do telemóvel (mesa de impressão da capa); ângulos em graus, anti-horário visto de fora; trancar = +60°.
Corre: python3 lock3_geom.py -> lock3.json + out/v3/*.stl
"""
import json, math, os
import numpy as np
import manifold3d as mf
from lock_geom import cyl, sector, box, vol, to_trimesh

HERE = os.path.dirname(os.path.abspath(__file__))
P = dict(
    r_core=5.0, c_rad=0.20, lug_proj=1.6, lug_t=1.4, lug_deg=40.0, lug_pos=[0, 115, 240], turn=60.0,
    tip=0.30,        # ponta do macho (fundo das patilhas) acima do telemóvel, pega encostada às abas
    push=0.15,       # curso a empurrar até a base da pega assentar no topo do insert (batente rígido)
    tab_t=1.50,      # espessura das abas (o lábio passa a 3 abas de 40°, só nas posições bloqueadas)
    stop_deg=5.0,    # batente de sobre-rotação, colado à aba
    arm_t=1.00,      # espessura radial do braço
    arm_h=1.55,      # altura do braço (da mesa até 0,15 abaixo das abas)
    slit=0.80,       # folga atrás do braço
    ring_t=0.60,     # anel exterior do insert
    tooth_in=0.70,   # quanto o dente entra para dentro do raio das patilhas (engate)
    tooth_deg=10.0,  # largura angular do dente
    tooth_clr=1.5,   # folga angular entre o dente e a face de trás da patilha bloqueada
    ramp_deg=5.0,    # rampa do lado de onde chega a patilha
    end_gap=0.6,     # folga (mm) entre a ponta livre do braço e a parede seguinte
    key_n=3, key_w=2.0, key_out=0.7,  # chavetas com contra-saída, presas no TPU
    key_tabs=[(138.5, 155.0), (201.0, 218.0)],  # aba-chave sobre o canal (r 5,2-6,6), presa de lado à aba seguinte: bloqueia a entrada rodada 120°/240°
)
r_bore = P['r_core'] + P['c_rad']                 # 5.2
r_lug = P['r_core'] + P['lug_proj']               # 6.6
r_ch = r_lug + P['c_rad']                         # 6.8 (raio interior dos braços)
r_arm_o = r_ch + P['arm_t']                       # 7.8
r_ring_i = r_arm_o + P['slit']                    # 8.6
r_out = r_ring_i + P['ring_t']                    # 9.2
r_tooth = r_lug - P['tooth_in'] + P['c_rad'] * 0  # 5.9
Z = dict(lug_bottom=P['tip'], lug_top=P['tip'] + P['lug_t'])
Z['tab_bottom'] = Z['lug_top']; Z['tab_top'] = Z['tab_bottom'] + P['tab_t']; Z['insert_top'] = Z['tab_top']
H = Z['insert_top']
half = P['lug_deg'] / 2

def polar(r, a): return (r * math.cos(math.radians(a)), r * math.sin(math.radians(a)))
def poly(pts, z0, z1):
    a = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if a < 0: pts = pts[::-1]          # garante sentido anti-horário (área positiva)
    return mf.Manifold.extrude(mf.CrossSection([pts]), z1 - z0).translate([0, 0, z0])

def solid_sectors():
    """setores maciços (aba + batente) por patilha: [E+turn-half, E+turn+half+1.5+stop]"""
    out = []
    for E in P['lug_pos']:
        a0 = E + P['turn'] - half; a1 = E + P['turn'] + half + 1.5 + P['stop_deg']
        out.append((a0, a1))
    return out

def arm_solid(E, prev_end, released=0.0):
    """braço para a patilha que entra em E: da parede anterior até ao dente (ponta livre)"""
    t_hi = E + P['turn'] - half - P['tooth_clr']          # face reta do dente (encosta à face de trás da patilha)
    t_lo = t_hi - P['tooth_deg']
    gap_deg = math.degrees(P['end_gap'] / ((r_ch + r_arm_o) / 2))
    a_root = prev_end; a_tip = t_hi
    ri, ro = r_ch + released, r_arm_o + released
    n = 120; pts = []
    for i in range(n + 1):
        a = a_root + (a_tip - a_root) * i / n; pts.append(polar(ro, a))
    for i in range(n + 1):
        a = a_tip - (a_tip - a_root) * i / n
        if a >= t_lo and released == 0:   # dente: rampa de t_lo a t_lo+ramp, depois plano até t_hi
            k = min(1.0, (a - t_lo) / P['ramp_deg']); rr = ri * (1 - k) + r_tooth * k
        else:
            rr = ri
        pts.append(polar(rr, a))
    m = poly(pts, 0, P['arm_h'])
    # chanfro de libertação na aresta de baixo do dente (o pino entra pelo lado do telemóvel e empurra para fora)
    if released == 0:
        v = mf.Manifold.revolve(mf.CrossSection([[(r_tooth - 0.02, -0.02), (r_tooth + 0.8, -0.02), (r_tooth - 0.02, 0.82)]]), 256)
        m = m - (v ^ sector(r_tooth - 0.1, ri + 0.1, t_hi - 4.0, t_hi + 0.1, -0.1, 1.0))
    return m, (round(a_root, 1), round(a_tip, 1), round(a_tip - a_root, 1)), gap_deg

def insert(released=0.0):
    m = cyl(r_out, 0, H)
    for k in range(P['key_n']):   # chavetas com contra-saída (mais largas em baixo): o TPU por cima segura o insert
        a = 57.5 + 120 * k
        kp = [(r_out - 0.3, -P['key_w'] / 2 - 0.4), (r_out + P['key_out'], -P['key_w'] / 2 - 0.4), (r_out + P['key_out'], P['key_w'] / 2 + 0.4), (r_out - 0.3, P['key_w'] / 2 + 0.4)]
        lo = poly(kp, 0, 1.2).rotate([0, 0, a])
        kp2 = [(r_out - 0.3, -P['key_w'] / 2), (r_out + P['key_out'], -P['key_w'] / 2), (r_out + P['key_out'], P['key_w'] / 2), (r_out - 0.3, P['key_w'] / 2)]
        hi = poly(kp2, 1.2, H).rotate([0, 0, a])
        m = m + lo + hi
    # vazio interior: tudo até ao anel exterior, em toda a altura
    m = m - cyl(r_ring_i, -1, H + 1)
    sol = solid_sectors()
    for (a0, a1) in sol:
        # parede maciça por baixo da aba (canal r_ch .. anel) e aba por cima (furo r_bore .. anel)
        m = m + sector(r_ch, r_ring_i + 0.01, a0, a1, 0, Z['tab_bottom'])
        m = m + sector(r_bore, r_ring_i + 0.01, a0, a0 + P['lug_deg'] + 0.0, Z['tab_bottom'], H)
        m = m + sector(r_bore, r_ring_i + 0.01, a0 + P['lug_deg'], a1, Z['tab_bottom'], H)
        # batente: entra no canal até r_lug - 0.6, só no troço do batente
        m = m + sector(r_lug - 0.6, r_ch + 0.01, a1 - P['stop_deg'], a1, 0, Z['tab_bottom'])
    for ka, kb in P['key_tabs']:
        m = m + sector(r_bore, r_lug, ka - 0.5, kb + 0.5, Z['tab_bottom'] + 0.15, H)
    arms = []
    ends = {E: (E + P['turn'] + half + 1.5 + P['stop_deg']) for E in P['lug_pos']}
    order = sorted(P['lug_pos'])
    for i, E in enumerate(order):
        prevE = order[i - 1]
        prev_end = ends[prevE] if prevE < E else ends[prevE] - 360
        arm, info, gdeg = arm_solid(E, prev_end, released)
        root = sector(r_ch + released, r_ring_i + 0.01, prev_end - 0.01, prev_end + 3.0, 0, P['arm_h'])
        m = m + arm + root
        arms.append(info)
    return m, arms

def plug(rot=0.0, dz=0.0, test_base=True):
    zb = Z['lug_bottom']; zt = Z['lug_top']
    base_bot = H + P['push']
    m = cyl(P['r_core'], zb, base_bot + 0.01)
    for a in P['lug_pos']:
        lug = sector(P['r_core'] - 0.6, r_lug, a - half, a + half, zb, zt)
        # canto da frente chanfrado em planta (ajuda a afastar o dente); face de trás reta
        cut = poly([polar(r_lug - 0.6, a + half + 0.01), polar(r_lug + 0.5, a + half + 0.01), polar(r_lug + 0.5, a + half - 5.0)], zb - 0.1, zt + 0.1)
        m = m + (lug - cut)
    # nervura-guia (à altura das abas): bate numa aba em qualquer outra orientação de entrada
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
    ins_rel, _ = insert(released=P['tooth_in'] + 0.25)
    T = P['turn']; push = -P['push']
    ck = {}
    ck['bloqueado_encostado'] = inter(plug(T), ins)
    ck['bloqueado_empurrado'] = inter(plug(T, push), ins)
    ck['bloqueado_puxado_0.05 (abas seguram)'] = inter(plug(T, 0.05), ins)
    ck['entrada_axial_max'] = max(inter(plug(0, dz), ins) for dz in np.arange(0, 6.0, 0.25))
    wrong = [(r, max(inter(plug(r, dz), ins) for dz in np.arange(0.0, 3.6, 0.3))) for r in range(5, 360, 5) if 6 < r < 354]
    ck['entrada_noutra_orientacao_min'] = min(v for _, v in wrong)
    ck['orientacoes_que_entram'] = [r for r, v in wrong if v < 1e-6]
    path = [(round(float(r), 1), round(inter(plug(r), ins), 3), round(inter(plug(r, push), ins), 3)) for r in np.arange(0, T + 0.01, 2.0)]
    ck['trancar_caminho (graus, encostado, empurrado)'] = [p for p in path if p[1] > 0 or p[2] > 0]
    ck['abrir_-3_encostado'] = inter(plug(T - 3), ins)
    ck['abrir_-3_empurrado'] = inter(plug(T - 3, push), ins)
    ck['sobre_rotacao_+4'] = inter(plug(T + 4), ins)
    ck['libertado_caminho_max'] = max(inter(plug(r), ins_rel) for r in np.arange(0, T - 1, 2.0))
    ck['libertado_saida_axial_max'] = max(inter(plug(0, dz), ins_rel) for dz in np.arange(0, 6.0, 0.25))
    res = dict(P=P, z=Z, raios=dict(bore=r_bore, lug=r_lug, canal=r_ch, braco_ext=r_arm_o, anel_int=r_ring_i, exterior=r_out, chaveta=r_out + P['key_out'], dente=r_tooth),
               insert_vol_mm3=round(vol(ins), 1), bracos_raiz_ponta_comprimento_graus=arms, checks=ck)
    print(json.dumps(res, indent=1, ensure_ascii=False))
    json.dump(res, open(os.path.join(HERE, 'lock3.json'), 'w'), indent=1, ensure_ascii=False)
    out = os.path.join(HERE, 'out', 'v3'); os.makedirs(out, exist_ok=True)
    to_trimesh(ins).export(os.path.join(out, 'insert_v3_PETG_base-na-mesa.stl'))
    to_trimesh(plug(0).translate([0, 0, -Z['lug_bottom']])).export(os.path.join(out, 'macho_v3_ensaio_ponta-na-mesa.stl'))
    blk = box(-13, 13, -13, 13, 0, H) - cyl(r_out + P['key_out'] + 0.1, -1, 10)
    to_trimesh(blk).export(os.path.join(out, 'placa_costas_ensaio_TPU_3.2mm.stl'))
    print('stl ok')
