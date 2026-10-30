// node render.cjs <page.html> <out_dir> [fps] [w] [h]  → frames PNG, depois ffmpeg
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const [page_, out, fps = '30', w = '1600', h = '1000'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('console', m => console.log('[page]', m.text())); p.on('pageerror', e => console.log('[err]', e.message));
  await p.goto(`http://127.0.0.1:8765/${page_}`);
  await p.waitForFunction('window.ready === true', null, { timeout: 120000 });
  const dur = await p.evaluate('window.DUR'); const n = Math.round(dur * +fps);
  for (let i = 0; i < n; i++) {
    await p.evaluate(t => window.frame(t), i / +fps);
    await p.screenshot({ path: path.join(out, `f${String(i).padStart(4, '0')}.png`) });
    if (i % 60 === 0) console.log('frame', i, '/', n);
  }
  await b.close();
})();
