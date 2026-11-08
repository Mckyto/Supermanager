#!/usr/bin/env bash
# Regenerează setul de iconițe din assets/icon-source.png.
# Necesită ImageMagick (`convert`) și python3 (doar pentru aritmetică).
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets/icon-source.png
OUT=public/icons

[ -f "$SRC" ] || { echo "Lipsește $SRC"; exit 1; }
mkdir -p "$OUT"

# 1. Găsim dreptunghiul minim care conține scutul (ignorăm fundalul uniform).
read -r W H X Y <<<"$(convert "$SRC" -fuzz 12% -trim -format "%w %h %X %Y" info: | tr -d '+')"

# 2. Decupăm un pătrat centrat pe scut, cu ~30% spațiu liber (iconiță „plină").
read -r SIDE LEFT TOP <<<"$(python3 -c "
w, h, x, y = $W, $H, $X, $Y
side = int(max(w, h) * 1.30)
print(side, x + w // 2 - side // 2, y + h // 2 - side // 2)
")"

convert "$SRC" -crop "${SIDE}x${SIDE}+${LEFT}+${TOP}" +repage -resize 512x512 "$OUT/icon-512.png"
convert "$OUT/icon-512.png" -resize 192x192 "$OUT/icon-192.png"
convert "$OUT/icon-512.png" -resize 180x180 "$OUT/apple-touch-icon.png"

# 3. Varianta maskable: tot cadranul sursă, ca scutul să rămână în zona sigură.
convert "$SRC" -resize 512x512 "$OUT/icon-512-maskable.png"

convert "$OUT/icon-192.png" -resize 32x32 "$OUT/favicon-32.png"
convert "$OUT/favicon-32.png" -define icon:auto-resize=48,32,16 "$OUT/favicon.ico"

echo "Iconițe regenerate în $OUT."
