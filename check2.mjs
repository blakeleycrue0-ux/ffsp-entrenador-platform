import { chromium } from 'playwright';
const OUT = '/tmp/claude-0/-home-user-ffsp-entrenador-platform/d6b0b103-545d-53a8-a180-1a10898a6d20/scratchpad';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [name, path, vp] of [
  ['login', '/entrar', { width: 1280, height: 900 }],
  ['legal', '/privacidad', { width: 1000, height: 1200 }],
  ['landing-movil', '/', { width: 390, height: 844 }],
]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto('http://localhost:4173' + path, { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await p.close();
}
await b.close();
console.log('capturas listas');
