'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';

const publicRoutes = ['/login'];
const COLLAPSED_KEY = 'sidebar-collapsed';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.includes(pathname || '');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === 'true') setSidebarCollapsed(true);

    function handleToggle(e: Event) {
      const detail = (e as CustomEvent).detail;
      setSidebarCollapsed(detail.collapsed);
    }

    window.addEventListener('sidebar-toggle', handleToggle);
    return () => window.removeEventListener('sidebar-toggle', handleToggle);
  }, []);

  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            background: '#0f172a',
            color: '#fff',
            fontSize: '14px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.08)',
          },
        }}
      />
      {isPublicRoute ? (
        children
      ) : (
        <AuthGuard>
          <div className="flex min-h-screen bg-slate-50">
            <Sidebar />
            <div
              className="flex-1 flex flex-col min-h-screen transition-all duration-200"
              style={{ marginLeft: sidebarCollapsed ? 80 : 280 }}
            >
              <Header />
              <main className="flex-1 p-8 page-enter">{children}</main>
            </div>
          </div>
        </AuthGuard>
      )}
    </AuthProvider>
  );
}
