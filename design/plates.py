"""Tender Metrology — pranchas ilustradas da DÍGITO.
Gera SVGs com geometria calculada; render.cjs converte-os em PNG/WebP/PDF.
"""
import math, os

FONTS = '/root/.claude/skills/synced/25e188f9-4c92-4f59-9e0c-cd43119dca9f_83572dc9-4877-4ed1-b177-3832aa1ed848/canvas-design/canvas-fonts'
OUT = os.path.join(os.path.dirname(__file__), 'svg')
os.makedirs(OUT, exist_ok=True)

INK = '#202124'; SOFT = '#5F6368'; BLUE = '#1A73E8'; WHITE = '#FFFFFF'
FIELD = {'blush': '#FCE8E6', 'lav': '#ECE8FD', 'mint': '#E6F4EA', 'ice': '#E8F0FE', 'white': '#FFFFFF'}
DEEP = {'blush': '#F6D3CF', 'lav': '#DCD3FB', 'mint': '#CDE9D6', 'ice': '#D2E3FC', 'white': '#EEF0F2'}
HAIR = 1.25  # espessura de traço de medição (constante em toda a série)

def head(w, h, field):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            '<defs><style>'
            f'@font-face{{font-family:DMMono;src:url(file://{FONTS}/DMMono-Regular.ttf)}}'
            f'@font-face{{font-family:Inst;src:url(file://{FONTS}/InstrumentSans-Regular.ttf)}}'
            '.m{font-family:DMMono;font-size:15px;fill:#5F6368;letter-spacing:.6px}'
            '.ms{font-family:DMMono;font-size:13px;fill:#5F6368;letter-spacing:.5px}'
            '.w{font-family:Inst;font-size:22px;fill:#202124;letter-spacing:.2px}'
            '</style></defs>'
            f'<rect width="{w}" height="{h}" fill="{FIELD[field]}"/>')

def dots(w, h, step=24, m=48, op=.16, r=1.15):
    s = []
    for y in range(m, h - m + 1, step):
        for x in range(m, w - m + 1, step):
            s.append(f'<circle cx="{x}" cy="{y}" r="{r}"/>')
    return f'<g fill="{INK}" opacity="{op}">' + ''.join(s) + '</g>'

def capsule(x, y, w, h, fill='none', stroke='none', sw=0, op=1, extra=''):
    r = min(w, h) / 2
    return f'<rect x="{x:.2f}" y="{y:.2f}" width="{w:.2f}" height="{h:.2f}" rx="{r:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" opacity="{op}" {extra}/>'

def rings(cx, cy, r0, n, gap, color=INK, op0=.42):
    out = []
    for i in range(n):
        op = op0 * (1 - i / n) ** 1.3
        out.append(f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{r0 + i * gap:.2f}" fill="none" stroke="{color}" stroke-width="{HAIR}" opacity="{op:.3f}"/>')
    return ''.join(out)

def cross(x, y, s=7, color=INK, op=.55):
    return f'<g stroke="{color}" stroke-width="{HAIR}" opacity="{op}"><line x1="{x-s}" y1="{y}" x2="{x+s}" y2="{y}"/><line x1="{x}" y1="{y-s}" x2="{x}" y2="{y+s}"/></g>'

def dim_v(x, y1, y2, label=None, side='left', color=SOFT):
    """cota vertical com terminais"""
    t = 6
    s = f'<g stroke="{color}" stroke-width="{HAIR}"><line x1="{x}" y1="{y1}" x2="{x}" y2="{y2}"/><line x1="{x-t}" y1="{y1}" x2="{x+t}" y2="{y1}"/><line x1="{x-t}" y1="{y2}" x2="{x+t}" y2="{y2}"/></g>'
    if label:
        tx = x - 14 if side == 'left' else x + 14
        anchor = 'end' if side == 'left' else 'start'
        s += f'<text class="ms" x="{tx}" y="{(y1+y2)/2+4.5:.1f}" text-anchor="{anchor}">{label}</text>'
    return s

def cradle(cx, w, y, color=BLUE, th=18, lip=22):
    """sela em perfil: banda arredondada com dois lábios que abraçam o dedo"""
    x1 = cx - w / 2
    out = capsule(x1, y, w, th, fill=color)
    if lip:
        out += capsule(x1, y - lip + th / 2, th, lip + th / 2, fill=color)
        out += capsule(x1 + w - th, y - lip + th / 2, th, lip + th / 2, fill=color)
    return out

def corner(w, h, fig, word, note=None, m=56):
    s = f'<text class="m" x="{m}" y="{m+6}">{fig}</text>'
    s += f'<text class="w" x="{m}" y="{m+40}">{word}</text>'
    if note:
        s += f'<text class="ms" x="{w-m}" y="{h-m+4}" text-anchor="end">{note}</text>'
    return s

def save(name, svg):
    open(os.path.join(OUT, name + '.svg'), 'w').write(svg + '</svg>')

# ---------------------------------------------------------------- 01 estabilidade (tremor)
def plate_tremor():
    W, H = 1200, 900; f = 'lav'
    s = head(W, H, f) + dots(W, H)
    x0, x1, xr, yc = 112, 1088, 716, 520
    R = 54
    def amp(x):
        if x >= xr - R: return 0
        k = (x - x0) / (xr - R - x0)
        return 78 * (1 - k) ** 1.6 + 6 * (1 - k)
    # registos fantasma: medições repetidas do mesmo gesto, sobrepostas ao traço
    for ph, op in [(0.7, .10), (1.5, .13), (2.4, .16), (3.3, .19), (4.4, .12)]:
        pts = []
        x = x0
        while x <= xr - R:
            y = yc + amp(x) * (0.82 + 0.06 * math.sin(ph)) * math.sin((x - x0) / 9.0 + ph * 0.35)
            pts.append(f'{x:.1f},{y:.1f}')
            x += 1.5
        s += f'<polyline points="{" ".join(pts)}" fill="none" stroke="{INK}" stroke-width="{HAIR}" opacity="{op}"/>'
    # sismograma: barras de amostragem
    bars = []
    for i, x in enumerate(range(x0, x1 + 1, 12)):
        a = amp(x)
        hgt = max(4, a * 0.9)
        col = BLUE if x >= xr else INK
        op = .9 if x >= xr else .35
        bars.append(f'<line x1="{x}" y1="{yc+190-hgt/2:.1f}" x2="{x}" y2="{yc+190+hgt/2:.1f}" stroke="{col}" stroke-width="2" stroke-linecap="round" opacity="{op}"/>')
    s += ''.join(bars)
    # traço principal: tremor que assenta ao passar no anel
    pts = []
    x = x0
    while x <= x1:
        a = amp(x)
        y = yc + a * math.sin((x - x0) / 9.0)
        pts.append(f'{x:.1f},{y:.1f}')
        x += 1.0
    s += f'<polyline points="{" ".join(pts)}" fill="none" stroke="{INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>'
    # anel (o momento da decisão)
    s += rings(xr, yc, R + 22, 6, 16, BLUE, .38)
    s += f'<circle cx="{xr}" cy="{yc}" r="{R}" fill="none" stroke="{BLUE}" stroke-width="14"/>'
    s += f'<circle cx="{x1}" cy="{yc}" r="7" fill="{BLUE}"/>'
    # eixo e escala
    s += f'<line x1="{x0}" y1="{yc+260}" x2="{x1}" y2="{yc+260}" stroke="{INK}" stroke-width="{HAIR}" opacity=".45"/>'
    for i, x in enumerate(range(x0, x1 + 1, 61)):
        tl = 10 if i % 4 == 0 else 5
        s += f'<line x1="{x}" y1="{yc+260}" x2="{x}" y2="{yc+260+tl}" stroke="{INK}" stroke-width="{HAIR}" opacity=".45"/>'
    s += f'<text class="ms" x="{x0}" y="{yc+300}">amplitude</text>'
    s += f'<text class="ms" x="{x1}" y="{yc+300}" text-anchor="end">→ 0</text>'
    s += cross(xr, yc - R - 120)
    s += f'<text class="ms" x="{x0}" y="{yc-118}">4–12 Hz</text>'
    s += f'<line x1="{x0}" y1="{yc-104}" x2="{x0+60}" y2="{yc-104}" stroke="{INK}" stroke-width="{HAIR}" opacity=".45"/>'
    s += f'<text class="ms" x="{xr}" y="{yc-R-146}" text-anchor="middle">anel</text>'
    s += corner(W, H, 'fig. 01', 'estabilidade')
    save('estabilidade', s)

# ---------------------------------------------------------------- 02 apoio (artrose)
def plate_apoio():
    W, H = 1200, 900; f = 'blush'
    s = head(W, H, f) + dots(W, H)
    yc, hh = 452, 96
    segs = [(150, 352), (514, 236), (762, 178)]  # x, comprimento: proximal, média, distal
    gap = 12
    # cotas superiores
    for (x, L) in segs:
        s += f'<g stroke="{SOFT}" stroke-width="{HAIR}"><line x1="{x}" y1="{yc-hh/2-58}" x2="{x+L}" y2="{yc-hh/2-58}"/><line x1="{x}" y1="{yc-hh/2-64}" x2="{x}" y2="{yc-hh/2-52}"/><line x1="{x+L}" y1="{yc-hh/2-64}" x2="{x+L}" y2="{yc-hh/2-52}"/></g>'
    labels = ['F1', 'F2', 'F3']
    for (x, L), lb in zip(segs, labels):
        s += f'<text class="ms" x="{x + L/2}" y="{yc-hh/2-72}" text-anchor="middle">{lb}</text>'
    # anéis nas articulações (o mapa da dor)
    joints = [segs[0][0] + segs[0][1] + 5, segs[1][0] + segs[1][1] + 5]
    for jx in joints:
        s += rings(jx, yc, 62, 7, 15, INK, .30)
    # falanges
    for (x, L) in segs:
        s += capsule(x, yc - hh / 2, L, hh, fill=DEEP[f])
        s += capsule(x, yc - hh / 2, L, hh, stroke=INK, sw=2.2)
    for jx in joints:
        s += f'<circle cx="{jx}" cy="{yc}" r="11" fill="{FIELD[f]}" stroke="{INK}" stroke-width="2.2"/>'
    # selas em berço sob F1 e F2
    ys = yc + hh / 2 + 6
    c1 = segs[0][0] + segs[0][1] * .52; c2 = segs[1][0] + segs[1][1] * .5
    s += cradle(c1, 230, ys, th=20, lip=0)
    s += cradle(c2, 160, ys, th=20, lip=0)
    # linhas de carga: pequenas setas verticais entre falange e sela
    for cx in [c1 + d for d in (-64, -32, 0, 32, 64)] + [c2 + d for d in (-40, 0, 40)]:
        s += f'<line x1="{cx:.1f}" y1="{ys+62}" x2="{cx:.1f}" y2="{ys+100}" stroke="{INK}" stroke-width="{HAIR}" opacity=".45"/><path d="M{cx-4:.1f},{ys+68} L{cx:.1f},{ys+60} L{cx+4:.1f},{ys+68}" fill="none" stroke="{INK}" stroke-width="{HAIR}" opacity=".45"/>'
    # cota de largura do dedo (à décima)
    s += dim_v(108, yc - hh / 2, yc + hh / 2, None)
    s += f'<text class="ms" x="96" y="{yc+hh/2+36}" >18,4 mm</text>'
    s += cross(joints[0], yc - 150); s += cross(joints[1], yc - 150)
    s += f'<text class="ms" x="{joints[0]}" y="{yc-172}" text-anchor="middle">IFP</text>'
    s += f'<text class="ms" x="{joints[1]}" y="{yc-172}" text-anchor="middle">IFD</text>'
    s += corner(W, H, 'fig. 02', 'apoio', 'carga fora da articulação')
    save('apoio', s)

# ---------------------------------------------------------------- 03 força (pouca força de preensão)
def plate_forca():
    W, H = 1200, 900; f = 'mint'
    s = head(W, H, f) + dots(W, H)
    px, py, pw, ph = 420, 132, 300, 560
    s += f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="44" fill="{WHITE}" stroke="{INK}" stroke-width="2.4"/>'
    s += f'<rect x="{px+24}" y="{py+24}" width="118" height="128" rx="30" fill="none" stroke="{INK}" stroke-width="{HAIR}" opacity=".6"/>'
    for (cx, cy) in [(px + 60, py + 62), (px + 60, py + 114), (px + 106, py + 88)]:
        s += f'<circle cx="{cx}" cy="{cy}" r="16" fill="none" stroke="{INK}" stroke-width="{HAIR}" opacity=".6"/>'
    for gy in range(py + 196, py + ph - 50, 48):
        for gx in range(px + 40, px + 150, 44):
            s += f'<line x1="{gx}" y1="{gy}" x2="{gx}" y2="{gy+20}" stroke="{INK}" stroke-width="{HAIR}" opacity=".38"/><path d="M{gx-4},{gy+14} L{gx},{gy+21} L{gx+4},{gy+14}" fill="none" stroke="{INK}" stroke-width="{HAIR}" opacity=".38"/>'
    for y, t in [(300, 88), (404, 94), (508, 86)]:
        x0 = px + 170
        s += capsule(x0, y - t / 2, 360, t, fill=DEEP[f])
        s += capsule(x0, y - t / 2, 360, t, stroke=INK, sw=2.2)
    sy = py + ph + 16
    s += capsule(px - 12, sy, pw + 160, 64, fill=BLUE)
    s += f'<text class="ms" x="{px+32}" y="{sy+37}" style="fill:#FFFFFF">mindinho</text>'
    for gx in range(px + 40, px + pw - 20, 44):
        y0 = sy + 112
        s += f'<line x1="{gx}" y1="{y0}" x2="{gx}" y2="{y0-28}" stroke="{BLUE}" stroke-width="2" stroke-linecap="round"/><path d="M{gx-5},{y0-21} L{gx},{y0-29} L{gx+5},{y0-21}" fill="none" stroke="{BLUE}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    s += cross(px + pw / 2, py - 42)
    s += f'<text class="ms" x="{px+pw/2+18}" y="{py-38}">P = m·g</text>'
    s += corner(W, H, 'fig. 03', 'força', 'menos aperto, mesmo apoio')
    save('forca', s)

# ---------------------------------------------------------------- 04 feito contigo (pedido especial)
def plate_contigo():
    W, H = 1200, 900; f = 'ice'
    s = head(W, H, f) + dots(W, H)
    yc = 470; xs = [222, 474, 726, 978]; R = 98
    # caminho tracejado
    s += f'<line x1="{xs[0]}" y1="{yc}" x2="{xs[-1]}" y2="{yc}" stroke="{INK}" stroke-width="{HAIR}" stroke-dasharray="2 9" stroke-linecap="round" opacity=".55"/>'
    for i, x in enumerate(xs):
        last = i == 3
        if last: s += rings(x, yc, R + 16, 3, 13, BLUE, .4)
        s += f'<circle cx="{x}" cy="{yc}" r="{R}" fill="{WHITE}" stroke="{BLUE if last else INK}" stroke-width="{4 if last else 1.6}"/>'
    # 01 carta
    x = xs[0]
    s += f'<rect x="{x-52}" y="{yc-36}" width="104" height="72" rx="14" fill="{DEEP[f]}" stroke="{INK}" stroke-width="2.2"/>'
    s += f'<path d="M{x-46},{yc-28} L{x},{yc+6} L{x+46},{yc-28}" fill="none" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>'
    # 02 conversa: duas cápsulas
    x = xs[1]
    s += capsule(x - 58, yc - 40, 84, 50, fill=DEEP[f], stroke=INK, sw=2.2)
    s += capsule(x - 22, yc - 4, 84, 50, fill=WHITE, stroke=INK, sw=2.2)
    for k in range(3):
        s += f'<circle cx="{x+2+k*18}" cy="{yc+21}" r="3.6" fill="{INK}"/>'
    # 03 medida: ponta do dedo + anéis + escala
    x = xs[2]
    s += rings(x + 4, yc + 6, 22, 4, 9, INK, .4)
    s += capsule(x - 64, yc - 16, 76, 44, fill=DEEP[f], stroke=INK, sw=2.2)
    s += dim_v(x + 46, yc - 16, yc + 28, None, color=INK)
    for k in range(5):
        s += f'<line x1="{x-60+k*14}" y1="{yc+46}" x2="{x-60+k*14}" y2="{yc+(54 if k%2 else 58)}" stroke="{INK}" stroke-width="{HAIR}" opacity=".6"/>'
    # 04 peça: pega assente num encaixe hexagonal
    x = xs[3]
    hexr = 30
    pts = ' '.join(f'{x + hexr*math.cos(math.radians(60*k)):.1f},{yc+36 + hexr*math.sin(math.radians(60*k)):.1f}' for k in range(6))
    s += f'<polygon points="{pts}" fill="{DEEP[f]}" stroke="{INK}" stroke-width="2.2" stroke-linejoin="round"/>'
    s += capsule(x - 62, yc - 26, 124, 34, fill=BLUE)
    # legendas
    for i, (x, t) in enumerate(zip(xs, ['escreves', 'falamos', 'medimos', 'fazemos'])):
        s += f'<text class="ms" x="{x}" y="{yc+R+52}" text-anchor="middle">0{i+1}</text>'
        s += f'<text class="w" x="{x}" y="{yc+R+84}" text-anchor="middle" style="font-size:20px">{t}</text>'
    s += corner(W, H, 'fig. 04', 'feito contigo', 'uma conversa, uma peça')
    save('contigo', s)

# ---------------------------------------------------------------- 00 herói: quatro dedos, quatro medidas
def plate_hero():
    W, H = 1000, 1150; f = 'ice'
    s = head(W, H, f) + dots(W, H, step=26)
    px, py, pw, ph = 230, 190, 360, 760
    widths = [18.4, 19.2, 17.8, 15.1]
    k = 4.6
    ys = [520, 640, 760, 870]
    s += f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="54" fill="{WHITE}" stroke="{INK}" stroke-width="2.4"/>'
    s += f'<rect x="{px+28}" y="{py+28}" width="140" height="152" rx="36" fill="none" stroke="{INK}" stroke-width="{HAIR}" opacity=".6"/>'
    for (cx, cy) in [(px + 72, py + 74), (px + 72, py + 136), (px + 124, py + 105)]:
        s += f'<circle cx="{cx}" cy="{cy}" r="19" fill="none" stroke="{INK}" stroke-width="{HAIR}" opacity=".6"/>'
    for y in ys:
        s += rings(px + pw - 120, y, 62, 3, 14, BLUE, .30)
    for y, wmm in zip(ys, widths):
        t = wmm * k
        x0 = px + pw - 200
        s += capsule(px + pw - 120 - 62, y - t / 2 - 9, 124, t + 18, fill=BLUE)
        s += capsule(x0, y - t / 2, 380, t, fill=DEEP[f])
        s += capsule(x0, y - t / 2, 380, t, stroke=INK, sw=2.2)
        s += dim_v(px - 44, y - t / 2, y + t / 2, str(wmm).replace('.', ','), side='left')
        s += f'<line x1="{px-32}" y1="{y:.1f}" x2="{px-8}" y2="{y:.1f}" stroke="{SOFT}" stroke-width="{HAIR}" stroke-dasharray="2 4" opacity=".7"/>'
    s += f'<text class="ms" x="{px-58}" y="{ys[-1]+70}" text-anchor="end">mm</text>'
    s += cross(px + pw / 2, py - 50)
    s += corner(W, H, 'fig. 00', 'quatro dedos, quatro medidas', 'mão n.º 0001')
    save('hero', s)

if __name__ == '__main__':
    plate_hero(); plate_tremor(); plate_apoio(); plate_forca(); plate_contigo()
    print('ok', sorted(os.listdir(OUT)))
