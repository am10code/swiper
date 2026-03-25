#!/usr/bin/env bash
# Конвертация SVG-иконок в PNG для манифеста расширения.
# Нужен ImageMagick (brew install imagemagick) или librsvg (brew install librsvg).

set -e
ICONS_DIR="$(dirname "$0")/assets/icons"
cd "$ICONS_DIR" || exit 1

for size in 16 48 128; do
  if command -v convert &>/dev/null; then
    convert "icon${size}.svg" -resize "${size}x${size}" "icon${size}.png"
  elif command -v rsvg-convert &>/dev/null; then
    rsvg-convert -w "$size" -h "$size" "icon${size}.svg" -o "icon${size}.png"
  else
    echo "Установите ImageMagick или librsvg:"
    echo "  brew install imagemagick"
    echo "  или"
    echo "  brew install librsvg"
    exit 1
  fi
done
echo "Готово: icon16.png, icon48.png, icon128.png"
