'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import AuthGuard from '@/components/AuthGuard';

// Routes that bypass the AuthGuard and sidebar/header chrome.
// "/" is the public Pollistics landing page; anything that needs auth
// should live under /dashboard, /voters, /booths, etc.
const publicRoutes = ['/login', '/', '/download', '/about', '/search', '/explore-public', '/report'];
// Routes that handle their OWN auth + chrome and need no outer chrome
// from this layout.  /politician/* uses the Civic Insight palette and
// its own PoliticianShell, so we skip the admin slate Sidebar+Header
// for that whole subtree.  Auth gating for those routes is enforced by
// `app/politician/layout.tsx`.
const selfShelledPrefixes = ['/politician'];
const COLLAPSED_KEY = 'sidebar-collapsed';

/**
 * Global redirect guard for the politician role.  Sits inside the
 * AuthProvider so we have access to `useAuth()`, and watches every
 * navigation.  If the logged-in user is a politician on any path that
 * is NOT under `/politician/*` (and not `/login`), bounce them to
 * `/politician`.  Belt-and-braces over individual page-level redirects
 * — politicians should never even see an admin route flash.
 */
function PoliticianRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role !== 'politician') return;
    if (!pathname) return;
    if (pathname === '/login') return;
    if (pathname === '/politician' || pathname.startsWith('/politician/')) return;
    // Public marketing pages — let politicians read them.
    if (['/', '/download', '/about', '/search', '/explore-public', '/report'].includes(pathname)) return;
    router.replace('/politician');
  }, [user, loading, pathname, router]);

  return <>{children}</>;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.includes(pathname || '');
  const isSelfShelled = selfShelledPrefixes.some(
    (p) => pathname === p || pathname?.startsWith(p + '/'),
  );
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
      <PoliticianRouteGuard>
        {isPublicRoute || isSelfShelled ? (
          children
        ) : (
          <AuthGuard>
            <div className="flex min-h-screen bg-slate-50">
              <Sidebar />
              <div
                className="admin-main flex-1 flex flex-col min-h-screen transition-all duration-200"
                style={
                  {
                    // CSS var so the mobile media query can override it
                    // to 0 without fighting an inline style.
                    ['--admin-margin' as string]: `${sidebarCollapsed ? 80 : 280}px`,
                  } as React.CSSProperties
                }
              >
                <Header />
                <main className="flex-1 p-4 sm:p-6 lg:p-8 page-enter">{children}</main>
              </div>
            </div>
            <style jsx global>{`
              .admin-main {
                margin-left: var(--admin-margin);
              }
              @media (max-width: 1023px) {
                .admin-main {
                  margin-left: 0 !important;
                }
              }
            `}</style>
          </AuthGuard>
        )}
      </PoliticianRouteGuard>
    </AuthProvider>
  );
}
