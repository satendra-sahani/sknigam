// /politician/saved — read-only list of segments curated by the
// campaign team.  No saved-segments API endpoint exists yet, so this
// page shows a transparent "feature pending" empty state rather than
// painting fake content under the politician's name.

'use client';

import PoliticianShell from '@/components/politician/Shell';
import { Card, Eyebrow } from '@/components/politician/Atoms';
import { T } from '@/components/politician/tokens';

export default function PoliticianSaved() {
  return (
    <PoliticianShell title="Saved · सेव की गई सूचियाँ">
      <Card p={20}>
        <Eyebrow>No segments yet · सूची नहीं</Eyebrow>
        <div
          style={{
            marginTop: 8,
            fontSize: 17,
            fontWeight: 700,
            color: T.ink,
            letterSpacing: -0.2,
          }}>
          Your campaign team hasn&apos;t saved any segments yet.
        </div>
        <p
          style={{
            marginTop: 8,
            fontSize: 12.5,
            color: T.mutedDeep,
            lineHeight: 1.5,
            maxWidth: 640,
          }}>
          Segments are curated by your campaign admin in the desktop app — for
          example &quot;first-time voters&quot; or &quot;minority booths ≥
          60%&quot;. Once they save one, it shows up here and you can drill
          into the voters it contains.
        </p>
      </Card>
    </PoliticianShell>
  );
}
