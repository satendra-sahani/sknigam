// Mirror of the web hook — single source of truth on mobile for the
// politician's admin-assigned scope.  Calls /auth/me once and surfaces
// `hasAssignedBooths` + the booth-id list so screens can skip the
// drill-down and show only what was paid for.

import { useEffect, useState } from 'react';
import api from '../../services/api';

export interface PoliticianScopeState {
  assignedBoothIds: string[];
  assemblyConstituency?: string;
  district?: string;
  hasAssignedBooths: boolean;
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
      .catch((err: any) => {
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
