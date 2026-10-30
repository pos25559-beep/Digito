const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
 const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
 p.on('pageerror', e => console.log('[err]', e.message)); p.on('console', m => console.log('[page]', m.text()));
 await p.goto('http://127.0.0.1:8765/'+process.argv[2]); await p.waitForFunction('window.ready===true',null,{timeout:120000});
 for (const t of process.argv.slice(3)) { await p.evaluate(x=>window.frame(x), +t); await p.screenshot({ path: `/tmp/claude-0/sc/a_${t}.png` }); }
 await b.close(); })();
