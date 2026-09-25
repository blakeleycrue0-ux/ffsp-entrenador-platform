import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { CreateMenu } from './CreateMenu';
import { GlobalSearch } from './GlobalSearch';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function AppShell() {
  const [search, setSearch] = useState(false);
  const [create, setCreate] = useState(false);
  const { pathname } = useLocation();

  // Atajos: ⌘K buscar · ⌘I crear
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if (mod && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setCreate(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const openCreate = useCallback(() => setCreate(true), []);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar onCreate={openCreate} />

      <div className="lg:pl-[var(--sidebar-w)]">
        <Topbar onSearch={() => setSearch(true)} onCreate={openCreate} />
        <main className="mx-auto w-full max-w-[1320px] px-4 pb-[calc(88px+var(--safe-bottom))] pt-5 lg:px-6 lg:pb-12">
          {/* El límite va DENTRO del armazón, no fuera: si una pantalla falla,
              el menú y la búsqueda siguen ahí y se puede ir a otro sitio. La
              clave es la ruta, así que navegar reintenta solo. */}
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <BottomNav />
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
      <CreateMenu open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
