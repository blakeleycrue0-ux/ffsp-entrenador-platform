/**
 * Toasts — confirmaciones y errores comprensibles.
 * Regla del producto: nunca "Error 500"; siempre qué ha pasado y qué hacer.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn, uid } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  success: (title: string, description?: string, action?: ToastItem['action']) => void;
  error: (title: string, description?: string, action?: ToastItem['action']) => void;
  info: (title: string, description?: string, action?: ToastItem['action']) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 size={18} className="text-pitch" />,
  error: <AlertCircle size={18} className="text-danger" />,
  info: <Info size={18} className="text-brand-600" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => setItems((l) => l.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string, action?: ToastItem['action']) => {
      const id = uid('toast');
      setItems((l) => [...l, { id, tone, title, description, action }]);
      setTimeout(() => remove(id), action ? 7000 : 4200);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d, a) => push('success', t, d, a),
      error: (t, d, a) => push('error', t, d, a),
      info: (t, d, a) => push('info', t, d, a),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex flex-col items-center gap-2 p-4 pb-[calc(80px+var(--safe-bottom))] sm:items-end lg:pb-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-white p-3.5 shadow-pop animate-fade-up',
              t.tone === 'error' ? 'border-danger/25' : 'border-ink-200',
            )}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium leading-snug text-ink-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{t.description}</p>}
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    remove(t.id);
                  }}
                  className="mt-2 text-[13px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="-mr-1 -mt-1 rounded-lg p-1.5 text-ink-300 transition-colors hover:bg-ink-100 hover:text-ink-600"
              aria-label="Cerrar aviso"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
