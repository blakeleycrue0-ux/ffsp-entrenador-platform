import { chromium } from 'playwright';

const OUT = '/tmp/claude-0/-home-user-ffsp-entrenador-platform/d6b0b103-545d-53a8-a180-1a10898a6d20/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/01-landing.png`, fullPage: true });

// Pulsar Reproducir y muestrear la posición del balón en varios instantes
await page.getByRole('button', { name: /Reproducir/ }).click();

const ballPositions = [];
for (let i = 0; i < 14; i++) {
  const t = await page.evaluate(() => {
    const g = [...document.querySelectorAll('svg g[transform]')];
    // el balón es el <g> cuyo hijo es un circle de r pequeño sin texto
    const ball = g.find((el) => {
      const c = el.querySelector('circle');
      return c && !el.querySelector('text') && parseFloat(c.getAttribute('r')) < 1.2;
    });
    return ball ? ball.getAttribute('transform') : null;
  });
  ballPositions.push(t);
  await page.waitForTimeout(220);
}
console.log('Trayectoria del balón muestreada cada 220 ms:');
ballPositions.forEach((p, i) => console.log(`  ${String(i * 220).padStart(5)} ms  ${p}`));

const parsed = ballPositions.filter(Boolean).map((s) => s.match(/translate\(([-\d.]+) ([-\d.]+)\)/)).filter(Boolean).map((m) => [parseFloat(m[1]), parseFloat(m[2])]);
const distinct = new Set(parsed.map((p) => p.join(','))).size;
console.log(`\nMuestras distintas: ${distinct} de ${parsed.length}`);

await page.screenshot({ path: `${OUT}/02-board-playing.png` });
if (errors.length) console.log('\nERRORES EN CONSOLA:\n' + errors.join('\n'));
else console.log('\nSin errores de consola.');
await browser.close();
