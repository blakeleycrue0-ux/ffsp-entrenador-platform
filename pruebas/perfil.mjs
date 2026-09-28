/**
 * El alta completa con una cuenta SIN PERFIL, que es el estado que provocaba
 * «violates foreign key constraint "clubs_created_by_fkey"».
 *
 * El servidor simulado se comporta como el de verdad antes del arreglo: si no
 * se ha llamado a `asegurar_perfil`, `create_club` devuelve el error de clave
 * foránea. Así la prueba falla si el cliente deja de llamarla.
 */
import { chromium } from 'playwright';
import { mock, SUPA, j, PERFIL, CLUB, USER } from './mock.mjs';

const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();

let tienePerfil = false;          // la cuenta empieza SIN perfil
const llamadas = [];

await mock(page, { club: null, equipos: [] });
await page.route(`${SUPA}/**`, async (route) => {
  const r = route.request();
  const p = new URL(r.url()).pathname;
  const cuerpo = r.postData() ? JSON.parse(r.postData()) : null;

  if (p.endsWith('/rpc/asegurar_perfil')) {
    llamadas.push('asegurar_perfil');
    const creado = !tienePerfil;
    tienePerfil = true;
    return route.fulfill(j(creado));
  }
  if (p.endsWith('/rpc/create_club')) {
    llamadas.push('create_club');
    if (!tienePerfil) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          code: '23503',
          message: 'insert or update on table "clubs" violates foreign key constraint "clubs_created_by_fkey"',
        }),
      });
    }
    return route.fulfill(j({ ok: true, id: CLUB, name: cuerpo.club_name, short_name: cuerpo.club_short_name }));
  }
  if (p.endsWith('/rpc/passcode_estado')) return route.fulfill(j({ tiene: false, bloqueado_hasta: null, restantes: null }));
  if (p === '/rest/v1/profiles' && r.method() === 'PATCH') {
    llamadas.push('PATCH perfil');
    return route.fulfill(j(tienePerfil ? [{ ...PERFIL, ...cuerpo }] : []));
  }
  if (p === '/rest/v1/teams' && r.method() === 'POST') return route.fulfill(j([{ id: 't9', club_id: CLUB, ...cuerpo, created_by: USER }]));
  return route.fallback();
});

await page.goto('http://localhost:4173/app', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

console.log('1. al cargar se pide el perfil:', llamadas.includes('asegurar_perfil'));

await page.getByRole('button', { name: 'Empezar' }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Ahora no' }).click();
await page.waitForTimeout(400);
await page.locator('input').first().fill('Marta Vives');
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Continuar' }).click();
await page.waitForTimeout(400);

console.log('2. en el paso del club:', await page.locator('h1').first().textContent());
await page.locator('input').first().fill('Ffsp');
await page.getByRole('button', { name: 'Crear el club' }).click();
await page.waitForTimeout(900);

const error = await page.locator('p.text-bad, .text-bad').first().textContent().catch(() => null);
const titulo = await page.locator('h1').first().textContent();
console.log('3. tras crear el club, titular:', JSON.stringify(titulo));
console.log('   error en pantalla:', JSON.stringify(error));
console.log('   ¿aparece el error crudo de Postgres?', String(error ?? '').includes('foreign key') ? 'SÍ (mal)' : 'no');

console.log('\nllamadas al servidor, por orden:', llamadas.join(' → '));
await b.close();
