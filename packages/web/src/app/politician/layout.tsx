// /politician/* is a read-only suite for the politician role.  We wrap
// every page here in a role-gated AuthGuard that only lets `politician`
// and `super_admin` through (the latter so admins can preview the
// surface).  Anyone else bounces back to /dashboard.
//
// The outer ClientLayout knows to skip its default Sidebar/Header chrome
// for `/politician/*` paths so this layout owns the entire viewport and
// can paint its own Civic-palette chrome via PoliticianShell.

'use client';

import { ReactNode } from 'react';
import AuthGuard from '@/components/AuthGuard';

export default function PoliticianLayout({ children }: { children: ReactNode }) {
  return <AuthGuard allowedRoles={['politician', 'super_admin']}>{children}</AuthGuard>;
}
