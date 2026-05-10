'use client';

import { useEffect, useState } from 'react';
import { FiltersModal } from './FiltersModal';
import { VoterFilterFields } from './VoterFilterFields';
import {
  describeVoterFilters,
  emptyVoterFilters,
  type VoterFilterState,
} from '@/lib/voterFilters';

/**
 * Drop-in modal that exposes the full survey-time filter set to every
 * admin page.  Pages just pass their currently-applied state in and a
 * callback for when Apply is clicked.  Draft / Apply / Cancel / Reset /
 * Esc / scroll-lock are all handled internally.  When pages need extra
 * page-specific filters (e.g. audit-log's `action`), they should keep
 * their own modal — this is the standard one for everything else.
 */
export function SharedVoterFiltersModal({
  open,
  title,
  subtitle,
  initial,
  onClose,
  onApply,
  searchPlaceholder,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  initial: VoterFilterState;
  onClose: () => void;
  onApply: (next: VoterFilterState) => void;
  searchPlaceholder?: string;
}) {
  const [draft, setDraft] = useState<VoterFilterState>(initial);
  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

  const draftCount = describeVoterFilters(draft).length;

  function update<K extends keyof VoterFilterState>(key: K, value: VoterFilterState[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <FiltersModal
      open={open}
      title={title}
      subtitle={
        subtitle
          ? `${subtitle}.${draftCount > 0 ? ` ${draftCount} active.` : ''}`
          : draftCount > 0
            ? `${draftCount} active.`
            : undefined
      }
      applyCount={draftCount}
      onClose={onClose}
      onApply={() => onApply(draft)}
      onReset={() => setDraft(emptyVoterFilters)}>
      <VoterFilterFields draft={draft} onChange={update} searchPlaceholder={searchPlaceholder} />
    </FiltersModal>
  );
}

export default SharedVoterFiltersModal;
