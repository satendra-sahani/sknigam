// usePoliticianScope — single source of truth on the client for what
// the logged-in politician is allowed to see.  Mirrors the server
// helper in packages/api/src/utils/politicianScope.ts.
//
// Calls /api/auth/me once on mount so every /politician/* page can
// branch on `hasAssignedBooths`.  The server already enforces scoping
// on every endpoint — this hook is purely UX (skip the State→AC
// funnel when the politician is already scoped to booths, paint
// "assigned booths only" messaging, etc.).

'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

export interface PoliticianScopeState {
  /** Booth ObjectIds (as strings) that admin assigned to the politician. */
  assignedBoothIds: string[];
  assemblyConstituency?: string;
  district?: string;
  /** True when the user has at least one explicit assigned booth. */
  hasAssignedBooths: boolean;
  /** True when admin has not granted any scope at all (booths or AC). */
  isEmpty: boolean;
  loading: boolean;
  error?: string;
}

const EMPTY: PoliticianScopeState = {
  assignedBoothIds: [],
  hasAssignedBooths: false,
  isEmpty: true,
  loading: true,
};

export function usePoliticianScope(): PoliticianScopeState {
  const [state, setState] = useState<PoliticianScopeState>(EMPTY);

  useEffect(() => {
    let mounted = true;
    api
      .get('/auth/me')
      .then((res) => {
        if (!mounted) return;
        const u = res.data?.data || {};
        const ids: string[] = Array.isArray(u.assignedBoothIds)
          ? u.assignedBoothIds.map((x: any) => String(x))
          : [];
        setState({
          assignedBoothIds: ids,
          assemblyConstituency: u.assemblyConstituency,
          district: u.district,
          hasAssignedBooths: ids.length > 0,
          isEmpty: ids.length === 0 && !u.assemblyConstituency,
          loading: false,
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setState({
          assignedBoothIds: [],
          hasAssignedBooths: false,
          isEmpty: true,
          loading: false,
          error: err?.response?.data?.error || 'Failed to load scope',
        });
      });
    return () => {
      mounted = false;
    };
  }, []);

  return state;
}
