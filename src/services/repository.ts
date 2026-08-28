/**
 * Repositorio de datos.
 * ---------------------------------------------------------------------------
 * Única puerta de entrada a la persistencia. Hoy resuelve contra un almacén
 * local (localStorage + datos de demostración); el día que exista un backend,
 * sólo cambia la implementación de estas cuatro funciones — la UI no se entera.
 *
 *   load()   → GET   /api/club
 *   save()   → PATCH /api/club
 *   reset()  → restaurar datos de demostración
 */

import type { ClubData } from '@/types';
import { seedClubData } from '@/data/seed';

const STORAGE_KEY = 'ffsp-vle:club-data:v1';
/** Cambia esta marca para invalidar los datos guardados en clientes antiguos. */
const DATA_STAMP = 'seed-3';

interface Envelope {
  stamp: string;
  savedAt: string;
  data: ClubData;
}

const latency = (ms = 240) => new Promise((r) => setTimeout(r, ms));

export const repository = {
  /** Carga el estado del club. Simula la latencia de red para que los skeletons sean reales. */
  async load(): Promise<ClubData> {
    await latency(320);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const env = JSON.parse(raw) as Envelope;
        if (env.stamp === DATA_STAMP) return env.data;
      }
    } catch {
      /* almacenamiento no disponible o corrupto: se cae a los datos de demo */
    }
    const fresh = seedClubData();
    this.save(fresh);
    return fresh;
  },

  save(data: ClubData): void {
    try {
      const env: Envelope = { stamp: DATA_STAMP, savedAt: new Date().toISOString(), data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
    } catch {
      /* modo privado / cuota: la sesión sigue funcionando en memoria */
    }
  },

  async reset(): Promise<ClubData> {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* no-op */
    }
    await latency(180);
    const fresh = seedClubData();
    this.save(fresh);
    return fresh;
  },
};
