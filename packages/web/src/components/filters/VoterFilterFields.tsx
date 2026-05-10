'use client';

import React from 'react';
import {
  FilterSection,
  FilterLabel,
  FilterInput,
  LabeledFilterInput,
  LabeledFilterSelect,
  ChipMulti,
  NumberRange,
} from './FilterPrimitives';
import {
  CASTES,
  UP_DISTRICTS,
  subCastesFor,
  RELIGIONS,
  VOTING_INTENTIONS,
  PARTIES,
  INFLUENCE_LEVELS,
  EDUCATION_LEVELS,
  GENDERS,
  VERIFIED_OPTS,
  GRIEVANCE_OPTIONS,
  type VoterFilterState,
} from '@/lib/voterFilters';

/**
 * Renders the full set of survey-time filter sections.  Used by every
 * admin page's filter modal so the shape of "filter a voter / scope by a
 * voter property" is identical app-wide.  Pages may add their own extra
 * sections (e.g. the audit log adds Action / Actor) by composing this
 * component alongside their own JSX inside <FiltersModal>.
 */
export function VoterFilterFields({
  draft,
  onChange,
  searchPlaceholder = 'Search …',
}: {
  draft: VoterFilterState;
  onChange: <K extends keyof VoterFilterState>(key: K, value: VoterFilterState[K]) => void;
  searchPlaceholder?: string;
}) {
  function changeCaste(next: string) {
    // If a sub-caste is currently picked, drop it when the parent caste no
    // longer supports it — keeps impossible (caste, sub-caste) combos out.
    const valid = subCastesFor(next).some((s) => s.code === draft.subCaste);
    onChange('caste', next);
    if (!valid) onChange('subCaste', '');
  }

  function toggleGrievance(g: string) {
    const cur = draft.grievances;
    onChange('grievances', cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]);
  }

  const subCasteOptions = subCastesFor(draft.caste);

  return (
    <>
      <FilterSection title="Search" subtitle="Match by name, EPIC, mobile or father's name">
        <FilterInput
          value={draft.search}
          onChange={(v) => onChange('search', v)}
          placeholder={searchPlaceholder}
        />
      </FilterSection>

      <FilterSection title="Location" subtitle="District + assembly constituency">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <LabeledFilterSelect
            label="District"
            value={draft.district}
            onChange={(v) => onChange('district', v)}
            options={[
              { value: '', label: 'Any district' },
              ...UP_DISTRICTS.map((d) => ({ value: d, label: d })),
            ]}
          />
          <LabeledFilterInput
            label="Assembly constituency"
            value={draft.constituency}
            onChange={(v) => onChange('constituency', v)}
            placeholder="e.g. Lucknow Cantt"
          />
        </div>
      </FilterSection>

      <FilterSection title="Identity" subtitle="Religion, caste hierarchy">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LabeledFilterSelect
            label="Religion"
            value={draft.religion}
            onChange={(v) => onChange('religion', v)}
            options={[{ value: '', label: 'Any' }, ...RELIGIONS.map((r) => ({ value: r, label: r }))]}
          />
          <LabeledFilterSelect
            label="Caste"
            value={draft.caste}
            onChange={changeCaste}
            options={[
              { value: '', label: 'Any caste' },
              ...CASTES.map((c) => ({ value: c.code, label: c.label })),
            ]}
          />
          <div>
            <FilterLabel>Sub-caste</FilterLabel>
            <select
              value={draft.subCaste}
              onChange={(e) => onChange('subCaste', e.target.value)}
              disabled={!draft.caste}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/15 focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed">
              <option value="">{draft.caste ? 'Any sub-caste' : 'Pick caste first'}</option>
              {subCasteOptions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Demographics" subtitle="Gender, age range, education">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LabeledFilterSelect
            label="Gender"
            value={draft.gender}
            onChange={(v) => onChange('gender', v)}
            options={[{ value: '', label: 'Any' }, ...GENDERS]}
          />
          <NumberRange
            label="Age range"
            minValue={draft.ageMin}
            maxValue={draft.ageMax}
            onMinChange={(v) => onChange('ageMin', v)}
            onMaxChange={(v) => onChange('ageMax', v)}
          />
          <LabeledFilterSelect
            label="Education"
            value={draft.educationLevel}
            onChange={(v) => onChange('educationLevel', v)}
            options={[{ value: '', label: 'Any' }, ...EDUCATION_LEVELS.map((l) => ({ value: l, label: l }))]}
          />
        </div>
      </FilterSection>

      <FilterSection title="Political" subtitle="Voting intention, party preference, influence">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LabeledFilterSelect
            label="Voting intention"
            value={draft.votingIntention}
            onChange={(v) => onChange('votingIntention', v)}
            options={[{ value: '', label: 'Any' }, ...VOTING_INTENTIONS.map((v) => ({ value: v, label: v }))]}
          />
          <LabeledFilterSelect
            label="Party support"
            value={draft.partySupport}
            onChange={(v) => onChange('partySupport', v)}
            options={[{ value: '', label: 'Any' }, ...PARTIES.map((p) => ({ value: p, label: p }))]}
          />
          <LabeledFilterSelect
            label="Influence level"
            value={draft.influenceLevel}
            onChange={(v) => onChange('influenceLevel', v)}
            options={[{ value: '', label: 'Any' }, ...INFLUENCE_LEVELS.map((l) => ({ value: l, label: l }))]}
          />
        </div>
      </FilterSection>

      <FilterSection title="Field activity" subtitle="Verification status, visit date range">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <LabeledFilterSelect
            label="Status"
            value={draft.verified}
            onChange={(v) => onChange('verified', v as VoterFilterState['verified'])}
            options={VERIFIED_OPTS}
          />
          <div>
            <FilterLabel>Visit from</FilterLabel>
            <FilterInput type="date" value={draft.visitDateFrom} onChange={(v) => onChange('visitDateFrom', v)} />
          </div>
          <div>
            <FilterLabel>Visit to</FilterLabel>
            <FilterInput type="date" value={draft.visitDateTo} onChange={(v) => onChange('visitDateTo', v)} />
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Grievances" subtitle="Voters whose visits flagged ALL of the chosen issues">
        <ChipMulti
          options={GRIEVANCE_OPTIONS}
          selected={draft.grievances}
          onToggle={toggleGrievance}
        />
      </FilterSection>
    </>
  );
}

export default VoterFilterFields;
