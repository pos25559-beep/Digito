const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage();
  p.on('console', m => console.log('C', m.text().slice(0, 200)));
  await p.goto('http://localhost:8095/render/lm.html'); await p.waitForFunction('window.done', null, { timeout: 90000 });
  console.log(JSON.stringify(await p.evaluate(() => ({ err: window.ERR, lm: window.LM })))); await b.close(); })();
