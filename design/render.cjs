// Converte design/svg/*.svg em PNG @2x (para revisão/PDF) e WebP (para o site)
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
(async () => {
  const dir = path.join(__dirname, 'svg'); const out = path.join(__dirname, 'png'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(dir, f), 'utf8');
    const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/);
    const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
    await p.goto('file://' + path.join(dir, f)); await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(out, f.replace('.svg', '.png')) });
    await p.close();
  }
  await b.close(); console.log('rendered');
})();
