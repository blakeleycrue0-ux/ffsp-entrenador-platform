/**
 * Exportación a imagen.
 * ---------------------------------------------------------------------------
 * Genera un PNG del instante que hay en pantalla. No exportamos vídeo: la
 * grabación desde el navegador depende de códecs que no están en todos los
 * equipos, y preferimos no ofrecer algo que puede fallar sin avisar.
 */

const limpiarNombre = (name: string) =>
  name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'jugada';

export async function exportSceneImage(svg: SVGSVGElement | null, name: string): Promise<void> {
  if (!svg) throw new Error('sin lienzo');

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const rect = svg.getBoundingClientRect();
  clone.setAttribute('width', String(rect.width));
  clone.setAttribute('height', String(rect.height));

  const source = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('no se ha podido leer el lienzo'));
      img.src = url;
    });

    const width = 1800;
    const height = Math.round((width * rect.height) / Math.max(1, rect.width));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('sin contexto de dibujo');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const link = document.createElement('a');
    link.download = `${limpiarNombre(name)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
