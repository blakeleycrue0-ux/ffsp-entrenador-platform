/**
 * Lector de CSV.
 * ---------------------------------------------------------------------------
 * Pequeño y tolerante, porque los archivos reales vienen de Excel: separador
 * coma o punto y coma, comillas, saltos de línea dentro de una celda y la marca
 * de orden de bytes que Excel añade al principio.
 *
 * No depende de ninguna librería: son unas pocas reglas y así no se arrastra
 * peso ni sorpresas.
 */

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

/** Detecta el separador contando cuál aparece más en la primera línea. */
function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length - 1] as const);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

export function parseCsv(input: string): CsvTable {
  const text = input.replace(/^﻿/, '').trim();
  if (!text) return { headers: [], rows: [] };

  const d = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += c;
      }
      continue;
    }

    if (c === '"') {
      quoted = true;
    } else if (c === d) {
      row.push(cell.trim());
      cell = '';
    } else if (c === '\n') {
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') {
      cell += c;
    }
  }
  row.push(cell.trim());
  rows.push(row);

  const [headers = [], ...body] = rows;
  // Se descartan las filas completamente vacías que deja Excel al final.
  return { headers, rows: body.filter((r) => r.some((v) => v !== '')) };
}
