"""DÍGITO Lock v3 — contas (mesmos critérios do v2) + varredura fina de orientações + chave de libertação."""
import json, math, os
import numpy as np
from lock3_geom import P, Z, H, insert, plug, inter, r_lug, r_tooth, r_ch, r_arm_o, r_out, half, sector, cyl, box, to_trimesh
import manifold3d as mf
HERE = os.path.dirname(os.path.abspath(__file__))
V2 = json.load(open(os.path.join(HERE, 'lock2_calc.json')))['v2']
PETG = dict(E=1500.0, sy=47.0); s_bear = 55.0
eps_ok = 0.6 * PETG['sy'] / PETG['E']
geo = json.load(open(os.path.join(HERE, 'lock3.json')))
arms_deg = [a[2] for a in geo['bracos_raiz_ponta_comprimento_graus']]
r_mid = (r_ch + r_arm_o) / 2
def arm(L_deg, d):
    L = math.radians(L_deg) * r_mid; I = P['arm_h'] * P['arm_t'] ** 3 / 12
    return dict(L_mm=round(L, 2), eps_pct=round(150 * P['arm_t'] * d / L ** 2, 2), F_N=round(3 * PETG['E'] * I * d / L ** 3, 2))
d_lock = P['tooth_in'] + 0.10; d_rel = d_lock + 0.15
ov_seated = P['arm_h'] - Z['lug_bottom']; ov_pushed = P['arm_h'] - (Z['lug_bottom'] - P['push'])
A = P['tooth_in'] * min(ov_seated, ov_pushed); F = A * s_bear; r_c = r_lug - P['tooth_in'] / 2
T_each = F * r_c / 1000
# abas: mesma fórmula do v1 (consola, largura = arco da patilha + 4°), espessura cheia (sem entalhe)
b_tab = 2 * math.pi * ((5.2 + 6.6) / 2) * (P['lug_deg'] + 4) / 360
F_tab = 3 * PETG['sy'] * (b_tab * P['tab_t'] ** 2 / 6) / (P['lug_proj'] / 2)
out = dict(
    altura_costas_mm=H, base_da_pega_z=round(H + P['push'], 2),
    bracos={f'{d:.0f}°': dict(trancar=arm(d, d_lock), libertar=arm(d, d_rel)) for d in sorted(arms_deg)}, eps_ok_pct=round(100 * eps_ok, 2),
    retencao=dict(sobreposicao_mm=round(min(ov_seated, ov_pushed), 2), area_mm2=round(A, 2), F_por_dente_N=round(F, 1), T_por_dente_Nm=round(T_each, 3),
                  T_total_3_dentes_Nm=round(3 * T_each, 2), T_v2_Nm=V2['B2_retencao']['T_total_Nm'], sigma_braco_MPa=round(F / (P['arm_t'] * P['arm_h']), 1)),
    puxar=dict(patilhas_N='~190 (iguais ao v2: 3 × 40°, 1,6 × 1,4, PETG-CF)', abas_rotura_N=round(F_tab), elo_fraco='patilhas (pega)' if F_tab > 192 else 'abas (capa)'),
    envolvente=dict(r_insert=r_out, r_chavetas=round(r_out + P['key_out'], 2), entre_centros_min_mm=round(2 * r_out + 1.0, 1), v2_entre_centros_mm=round(2 * 9.4 + 0.6, 1)),
)
# varredura fina de orientações nas zonas críticas
ins, _ = insert()
fine = []
for r in list(range(4, 16)) + list(range(100, 141)) + list(range(220, 261)):
    v = max(inter(plug(r, dz, test_base=False), ins) for dz in np.arange(0.0, 3.6, 0.3))
    if v < 1e-6: fine.append(r)
out['orientacoes_erradas_que_entram_passo_1grau'] = fine
print(json.dumps(out, indent=1, ensure_ascii=False))
json.dump(out, open(os.path.join(HERE, 'lock3_calc.json'), 'w'), indent=1, ensure_ascii=False)
# chave de libertação: disco com 3 pinos (entram pelo lado do telemóvel, no chanfro de cada dente) + pega
pins = []
for E in P['lug_pos']:
    a = E + P['turn'] - half - P['tooth_clr'] - 2.5
    x, y = (r_tooth + 0.35) * math.cos(math.radians(a)), (r_tooth + 0.35) * math.sin(math.radians(a))
    pin = mf.Manifold.cylinder(1.6, 0.6, 0.6, 32).translate([x, y, 0]) + mf.Manifold.cylinder(0.5, 0.6, 0.15, 32).translate([x, y, 1.6])
    pins.append(pin)
disc = cyl(4.6, -1.6, 0.0) - cyl(2.5, -2, 1)   # anel que assenta no núcleo do macho? não: base da chave fica abaixo do telemóvel
ring = (cyl(7.6, -1.6, 0.0) - cyl(5.3, -2, 1))
handle = box(-22, -7.0, -3, 3, -1.6, 0.0)
key = ring + handle
for p in pins: key = key + p
os.makedirs(os.path.join(HERE, 'out', 'v3'), exist_ok=True)
to_trimesh(key.translate([0, 0, 1.6])).export(os.path.join(HERE, 'out', 'v3', 'chave_libertacao_v3_PETG.stl'))
print('chave ok')
