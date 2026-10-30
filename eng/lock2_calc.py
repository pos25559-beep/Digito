"""DÍGITO Lock v2 — diagnóstico do v1 e dimensionamento do trinco interior.
Unidades: mm, N, MPa, N·mm. Corre: python3 lock2_calc.py -> imprime e grava lock2_calc.json
"""
import json, math, random

random.seed(7)
V1 = json.load(open('lock_calc.json'))

# =====================================================================================
# A. DIAGNÓSTICO DO v1 (push-to-turn com pilar de TPU)
# =====================================================================================
# A1. Cadeia de tolerâncias do pré-esforço do pilar (preload nominal 0,15 mm).
#     preload = topo livre do pilar - teto do furo do macho com a patilha encostada ao teto do entalhe.
#     Cada cota impressa entra na cadeia; FDM 0,4/0,2: ±0,10 em XY é realista, em Z a cota é
#     arredondada à camada (0,2 mm) -> erro uniforme ±0,10 + desvio de processo.
chain = [  # (nome, sigma mm)  — sigma = desvio-padrão por cota
    ('raiz do pilar (chão de TPU)', 0.06),
    ('altura do pilar de TPU', 0.08),           # TPU: escorrimento e retração pior que PETG
    ('assento do insert no TPU', 0.06),
    ('altura do lábio no insert', 0.05),
    ('profundidade do entalhe (2 camadas)', 0.06),
    ('espessura da patilha', 0.05),
    ('profundidade do furo cego no macho', 0.06),
]
sig = math.sqrt(sum(s ** 2 for _, s in chain))
N = 200000
pre = [0.15 + sum(random.gauss(0, s) for _, s in chain) for _ in range(N)]
p_zero = sum(1 for p in pre if p <= 0) / N
p_half = sum(1 for p in pre if p <= 0.075) / N
# fluência / deformação permanente do TPU 95A sob compressão estática (ordem de grandeza da literatura:
# 20 a 40 % de compression set; usamos 30 % do pré-esforço perdido ao fim de semanas a 30-40 °C no bolso)
set_loss = 0.30
pre_aged = [p - set_loss * max(p, 0) for p in pre]
p_zero_aged = sum(1 for p in pre_aged if p <= 0.02) / N
A1 = dict(sigma_rss=round(sig, 3), worst_case=round(sum(3 * s for _, s in chain), 2),
          P_preload_le_0=round(p_zero, 3), P_preload_le_half=round(p_half, 3),
          P_preload_quase_0_apos_fluencia=round(p_zero_aged, 3),
          nota='pré-esforço nominal 0,15 mm é menor que uma camada (0,2 mm) e que 1 sigma da cadeia')

# A2. A força que solta é a mesma que o utilizador faz a segurar.
#     Força normal de um dedo a segurar um telemóvel: 2–10 N; com tremor ou pouca sensibilidade,
#     as pessoas tendem a apertar mais (até ~2×). O pilar Ø2 dá 8–24 N para soltar (E 9–26 MPa).
F_rel = V1['pillar']['d=2.0']
A2 = dict(F_soltar_N={k: v['F_release'] for k, v in F_rel.items()}, F_dedo_normal_N='2–10', F_dedo_com_tremor_N='até ~20',
          conclusao='com o TPU mais macio, apertar a pega com força normal já faz o curso de libertação')
# A3. Paradoxo da tampa de segurança: subir a mola para 40 N tornaria a pega difícil de pôr e tirar
#     para quem tem pouca força (o mesmo problema das tampas "push & turn" de medicamentos).

# =====================================================================================
# B. LOCK v2 — trinco interior (bloqueio positivo, independente da força axial)
# =====================================================================================
PETG = dict(E=1500.0, sy=47.0)        # insert e braços (ficha Prusament, peça impressa XY)
PETG_CF = dict(E=3800.0, sy=45.0)     # pega
eps_ok = 0.6 * PETG['sy'] / PETG['E']  # 60 % da deformação de cedência para snap repetido (~1,9 %)
P2 = dict(
    r_core=5.0, c_rad=0.20, lug_proj=1.6, lug_t=1.4, lug_deg=40.0, lug_pos=[0, 110, 240], turn=60.0, lip_t=1.8,
    push=0.30,            # curso axial máximo (batente rígido da base na face do insert)
    tip_gap=0.40,         # ponta do macho acima do telemóvel com a pega encostada ao lábio
    band_h=1.70,          # altura da banda dos braços (impressos a partir da mesa, z = 0)
    arm_ri=5.15,          # raio interior do braço (folga 0,15 ao colar do macho)
    arm_t=1.20,           # espessura radial do braço (3 perímetros de 0,4)
    slit=0.85,            # folga atrás do braço (>= deflexão de libertação)
    ring_t=0.80,          # anel exterior da banda
    io_r=8.0,             # raio exterior do insert (cilindro + 3 chavetas)
    key_h=0.6, key_w=1.6, boss_r=9.4,
    tooth_e=0.70,         # saliência do dente do colar sobre o raio interior do braço
    tooth_deg=18.0,       # largura angular do dente
    teeth=[110, 270],     # posição dos dentes no macho (110 sob a patilha; 270 com ranhura própria no lábio)
    arm_lead=22.0,        # o braço começa 22° antes da posição bloqueada: rampa 8° + lomba 4° + meio dente e folga
    arm_span=92.0,        # comprimento angular do braço
    ramp_deg=8.0,         # rampa na ponta do braço
    undercut=5.0,         # contra-saída da face de retenção (o dente puxa o braço para dentro)
    stop_ring_gap=0.30,   # folga do anel de batente da base à face do insert
    bump_n=4, bump_d=0.8, bump_h=0.40, bump_int=0.10,  # pontos anti-folga em TPU
)
r_bore = P2['r_core'] + P2['c_rad']
r_lug = P2['r_core'] + P2['lug_proj']
r_tooth = P2['arm_ri'] + P2['tooth_e']
r_arm_mid = P2['arm_ri'] + P2['arm_t'] / 2
# cotas (z = 0 face do telemóvel; pega encostada ao lábio)
Zs = {}
Zs['insert_bottom'] = 0.0
Zs['band_top'] = P2['band_h']
Zs['plug_tip'] = P2['tip_gap']
Zs['lug_bottom'] = Zs['plug_tip'] + 1.75
Zs['lug_top'] = Zs['lug_bottom'] + P2['lug_t']
Zs['lip_bottom'] = Zs['lug_top']
Zs['insert_top'] = Zs['lip_bottom'] + P2['lip_t']
Zs['boss_top'] = Zs['insert_top'] + 0.6
Zs['lug_bottom_pushed'] = Zs['lug_bottom'] - P2['push']
Zs['plug_tip_pushed'] = Zs['plug_tip'] - P2['push']
overlap_seated = Zs['band_top'] - Zs['plug_tip']
overlap_pushed = Zs['band_top'] - Zs['plug_tip_pushed']
gap_lug_arm = Zs['lug_bottom_pushed'] - Zs['band_top']

# B1. braço (consola curva em PETG, flexão no plano das camadas)
def arm(L_deg, delta, t=P2['arm_t'], h=P2['band_h']):
    L = math.radians(L_deg) * r_arm_mid
    I = h * t ** 3 / 12
    eps = 1.5 * t * delta / L ** 2
    F = 3 * PETG['E'] * I * delta / L ** 3
    return dict(L_mm=round(L, 2), eps_pct=round(100 * eps, 2), eps_ok_pct=round(100 * eps_ok, 2), F_N=round(F, 2), ok=eps <= eps_ok)

d_lock = P2['tooth_e'] + 0.15        # deflexão a passar o dente (engate + folga)
d_rel = d_lock + 0.05                 # o pino de libertação atua junto ao bolso (ranhura em V), não na ponta
B1 = dict(trancar=arm(P2['arm_span'], d_lock), libertar=arm(P2['arm_span'], d_rel))

# B2. binário de retenção (sentido de abrir) — face reta: governa o esmagamento da face de contacto
s_bear = 55.0                          # MPa, compressão admissível PETG/PETG-CF impresso
A_face = P2['tooth_e'] * overlap_seated
F_tooth = A_face * s_bear
T_hold_each = F_tooth * (P2['arm_ri'] + P2['tooth_e'] / 2)
w_tooth = math.radians(P2['tooth_deg']) * P2['r_core']
F_shear = w_tooth * overlap_seated * 0.6 * PETG_CF['sy']
A_arm = P2['arm_t'] * P2['band_h']
B2 = dict(A_face_mm2=round(A_face, 2), F_esmagamento_N=round(F_tooth, 1), F_corte_dente_N=round(F_shear, 1),
          sigma_tracao_braco_MPa=round(F_tooth / A_arm, 1), T_por_trinco_Nm=round(T_hold_each / 1000, 3),
          T_total_Nm=round(2 * T_hold_each / 1000, 3), T_servico_Nm=V1['loads']['torque_service'] / 1000,
          FS=round(2 * T_hold_each / V1['loads']['torque_service'], 2), elo_fraco='dente do colar (pega), não o braço (capa)')

# B3. binário para trancar (só a rampa do braço) — fácil para quem tem pouca força
mu = 0.3
ramp = math.atan((d_lock) / (math.radians(P2['ramp_deg']) * P2['arm_ri']))
Fr = B1['trancar']['F_N']
T_lock = 2 * Fr * math.tan(ramp + math.atan(mu)) * P2['arm_ri']
B3 = dict(rampa_graus=round(math.degrees(ramp), 1), T_trancar_Nmm=round(T_lock, 1), nota='+ atrito das patilhas; ordem de 0,01 N·m')

# B4. pontos anti-folga (TPU): força que encosta as patilhas ao lábio. Fluência só traz folga de volta,
#     não afeta a segurança (essa está no trinco).
A_b = P2['bump_n'] * math.pi * P2['bump_d'] ** 2 / 4
B4 = {f'E={E}': round(E * (P2['bump_int'] / P2['bump_h']) * A_b, 1) for E in (9.2, 15.0, 26.0)}

out = dict(
    v1_diagnostico=dict(A1_tolerancias=A1, A2_soltar_vs_dedo=A2),
    v2=dict(params=P2, z=Zs, r=dict(bore=r_bore, lug=r_lug, tooth=round(r_tooth, 2), arm_mid=round(r_arm_mid, 2)),
            sobreposicao=dict(seated=round(overlap_seated, 2), pushed=round(overlap_pushed, 2), folga_patilha_braco=round(gap_lug_arm, 2)),
            B1_braco=B1, B2_retencao=B2, B3_trancar=B3, B4_antifolga_N=B4,
            altura_vs_v1=round(Zs['boss_top'] - V1['z']['insert_top'] - 0.6, 2)),
)
print(json.dumps(out, indent=1, ensure_ascii=False))
json.dump(out, open('lock2_calc.json', 'w'), indent=1, ensure_ascii=False)
