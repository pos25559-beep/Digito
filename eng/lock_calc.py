"""DÍGITO Lock v1 — dimensionamento da baioneta de bloqueio positivo (push-to-turn).
Unidades: mm, N, MPa, N·mm. Corre: python3 lock_calc.py  -> imprime tabela e grava lock_calc.json
"""
import math, json

# ---------------- materiais (valores de ficha técnica, peça impressa, direção XY) ----------------
MAT = {
    # E: módulo de tração; sy: tensão de cedência/rotura usada como limite; fonte na especificação
    'PETG':     dict(E=1500, sy=47.0),           # Prusament PETG: 47 MPa tração (ISO 527)
    'PETG_CF':  dict(E=3800, sy=45.0),           # PETG com fibra de carbono (frágil: usar 45)
    'PA12_SLS': dict(E=1700, sy=48.0),
    'TOUGH':    dict(E=2200, sy=46.0),           # resina "tough" SLA/MSLA
    'TPU95':    dict(E_lo=9.2, E_nom=15.0, E_hi=26.0, sy=8.6),  # Bambu 9,2 MPa XY; Ultimaker 26 MPa
}

# ---------------- parâmetros geométricos (os mesmos do script do Fusion) ----------------
P = dict(
    r_core=5.0,      # raio do núcleo do macho (Ø10)
    c_rad=0.20,      # folga radial FDM (0,10 em resina)
    lug_proj=1.6,    # saliência radial das patilhas
    lug_t=1.4,       # espessura axial das patilhas (1,4: o anel aguenta o momento de abuso)
    lug_deg=40.0,    # largura angular de cada patilha
    lug_pos=[0, 110, 240],   # posição angular (espaçamento irregular = uma só orientação)
    turn_deg=60.0,   # rotação de bloqueio
    lip_t=1.8,       # espessura do lábio do insert (garante que parte a patilha, não o insert)
    notch=0.40,      # profundidade do entalhe de bloqueio (sob o lábio)
    clr_ax=0.15,     # folga axial da patilha a rodar no canal
    preload=0.15,    # compressão da mola na posição bloqueada
    wall=1.4,        # parede do insert (mínimo, nas faces do hexágono)
    tpu_floor=0.6,   # TPU entre o telemóvel e o insert
    pillar_root=0.3, # cota da raiz do pilar-mola (acima do telemóvel)
    recess=1.0,      # profundidade do furo cego na ponta do macho, onde o pilar entra
    recess_d=3.4,    # diâmetro do furo cego (guia o topo do pilar)
    r_base=10.5,     # raio de apoio da base da pega sobre a bossa (alavanca contra o momento)
)
r_lug = P['r_core'] + P['lug_proj']                 # 6.6
r_bore = P['r_core'] + P['c_rad']                    # 5.2
r_ch = r_lug + P['c_rad']                            # 6.8 raio do canal
r_mid = 0.5 * (r_bore + r_lug)                       # raio médio de apoio
travel = P['notch'] + P['clr_ax']                    # curso para libertar a patilha do entalhe
h_ch = P['lug_t'] + P['notch'] + P['clr_ax']         # altura do canal (abaixo do lábio)
H_ins = P['lip_t'] + h_ch                            # altura do insert
z_top = P['tpu_floor'] + H_ins                       # cota do topo do insert acima do telemóvel
d_total = P['preload'] + travel                      # deformação máxima da mola
# cotas (z = 0 na face traseira do telemóvel)
Z = {}
Z['insert_bottom'] = P['tpu_floor']
Z['insert_top'] = z_top
Z['lip_bottom'] = z_top - P['lip_t']
Z['notch_roof'] = Z['lip_bottom'] + P['notch']
Z['lug_top_locked'] = Z['notch_roof']
Z['lug_bottom_locked'] = Z['lug_top_locked'] - P['lug_t']
Z['lug_top_pushed'] = Z['lip_bottom'] - P['clr_ax']
Z['lug_bottom_pushed'] = Z['lug_top_pushed'] - P['lug_t']
Z['recess_roof_locked'] = Z['lug_bottom_locked'] + P['recess']
Z['pillar_top_free'] = Z['recess_roof_locked'] + P['preload']
Z['pillar_root'] = P['pillar_root']
h_pillar = Z['pillar_top_free'] - Z['pillar_root']

out = {'z': {k: round(v, 3) for k, v in Z.items()}, 'geom': dict(h_pillar=round(h_pillar, 3), r_lug=r_lug, r_bore=r_bore, r_channel=r_ch, travel=round(travel, 3), h_channel=round(h_ch, 3),
                    H_insert=round(H_ins, 3), z_top_above_phone=round(z_top, 3), spring_max_defl=round(d_total, 3))}

# ---------------- cargas de projeto ----------------
m_phone = 0.234 + 0.045           # telemóvel mais pesado suportado + capa (kg)
g = 9.81
L = dict(
    pull_service=m_phone * g,                 # telemóvel pendurado num anel (N)
    pull_design=30.0,                          # puxão dinâmico (≈ 10× o peso)
    pull_ultimate_target=90.0,                 # alvo de rotura mínima (FS 3 sobre o de projeto)
    torque_service=0.24e3,                     # 20 N tangenciais a 12 mm (N·mm)
    moment_service=2.74 * 26 * 5,              # anel: peso do telemóvel a 26 mm da base, ×5 dinâmico (N·mm)
    moment_design=0.5e3,                       # momento de projeto no encaixe do anel (N·mm)
    moment_abuse=1.0e3,                        # abuso: 15 N laterais no topo do anel
    finger_push=6.0,                           # força normal de um dedo a segurar (N)
)
out['loads'] = {k: round(v, 2) for k, v in L.items()}

def lug_bending(F_total, mat, n_loaded=3):
    """patilha como consola radial: carga a meio da saliência"""
    b = 2 * math.pi * P['r_core'] * P['lug_deg'] / 360      # largura na raiz
    Z = b * P['lug_t'] ** 2 / 6
    M = (F_total / n_loaded) * (P['lug_proj'] / 2)
    s = M / Z
    tau = 1.5 * (F_total / n_loaded) / (b * P['lug_t'])
    return dict(b_root=round(b, 2), sigma=round(s, 1), tau=round(tau, 1), FS=round(MAT[mat]['sy'] / max(s, 1e-9), 2))

def lip_bending(F_total, mat='PETG', n_loaded=3):
    """lábio do insert sobre o entalhe: espessura restante lip_t - notch, largura do entalhe"""
    t = P['lip_t'] - P['notch']
    b = 2 * math.pi * r_mid * (P['lug_deg'] + 4) / 360
    Z = b * t ** 2 / 6
    M = (F_total / n_loaded) * (P['lug_proj'] / 2)
    s = M / Z
    return dict(t_net=round(t, 2), sigma=round(s, 1), FS=round(MAT[mat]['sy'] / s, 2))

def notch_bearing(T, mat='PETG'):
    """binário resistido pelas paredes dos entalhes (bloqueio positivo)"""
    A = P['notch'] * P['lug_proj']                 # área de contacto por patilha
    F = T / (3 * r_mid)
    p = F / A
    T_cap = 3 * r_mid * A * MAT[mat]['sy']
    return dict(A_per_lug=round(A, 2), pressure=round(p, 1), FS=round(MAT[mat]['sy'] / p, 2), T_capacity_Nm=round(T_cap / 1000, 2))

def ultimate_pull(mat_grip, mat_insert='PETG'):
    b = 2 * math.pi * P['r_core'] * P['lug_deg'] / 360
    F_lug = 3 * MAT[mat_grip]['sy'] * (b * P['lug_t'] ** 2 / 6) / (P['lug_proj'] / 2)
    t = P['lip_t'] - P['notch']; bl = 2 * math.pi * r_mid * (P['lug_deg'] + 4) / 360
    F_lip = 3 * MAT[mat_insert]['sy'] * (bl * t ** 2 / 6) / (P['lug_proj'] / 2)
    return dict(F_lug_break=round(F_lug), F_lip_break=round(F_lip), weak_link='patilha (pega)' if F_lug < F_lip else 'lábio (insert)',
                ratio_lip_over_lug=round(F_lip / F_lug, 2))

def moment_to_lug(M):
    """momento (anel) → tração na patilha mais carregada: alavanca entre patilha e bordo de apoio da base"""
    lever = r_mid + P['r_base']
    F_one = M / lever
    return dict(lever=round(lever, 1), F_on_one_lug=round(F_one, 1))

def pillar(d, E):
    A = math.pi * d ** 2 / 4
    h = h_pillar
    k = E * A / h
    return dict(h=round(h, 2), k=round(k, 1), F_lock=round(k * P['preload'], 1), F_release=round(k * d_total, 1), strain_max=round(d_total / h, 2))

res = {}
for mat in ['PETG_CF', 'PETG', 'PA12_SLS', 'TOUGH']:
    res[mat] = dict(design=lug_bending(L['pull_design'], mat), ultimate=ultimate_pull(mat))
out['lug'] = res
out['lip_design'] = lip_bending(L['pull_design'])
out['notch_service'] = notch_bearing(L['torque_service'])
for key in ('moment_service', 'moment_design', 'moment_abuse'):
    mm = moment_to_lug(L[key])
    mm['FS_lug'] = {m: round(MAT[m]['sy'] / (lug_bending(3 * mm['F_on_one_lug'], m)['sigma']), 2) for m in ['PETG_CF', 'PETG', 'PA12_SLS', 'TOUGH']}
    out[key] = mm
out['pillar'] = {f'd={d}': {f'E={E}': pillar(d, E) for E in (9.2, 15.0, 26.0)} for d in (1.6, 2.0, 2.4, 2.8)}

# diâmetro do pilar para F_libertar = 14 N, por módulo
out['pillar_d_for_14N'] = {f'E={E}': round(math.sqrt(4 * (14 / d_total) * h_pillar / E / math.pi), 2) for E in (9.2, 15.0, 26.0)}
# acidental: pressão de um dedo vs força para libertar
out['accidental'] = dict(finger_push=L['finger_push'], note='libertar exige F_release + rotação de 60° no sentido de abertura')

print(json.dumps(out, indent=1, ensure_ascii=False))
json.dump(out, open(__file__.replace('.py', '.json'), 'w'), indent=1, ensure_ascii=False)
