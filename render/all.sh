#!/bin/bash
set -e
export NODE_PATH=$(npm root -g)
cd /home/claude/digito
mkdir -p public/video public/products
for k in capa sela anel tampa imanes titanio; do node render/drive.cjs product /tmp/rr/p_$k 1 1200 900 "&kind=$k" >/dev/null; python3 -c "from PIL import Image; Image.open('/tmp/rr/p_$k/f0000.jpg').save('public/products/$k.webp', quality=86)"; done
echo products done
node render/drive.cjs hero /tmp/rr/hero 300 1920 1080
node render/drive.cjs measure /tmp/rr/measure 300 1280 720
node render/drive.cjs generate /tmp/rr/generate 240 1280 720
node render/drive.cjs print /tmp/rr/print 300 1280 720
for v in hero measure generate print; do
  ffmpeg -v error -y -framerate 30 -i /tmp/rr/$v/f%04d.jpg -c:v libx264 -preset veryfast -crf 24 -pix_fmt yuv420p -movflags +faststart -an public/video/$v.mp4
  last=$(ls /tmp/rr/$v | tail -1); [ $v = hero ] && last=f0200.jpg
  python3 -c "from PIL import Image; Image.open('/tmp/rr/$v/$last').save('public/video/$v.jpg', quality=82)"
done
ls -la public/video public/products
echo ALL DONE
