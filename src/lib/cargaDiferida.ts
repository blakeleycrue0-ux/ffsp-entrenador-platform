/**
 * Cargar una pantalla que llega aparte, y sobrevivir a que no llegue.
 * ---------------------------------------------------------------------------
 * Cada sección se descarga por su cuenta la primera vez que se abre. Eso hace
 * que la aplicación arranque antes, pero tiene una pega que se paga cara:
 *
 *  · Si entre medias se publica una versión nueva, los archivos de la anterior
 *    dejan de existir. Una pestaña que llevaba horas abierta sigue pidiendo
 *    los de antes.
 *  · Si la red se cae un segundo —un móvil en un campo, con media raya—, la
 *    descarga falla.
 *
 * Y entonces pasa lo de verdad grave: **`React.lazy` SE QUEDA CON LA PROMESA
 * RECHAZADA**. El botón «Volver a intentarlo» vuelve a montar el componente,
 * que devuelve el mismo rechazo guardado, y falla otra vez. Para siempre. No
 * hay forma de salir sin recargar la página a mano, y ninguna sección
 * funciona mientras tanto. Medido: ocho fragmentos servidos mal y las trece
 * secciones caídas, con el botón de reintentar sin efecto.
 *
 * Lo que hace esto: si la descarga falla, recarga la página UNA vez. La
 * recarga trae el índice nuevo —que no se guarda en caché— y con él los
 * nombres correctos, así que se arregla sola y sin que nadie se entere. Si
 * después de recargar vuelve a fallar, ya no insiste: deja pasar el error para
 * que se vea un mensaje honesto en vez de dar vueltas recargando.
 */

const LLAVE = 'p360.recarga-por-fragmento';

/** Sólo los fallos de descarga del propio módulo, no los errores del módulo. */
export function esFalloDeDescarga(e: unknown): boolean {
  const m = (e as { message?: string } | null)?.message ?? String(e ?? '');
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Failed to load module script|Unable to preload CSS/i
    .test(m);
}

const leer = (): string | null => {
  try { return sessionStorage.getItem(LLAVE); } catch { return null; }
};
const marcar = () => { try { sessionStorage.setItem(LLAVE, '1'); } catch { /* modo privado */ } };
const olvidar = () => { try { sessionStorage.removeItem(LLAVE); } catch { /* modo privado */ } };

/**
 * Envuelve el `import()` de una pantalla. Se usa así:
 *
 *     const Dashboard = lazy(cargaDiferida(() => import('@/features/...')));
 */
export function cargaDiferida<T>(importar: () => Promise<T>): () => Promise<T> {
  return async () => {
    try {
      const modulo = await importar();
      // Ha llegado: se olvida el intento anterior, si lo hubo.
      olvidar();
      return modulo;
    } catch (e) {
      if (!esFalloDeDescarga(e) || leer()) throw e;

      marcar();
      window.location.reload();

      /* No se resuelve a propósito. Recargar tarda un instante y, si aquí se
         devolviera un error, se vería el cartel rojo parpadear justo antes de
         que la página se vaya. */
      return new Promise<T>(() => {});
    }
  };
}
