const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [scene, out, frames, w, h, extra, from, to] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => { if (m.type() === 'error') console.log('CERR', m.text()); });
  await p.goto(`http://localhost:8095/render/${scene==='measure'?'measure':'render'}.html?scene=${scene}&w=${w}&h=${h}&frames=${frames}${extra || ''}`);
  await p.waitForFunction('window.ready === true', null, { timeout: 120000 });
  fs.mkdirSync(out, { recursive: true });
  const F = +frames, a = from ? +from : 0, z = to ? +to : F;
  const t0 = Date.now();
  for (let f = a; f < z; f++) {
    const d = await p.evaluate(f => window.renderFrame(f), f);
    fs.writeFileSync(`${out}/f${String(f).padStart(4, '0')}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
    if (f === a) console.log('first frame', Date.now() - t0, 'ms');
  }
  console.log('done', scene, (Date.now() - t0) / 1000, 's');
  await b.close();
})();
