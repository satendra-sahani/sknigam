'use client';

type Props = { className?: string; style?: React.CSSProperties };

export function Skel({ className = '', style }: Props) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function TableRowSkel({
  widths,
  stagger = 0,
}: {
  widths: (string | { w: string; alignRight?: boolean; lines?: number })[];
  stagger?: number;
}) {
  return (
    <tr
      style={{
        animation: 'fadeInUp 0.35s ease-out both',
        animationDelay: `${stagger}ms`,
      }}>
      {widths.map((col, i) => {
        const cfg = typeof col === 'string' ? { w: col } : col;
        return (
          <td key={i} className="px-4 py-3">
            {cfg.lines && cfg.lines > 1 ? (
              <div className="space-y-1.5">
                <Skel className="h-4" style={{ width: cfg.w }} />
                <Skel className="h-3 w-20" />
              </div>
            ) : (
              <Skel
                className={`h-4 rounded ${cfg.alignRight ? 'ml-auto' : ''}`}
                style={{ width: cfg.w }}
              />
            )}
          </td>
        );
      })}
    </tr>
  );
}

export function SkeletonTable({
  columns,
  rows = 8,
}: {
  columns: (string | { w: string; alignRight?: boolean; lines?: number })[];
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkel key={i} widths={columns} stagger={i * 45} />
      ))}
    </>
  );
}

export function CardSkeleton({
  className = '',
  stagger = 0,
  lines = 3,
}: {
  className?: string;
  stagger?: number;
  lines?: number;
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200/60 p-5 shadow-sm ${className}`}
      style={{
        animation: 'fadeInUp 0.4s ease-out both',
        animationDelay: `${stagger}ms`,
      }}>
      <Skel className="h-4 w-28" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skel
          key={i}
          className="h-3 mt-2.5"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
