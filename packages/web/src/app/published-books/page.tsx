'use client';

/**
 * /published-books — admin triage of /publish form submissions.
 *
 * Super-admins land here from the sidebar.  Lists every author proposal
 * with status chips + a search + status filter; clicking a row opens a
 * side-panel with the full submission, where the admin can change the
 * status (pending → reviewing → approved/rejected/published) and add
 * notes.  Uses the standard admin chrome (sidebar + header) inherited
 * from ClientLayout.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Status = 'pending' | 'reviewing' | 'approved' | 'rejected' | 'published';

interface PublishedBook {
  _id: string;
  authorName: string;
  email: string;
  phone: string;
  title: string;
  genre: string;
  wordCount?: string;
  synopsis?: string;
  package: 'Essential' | 'Analyst' | 'Bureau';
  manuscriptUrl?: string;
  manuscriptName?: string;
  status: Status;
  adminNotes?: string;
  reviewedBy?: { name?: string; email?: string } | null;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  success: boolean;
  data: PublishedBook[];
  pagination: { page: number; limit: number; total: number; pages: number };
  statusCounts: Record<string, number>;
}

const STATUS_LIST: Status[] = ['pending', 'reviewing', 'approved', 'rejected', 'published'];

const STATUS_COLOR: Record<Status, { bg: string; fg: string; ring: string }> = {
  pending: { bg: 'bg-amber-50', fg: 'text-amber-700', ring: 'ring-amber-200' },
  reviewing: { bg: 'bg-blue-50', fg: 'text-blue-700', ring: 'ring-blue-200' },
  approved: { bg: 'bg-emerald-50', fg: 'text-emerald-700', ring: 'ring-emerald-200' },
  rejected: { bg: 'bg-rose-50', fg: 'text-rose-700', ring: 'ring-rose-200' },
  published: { bg: 'bg-violet-50', fg: 'text-violet-700', ring: 'ring-violet-200' },
};

function StatusChip({ s }: { s: Status }) {
  const c = STATUS_COLOR[s];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full ring-1 ${c.bg} ${c.fg} ${c.ring}`}>
      {s}
    </span>
  );
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

export default function PublishedBooksPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Politicians never see this page — they have their own route tree.
  useEffect(() => {
    if (user?.role === 'politician') router.replace('/politician');
  }, [user, router]);

  const [items, setItems] = useState<PublishedBook[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const [selected, setSelected] = useState<PublishedBook | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 25 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (debounced) params.search = debounced;
      const { data } = await api.get<ListResponse>('/published-books', { params });
      setItems(data.data);
      setStatusCounts(data.statusCounts || {});
      setPages(data.pagination.pages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not load submissions');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: Status, adminNotes?: string) => {
    try {
      const { data } = await api.patch<{ data: PublishedBook }>(`/published-books/${id}`, {
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      });
      toast.success(`Marked ${status}`);
      setItems((arr) => arr.map((it) => (it._id === id ? data.data : it)));
      setSelected((s) => (s && s._id === id ? data.data : s));
      // Refresh status counts in the next load tick.
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not update');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this submission? This cannot be undone.')) return;
    try {
      await api.delete(`/published-books/${id}`);
      toast.success('Submission deleted');
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Published books</h1>
          <p className="text-sm text-slate-500 mt-1">
            Author proposals from the public <code>/publish</code> page. Triage status + take notes
            before the book moves to print.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Total: <b className="text-slate-700">{total}</b></span>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label={`All (${Object.values(statusCounts).reduce((s, n) => s + n, 0)})`}
          active={statusFilter === 'all'}
          onClick={() => {
            setStatusFilter('all');
            setPage(1);
          }}
        />
        {STATUS_LIST.map((s) => (
          <FilterChip
            key={s}
            label={`${s.charAt(0).toUpperCase()}${s.slice(1)} (${statusCounts[s] ?? 0})`}
            active={statusFilter === s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          />
        ))}
        <div className="ml-auto flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 min-w-[220px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search title, author, email…"
            className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading submissions…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <div className="text-base font-medium text-slate-700">No submissions yet.</div>
            <div className="text-sm mt-1">
              When an author submits the form on <code>/publish</code>, it lands here.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <Th>Title</Th>
                  <Th>Author</Th>
                  <Th>Package</Th>
                  <Th>Status</Th>
                  <Th>Submitted</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((b) => (
                  <tr
                    key={b._id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelected(b)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 leading-tight">{b.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{b.genre}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700">{b.authorName}</div>
                      <div className="text-xs text-slate-500">{b.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{b.package}</td>
                    <td className="px-4 py-3"><StatusChip s={b.status} /></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(b.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(b);
                        }}
                        className="text-xs font-medium text-brand-600 hover:text-brand-800">
                        Open →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-500">Page {page} of {pages}</div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50">
              ← Prev
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50">
              Next →
            </button>
          </div>
        </div>
      )}

      {selected && (
        <DetailDrawer
          book={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(status, notes) => updateStatus(selected._id, status, notes)}
          onDelete={() => remove(selected._id)}
        />
      )}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      className={`px-4 py-2.5 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
      }`}>
      {label}
    </button>
  );
}

function DetailDrawer({
  book,
  onClose,
  onStatusChange,
  onDelete,
}: {
  book: PublishedBook;
  onClose: () => void;
  onStatusChange: (status: Status, notes?: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(book.adminNotes ?? '');
  useEffect(() => {
    setNotes(book.adminNotes ?? '');
  }, [book._id, book.adminNotes]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
              Submission
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mt-1 leading-tight truncate">
              {book.title}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <StatusChip s={book.status} />
              <span>· {book.package} · {fmtDate(book.createdAt)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 flex-shrink-0 grid place-items-center"
            aria-label="Close">
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Author */}
          <section>
            <SectionLabel>Author</SectionLabel>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <KV k="Name" v={book.authorName} />
              <KV k="Email" v={book.email} mono />
              <KV k="Phone" v={book.phone} mono />
              <KV k="Genre" v={book.genre} />
            </div>
          </section>

          {/* Book */}
          <section>
            <SectionLabel>Book</SectionLabel>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <KV k="Title" v={book.title} />
              <KV k="Package" v={book.package} />
              {book.wordCount && <KV k="Word count" v={book.wordCount} />}
              {book.manuscriptName && <KV k="Manuscript file" v={book.manuscriptName} mono />}
            </div>
            {book.synopsis && (
              <div className="mt-3">
                <SectionLabel>Synopsis</SectionLabel>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                  {book.synopsis}
                </p>
              </div>
            )}
            {book.manuscriptUrl && (
              <div className="mt-3">
                <a
                  href={book.manuscriptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-800 underline">
                  Open manuscript ↗
                </a>
              </div>
            )}
          </section>

          {/* Triage */}
          <section>
            <SectionLabel>Status</SectionLabel>
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_LIST.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s, notes)}
                  disabled={s === book.status}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                    s === book.status
                      ? 'bg-slate-900 text-white border-slate-900 cursor-default'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {book.reviewedBy && book.reviewedAt && (
              <div className="text-xs text-slate-500 mt-2">
                Last reviewed by{' '}
                <b className="text-slate-700">{book.reviewedBy.name || book.reviewedBy.email || '—'}</b>{' '}
                · {fmtDate(book.reviewedAt)}
              </div>
            )}
          </section>

          {/* Notes */}
          <section>
            <SectionLabel>Admin notes</SectionLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes — visible only to admins."
              className="w-full min-h-[100px] p-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => onStatusChange(book.status, notes)}
                disabled={notes === (book.adminNotes ?? '')}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                Save notes
              </button>
              <button
                onClick={() => setNotes(book.adminNotes ?? '')}
                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
                Reset
              </button>
            </div>
          </section>
        </div>

        <div className="mt-auto px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onDelete}
            className="text-sm text-rose-600 hover:text-rose-800 font-medium">
            Delete submission
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm hover:bg-slate-100">
            Close
          </button>
        </div>
      </aside>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
      {children}
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k}</div>
      <div
        className={`mt-0.5 text-sm text-slate-800 break-words ${mono ? 'font-mono text-[13px]' : ''}`}>
        {v}
      </div>
    </div>
  );
}
