'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  label: string;
  href: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Booths', href: '/booths', roles: ['super_admin'] },
  { label: 'Voters', href: '/voters', roles: ['super_admin', 'staff'] },
  { label: 'Staff', href: '/staff', roles: ['super_admin'] },
  { label: 'Assignments', href: '/assignments', roles: ['super_admin', 'staff'] },
  { label: 'Analytics', href: '/analytics', roles: ['super_admin', 'politician'] },
  { label: 'Subscriptions', href: '/subscriptions', roles: ['super_admin', 'politician'] },
  { label: 'Audit Log', href: '/audit-log', roles: ['super_admin'] },
];

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  staff: 'Field Staff',
  politician: 'Politician',
};

const COLLAPSED_KEY = 'sidebar-collapsed';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    if (stored === 'true') setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
  };

  const filteredItems = navItems.filter((item) => !item.roles || (user?.role && item.roles.includes(user.role)));

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-white flex flex-col z-50 shadow-xl transition-all duration-200 ${
        collapsed ? 'w-20' : 'w-[280px]'
      }`}
    >
      <div className={`flex items-center gap-3 border-b border-white/10 ${collapsed ? 'px-4 py-5 justify-center' : 'px-6 py-5'}`}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white">P</div>
        {!collapsed && (
          <div>
            <h1 className="text-base font-bold tracking-tight text-white">POLLSTICS</h1>
            <p className="text-[11px] text-slate-400 leading-none mt-0.5">Voter Campaign Platform</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-1">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                collapsed ? 'justify-center px-3 py-3' : 'px-4 py-2.5'
              } ${isActive ? 'bg-red-600/20 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-red-500" />}
              {!collapsed && <span>{item.label}</span>}
              {collapsed && <span className="text-xs font-bold">{item.label[0]}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-2">
        <button
          onClick={toggleCollapse}
          className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? '>' : '< Collapse'}
        </button>
      </div>

      <div className={`border-t border-white/10 ${collapsed ? 'px-3 py-4' : 'px-4 py-4'}`}>
        {user && (
          <div className={`flex items-center gap-3 mb-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white font-semibold text-xs">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium truncate text-white">{user.name}</p>
                <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-600/30 text-red-300 border border-red-500/20">
                  {roleLabels[user.role] || user.role}
                </span>
              </div>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {collapsed ? 'x' : 'Logout'}
        </button>
      </div>
    </aside>
  );
}
