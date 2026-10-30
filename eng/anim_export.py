"""Exporta as peças do DÍGITO Lock separadas para a animação (motion graphic) do site.
Tudo em coordenadas da montagem (z = 0 nas costas do telemóvel); o macho sai com rot = 0 (orientação de entrada)."""
import os, math
import manifold3d as mf
from lock_geom import P, Z, insert, plug, tpu_boss, cyl, box, to_trimesh, base_bot, boss_top

OUT = os.path.join(os.path.dirname(__file__), 'out', 'anim'); os.makedirs(OUT, exist_ok=True)

def grip():
    """macho + pega em sela (forma simplificada da pega real, sem a pega em T de ensaio)"""
    m = plug(rot=0, base=False)
    pad_r, pad_h = 11.5, 6.0
    stem = mf.Manifold.cylinder(2.0, P['r_core'], 9.0, 96).translate([0, 0, base_bot])
    body = mf.Manifold.sphere(1.0, 96).scale([pad_r, pad_r * 1.25, pad_h]).translate([0, 0, base_bot + 2.0])
    body = body - box(-30, 30, -30, 30, base_bot - 10, base_bot + 2.0)     # metade superior do elipsoide
    saddle = mf.Manifold.cylinder(40, 9.0, 9.0, 96).rotate([90, 0, 0]).translate([0, 20, base_bot + 2.0 + pad_h + 6.2])
    return m + stem + cyl(pad_r, base_bot + 1.0, base_bot + 2.01) + (body - saddle)

def boss_no_pillar():
    b = tpu_boss(2.0)
    return b - cyl(1.3, Z['pillar_root'] + 0.05, Z['pillar_top_free'] + 1, 48)

def plate():
    """placa de TPU (pedaço das costas da capa) com a bossa"""
    p = box(-17, 17, -17, 17, 0, 1.6)
    p = p - cyl(P['boss_r'] - 0.01, -1, 2) + boss_no_pillar()
    return p

def pillar():
    return cyl(1.0, Z['pillar_root'], Z['pillar_top_free'], 48)

for n, m in [('insert', insert()), ('grip', grip()), ('tpu', plate()), ('pillar', pillar())]:
    to_trimesh(m).export(os.path.join(OUT, f'{n}.stl')); print(n, 'ok')
print('base_bot', base_bot, 'boss_top', boss_top, 'pillar_root', Z['pillar_root'], 'pillar_top_free', Z['pillar_top_free'],
      'dz_push', Z['lug_top_pushed'] - Z['lug_top_locked'], 'recess_roof', Z['lug_bottom_locked'] + P['recess'])
