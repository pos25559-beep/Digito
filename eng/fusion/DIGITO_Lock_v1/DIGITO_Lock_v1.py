#Author-DÍGITO (P. Silva)
#Description-DÍGITO Lock v1: insert, macho e bossa de TPU da baioneta de bloqueio positivo, em coordenadas do telemóvel (z = 0 na face traseira).
"""
Como usar (Fusion 360):
  1. Utilities > Add-Ins > Scripts and Add-Ins > "+" (My Scripts) > escolher esta pasta.
  2. Correr "DIGITO_Lock_v1". Cria um novo design com 3 componentes na posição BLOQUEADA:
       Insert (PETG) · Macho (pega) · Bossa_TPU (capa local com o pilar-mola).
  3. Os parâmetros ficam em Modify > Change Parameters (documentação e distâncias de extrusão).
     Para mudar a geometria de forma consistente, edite o dicionário PARAMS abaixo e corra de novo:
     o script é a fonte da verdade, igual a eng/lock_geom.py (que faz a verificação cinemática).
Unidades: mm e graus no PARAMS; a API do Fusion trabalha em cm (conversão automática).
"""
import adsk.core, adsk.fusion, traceback, math

PARAMS = {
 "r_core": [
  5.0,
  "mm",
  "raio do núcleo do macho"
 ],
 "c_rad": [
  0.2,
  "mm",
  "folga radial (FDM 0,20; resina 0,10)"
 ],
 "lug_proj": [
  1.6,
  "mm",
  "saliência radial das patilhas"
 ],
 "lug_t": [
  1.4,
  "mm",
  "espessura axial das patilhas"
 ],
 "lug_deg": [
  40.0,
  "deg",
  "largura angular de cada patilha"
 ],
 "turn": [
  60.0,
  "deg",
  "rotação de bloqueio (anti-horária vista de fora)"
 ],
 "lip_t": [
  1.8,
  "mm",
  "espessura do lábio do insert"
 ],
 "notch": [
  0.4,
  "mm",
  "profundidade do entalhe de bloqueio"
 ],
 "clr_ax": [
  0.15,
  "mm",
  "folga axial ao rodar"
 ],
 "preload": [
  0.15,
  "mm",
  "pré-carga do pilar-mola"
 ],
 "tpu_floor": [
  0.6,
  "mm",
  "TPU entre o telemóvel e o insert"
 ],
 "pillar_root": [
  0.3,
  "mm",
  "cota da raiz do pilar"
 ],
 "pillar_d": [
  2.0,
  "mm",
  "diâmetro do pilar-mola (escolher no provete: 1,6/2,0/2,4/2,8)"
 ],
 "recess": [
  1.0,
  "mm",
  "profundidade do furo cego no macho"
 ],
 "recess_d": [
  3.4,
  "mm",
  "diâmetro do furo cego"
 ],
 "ins_af": [
  16.0,
  "mm",
  "hexágono do insert, entre faces"
 ],
 "slot_extra": [
  2.0,
  "deg",
  "folga angular de cada lado da ranhura"
 ],
 "notch_extra": [
  1.0,
  "deg",
  "folga angular de cada lado do entalhe"
 ],
 "stop_w": [
  5.0,
  "deg",
  "largura do batente"
 ],
 "stop_gap": [
  1.5,
  "deg",
  "distância do batente à patilha bloqueada"
 ],
 "key_w": [
  1.2,
  "mm",
  "largura da chave"
 ],
 "key_h": [
  0.6,
  "mm",
  "altura da chave"
 ],
 "cap_t": [
  0.6,
  "mm",
  "tampa de TPU sobre o insert"
 ],
 "cap_ri": [
  7.0,
  "mm",
  "raio interior da tampa de TPU"
 ],
 "boss_r": [
  9.0,
  "mm",
  "raio da bossa"
 ],
 "base_gap": [
  0.7,
  "mm",
  "folga entre a base da pega e a bossa"
 ],
 "lead": [
  0.3,
  "mm",
  "chanfro de entrada do furo"
 ]
}
LUG_POS = [0, 110, 240]   # posições angulares das patilhas (espaçamento irregular = uma só orientação)
CM = 0.1

def v(name): return PARAMS[name][0]
r_lug = v('r_core') + v('lug_proj'); r_bore = v('r_core') + v('c_rad'); r_ch = r_lug + v('c_rad')
h_ch = v('lug_t') + v('notch') + v('clr_ax'); H = v('lip_t') + h_ch
z_ins = v('tpu_floor'); z_top = z_ins + H; z_lipb = z_top - v('lip_t')
boss_top = z_top + v('cap_t'); base_bot = boss_top + v('base_gap')
z_lug_lock = z_lipb + v('notch') - v('lug_t')            # base das patilhas, bloqueado
pillar_top = z_lug_lock + v('recess') + v('preload')

def P3(x, y, z): return adsk.core.Point3D.create(x * CM, y * CM, z * CM)
def VI(mm): return adsk.core.ValueInput.createByReal(mm * CM)

class B:
    def __init__(self, root, name):
        occ = root.occurrences.addNewComponent(adsk.core.Matrix3D.create())
        self.c = occ.component; self.c.name = name; self.occ = occ
    def plane(self, z):
        planes = self.c.constructionPlanes; inp = planes.createInput()
        inp.setByOffset(self.c.xYConstructionPlane, VI(z)); pl = planes.add(inp); pl.isLightBulbOn = False; return pl
    def sk(self, z):
        s = self.c.sketches.add(self.plane(z)); s.isVisible = False; return s
    def pt(self, s, x, y, z): return s.modelToSketchSpace(P3(x, y, z))
    def poly(self, z, pts):
        s = self.sk(z); L = s.sketchCurves.sketchLines
        q = [self.pt(s, x, y, z) for x, y in pts]
        for i in range(len(q)): L.addByTwoPoints(q[i], q[(i + 1) % len(q)])
        return s
    def circle(self, z, r):
        s = self.sk(z); s.sketchCurves.sketchCircles.addByCenterRadius(self.pt(s, 0, 0, z), r * CM); return s
    def sector(self, z, r1, r2, a1, a2):
        s = self.sk(z); A = s.sketchCurves.sketchArcs; L = s.sketchCurves.sketchLines
        c = self.pt(s, 0, 0, z); sw = math.radians(a2 - a1)
        p = lambda r, a: self.pt(s, r * math.cos(math.radians(a)), r * math.sin(math.radians(a)), z)
        A.addByCenterStartSweep(c, p(r2, a1), sw); A.addByCenterStartSweep(c, p(r1, a1), sw)
        L.addByTwoPoints(p(r1, a1), p(r2, a1)); L.addByTwoPoints(p(r1, a2), p(r2, a2))
        return s
    def ext(self, s, h, op, smallest=False):
        profs = [s.profiles.item(i) for i in range(s.profiles.count)]
        prof = min(profs, key=lambda p: p.areaProperties().area) if smallest else max(profs, key=lambda p: p.areaProperties().area)
        f = self.c.features.extrudeFeatures; inp = f.createInput(prof, op); inp.setDistanceExtent(False, VI(h))
        if op != NEW and self.c.bRepBodies.count:  # cortar/juntar só o corpo deste componente (não os vizinhos)
            inp.participantBodies = [self.c.bRepBodies.item(0)]
        return f.add(inp)

NEW = adsk.fusion.FeatureOperations.NewBodyFeatureOperation
JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation
CUT = adsk.fusion.FeatureOperations.CutFeatureOperation

def hex_key_pts():
    af = v('ins_af'); R = af / 2 / math.cos(math.radians(30)); kw, kh = v('key_w'), v('key_h')
    vt = lambda a: (R * math.cos(math.radians(a)), R * math.sin(math.radians(a)))
    return [vt(-30), (af / 2, -kw / 2), (af / 2 + kh, -kw / 2), (af / 2 + kh, kw / 2), (af / 2, kw / 2), vt(30), vt(90), vt(150), vt(210), vt(270)]

def build_insert(root):
    b = B(root, 'Insert (PETG) — imprimir com o lábio na mesa')
    b.ext(b.poly(z_ins, hex_key_pts()), H, NEW)
    b.ext(b.circle(z_ins - 1, r_bore), H + 2, CUT)
    b.ext(b.circle(z_ins - 1, r_ch), z_lipb - z_ins + 1, CUT)
    for a in LUG_POS:
        h = v('lug_deg') / 2 + v('slot_extra'); b.ext(b.sector(z_lipb - 0.01, r_bore - 0.5, r_ch + 0.1, a - h, a + h), z_top - z_lipb + 1.01, CUT)
        al = a + v('turn'); hn = v('lug_deg') / 2 + v('notch_extra')
        b.ext(b.sector(z_lipb - 0.5, r_bore - 0.5, r_ch + 0.1, al - hn, al + hn), 0.5 + v('notch'), CUT)
        s0 = al + v('lug_deg') / 2 + v('stop_gap'); b.ext(b.sector(z_ins, v('r_core') + 0.35, r_ch + 0.5, s0, s0 + v('stop_w')), z_lipb - z_ins + 0.3, JOIN)
    # chanfro de entrada (revolução de um triângulo no plano XZ)
    s = b.c.sketches.add(b.c.xZConstructionPlane); s.isVisible = False; Lz = s.sketchCurves.sketchLines
    q = [b.pt(s, r_bore - 0.01, 0, z_top + 0.01), b.pt(s, r_bore - 0.01, 0, z_top - v('lead')), b.pt(s, r_bore + v('lead'), 0, z_top + 0.01)]
    for i in range(3): Lz.addByTwoPoints(q[i], q[(i + 1) % 3])
    rv = b.c.features.revolveFeatures; inp = rv.createInput(s.profiles.item(0), b.c.zConstructionAxis, CUT)
    inp.setAngleExtent(False, adsk.core.ValueInput.createByString('360 deg')); inp.participantBodies = [b.c.bRepBodies.item(0)]; rv.add(inp)
    return b

def build_plug(root):
    b = B(root, 'Macho (pega) — posição bloqueada')
    b.ext(b.circle(z_lug_lock, v('r_core')), base_bot - z_lug_lock + 0.01, NEW)
    b.ext(b.circle(base_bot, 9.0), 2.0, JOIN)     # base representativa da pega (substituir pela pega real)
    for a in LUG_POS:
        al = a + v('turn'); b.ext(b.sector(z_lug_lock, v('r_core') - 0.6, r_lug, al - v('lug_deg') / 2, al + v('lug_deg') / 2), v('lug_t'), JOIN)
    b.ext(b.circle(z_lug_lock - 1, v('recess_d') / 2), v('recess') + 1, CUT)
    return b

def build_boss(root):
    b = B(root, 'Bossa_TPU (capa) com pilar-mola')
    b.ext(b.circle(0, v('boss_r')), boss_top, NEW)
    b.ext(b.circle(z_ins, r_ch), boss_top - z_ins + 1, CUT)
    b.ext(b.poly(z_ins, hex_key_pts()), H, CUT)
    b.ext(b.circle(z_top - 0.01, v('cap_ri')), v('cap_t') + 1.01, CUT)
    b.ext(b.circle(v('pillar_root'), 2.6), z_ins - v('pillar_root') + 0.01, CUT)
    b.ext(b.circle(v('pillar_root') - 0.01, v('pillar_d') / 2), pillar_top - v('pillar_root') + 0.01, JOIN)
    return b

def run(context):
    ui = None
    try:
        app = adsk.core.Application.get(); ui = app.userInterface
        app.documents.add(adsk.core.DocumentTypes.FusionDesignDocumentType)
        design = adsk.fusion.Design.cast(app.activeProduct)
        design.designType = adsk.fusion.DesignTypes.ParametricDesignType
        root = design.rootComponent; root.name = 'DÍGITO Lock v1'
        up = design.userParameters
        for name, (val, unit, comment) in PARAMS.items():
            expr = f'{val} {unit}' if unit else str(val)
            up.add(name, adsk.core.ValueInput.createByString(expr), unit, comment)
        build_insert(root); build_plug(root); build_boss(root)
        ui.messageBox('DÍGITO Lock v1 criado na posição bloqueada.\n\n'
                      f'Topo do insert: {z_top:.2f} mm · topo da bossa: {boss_top:.2f} mm acima do telemóvel.\n'
                      f'Pausa da impressão da capa: z = {z_top:.2f} mm (colocar o insert).\n'
                      'Rotação de bloqueio: +60° (anti-horária vista de fora).')
    except:
        if ui: ui.messageBox('Falhou:\n{}'.format(traceback.format_exc()))
