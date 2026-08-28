import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';
import { CreateMenu } from './CreateMenu';
import { GlobalSearch } from './GlobalSearch';
import { AssistantLauncher } from '@/features/assistant/AssistantLauncher';

export function AppShell() {
  const [search, setSearch] = useState(false);
  const [create, setCreate] = useState(false);
  const { pathname } = useLocation();

  // Atajos: ⌘K buscar · ⌘J asistente · N crear
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
    <div className="min-h-screen bg-ink-50/40">
      <Sidebar onCreate={openCreate} />

      <div className="lg:pl-[var(--sidebar-w)]">
        <Topbar onSearch={() => setSearch(true)} onCreate={openCreate} />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-[calc(96px+var(--safe-bottom))] pt-6 lg:px-8 lg:pb-14">
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <AssistantLauncher />
      <GlobalSearch open={search} onClose={() => setSearch(false)} />
      <CreateMenu open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
