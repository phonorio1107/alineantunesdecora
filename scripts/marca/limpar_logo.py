"""Tira o contorno escuro da logo da Aline e gera as versões usadas no sistema.

O PNG original veio com um halo preto semitransparente em volta das letras rosa (e filetes escuros entre os
traços). Aqui cada pixel do "Aline Antunes" é separado em quanto é rosa e quanto é contorno: fica só o rosa,
com a mesma suavidade da borda. O "Decora." cinza não é mexido.

Uso (precisa de Pillow): python3 scripts/marca/limpar_logo.py
Entrada: marca/logo-aline-antunes-decora-original.png
Saídas:  marca/logo-aline-antunes-decora.png, src/assets/logo.png, public/favicon.png, public/icon-192.png,
         public/icon-512.png, public/apple-touch-icon.png
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

RAIZ = Path(__file__).resolve().parents[2]
ROSA = (222, 121, 155)          # a cor das letras no original
FUNDO_ICONE = (253, 238, 244)   # --convite do sistema
DECORA = (600, 355, 1067, 469)  # caixa do "Decora." no original (1689 x 484)


def limpar(original: Image.Image, fechar: int, com_decora: bool = True) -> Image.Image:
    im = original.convert('RGBA')
    w, h = im.size
    px = im.load()
    alfa = Image.new('L', (w, h), 0)
    pa = alfa.load()
    pp = sum(c * c for c in ROSA)
    decora = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    pd = decora.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            cinza = abs(r - g) < 25 and abs(g - b) < 25
            if DECORA[0] <= x <= DECORA[2] and DECORA[1] <= y <= DECORA[3] and cinza and r > 70:
                pd[x, y] = (r, g, b, a)  # "Decora.": fica como está
                continue
            # cor = t·rosa + (1 − t)·preto  →  t é o quanto do pixel é letra
            t = (r * ROSA[0] + g * ROSA[1] + b * ROSA[2]) / pp
            pa[x, y] = round(a * max(0.0, min(1.0, t)))
    if fechar:
        # Fecha os filetes finos que o contorno deixava entre os traços (sem engrossar a letra por fora).
        alfa = alfa.filter(ImageFilter.MaxFilter(fechar)).filter(ImageFilter.MinFilter(fechar))
    letras = Image.new('RGBA', (w, h), ROSA + (0,))
    letras.putalpha(alfa)
    return Image.alpha_composite(letras, decora) if com_decora else letras


def recortar(im: Image.Image, margem: int) -> Image.Image:
    caixa = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    x0, y0, x1, y1 = caixa
    return im.crop((max(0, x0 - margem), max(0, y0 - margem), min(im.width, x1 + margem), min(im.height, y1 + margem)))


def icone(letras: Image.Image, lado: int, raio: float) -> Image.Image:
    """Só a palavra "Aline" sobre o rosa claro, cantos arredondados (como os ícones anteriores)."""
    sem_decora = letras.copy()
    ImageDraw.Draw(sem_decora).rectangle(DECORA, fill=(0, 0, 0, 0))  # tira a sobra da borda do "Decora."
    aline = recortar(sem_decora.crop((0, 0, 700, 484)), 4)  # "Aline" fica à esquerda no original
    base = Image.new('RGBA', (lado, lado), FUNDO_ICONE + (255,))
    alvo = int(lado * 0.78)
    esc = alvo / max(aline.width, aline.height)
    a = aline.resize((max(1, int(aline.width * esc)), max(1, int(aline.height * esc))), Image.LANCZOS)
    base.alpha_composite(a, ((lado - a.width) // 2, (lado - a.height) // 2))
    if raio:
        mascara = Image.new('L', (lado, lado), 0)
        ImageDraw.Draw(mascara).rounded_rectangle((0, 0, lado - 1, lado - 1), radius=int(lado * raio), fill=255)
        base.putalpha(ImageChops.multiply(base.getchannel('A'), mascara))
    return base


def main(fechar: int = 0):
    original = Image.open(RAIZ / 'marca/logo-aline-antunes-decora-original.png')
    limpa = limpar(original, fechar)
    limpa.save(RAIZ / 'marca/logo-aline-antunes-decora.png', optimize=True)
    pequena = limpa.resize((640, round(640 * limpa.height / limpa.width)), Image.LANCZOS)
    pequena.save(RAIZ / 'src/assets/logo.png', optimize=True)
    so_letras = limpar(original, fechar, com_decora=False)
    for nome, lado, raio in [('icon-512.png', 512, 0.18), ('icon-192.png', 192, 0.18), ('apple-touch-icon.png', 180, 0), ('favicon.png', 64, 0.2)]:
        icone(so_letras, lado, raio).save(RAIZ / 'public' / nome, optimize=True)
    print('logos e ícones gerados')


if __name__ == '__main__':
    main()
