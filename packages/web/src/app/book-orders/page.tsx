'use client';

/**
 * /book-orders — admin triage of bookstore buy requests (a.k.a. leads).
 *
 * Same layout pattern as /published-books:
 *   - status filter chips with live counts,
 *   - debounced search across customer/email/phone/book title/slug,
 *   - paginated table, click a row to open a right-side drawer with
 *     the full order, change the status (new → contacted → shipped →
 *     delivered, or cancelled), edit + save admin notes, or delete.
 * Adds a "committed revenue" stat that aggregates total on every
 * non-cancelled order so the admin sees real money-on-the-table.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Status = 'new' | 'contacted' | 'shipped' | 'delivered' | 'cancelled';

interface BookOrder {
  _id: string;
  bookId?: { _id: string; slug: string; title: string; coverUrl?: string } | string;
  bookSlug: string;
  bookTitle: string;
  bookAuthor: string;
  format: 'Paperback' | 'E-book' | 'Hardcover';
  unitPrice: number;
  quantity: number;
  shipping: number;
  total: number;
  customerName: string;
  email: string;
  phone: string;
  pincode: string;
  address: string;
  paymentMethod: 'UPI' | 'Card' | 'NetBanking' | 'COD';
  status: Status;
  adminNotes?: string;
  reviewedBy?: { name?: string; email?: string } | null;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListResponse {
  success: boolean;
  data: BookOrder[];
  pagination: { page: number; limit: number; total: number; pages: number };
  statusCounts: Record<string, number>;
  revenue: { total: number; count: number };
}

const STATUS_LIST: Status[] = ['new', 'contacted', 'shipped', 'delivered', 'cancelled'];

const STATUS_COLOR: Record<Status, { bg: string; fg: string; ring: string }> = {
  new: { bg: 'bg-amber-50', fg: 'text-amber-700', ring: 'ring-amber-200' },
  contacted: { bg: 'bg-blue-50', fg: 'text-blue-700', ring: 'ring-blue-200' },
  shipped: { bg: 'bg-indigo-50', fg: 'text-indigo-700', ring: 'ring-indigo-200' },
  delivered: { bg: 'bg-emerald-50', fg: 'text-emerald-700', ring: 'ring-emerald-200' },
  cancelled: { bg: 'bg-rose-50', fg: 'text-rose-700', ring: 'ring-rose-200' },
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

function fmtDate(d?: string) {
  if (!d) return '—';
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

const inr = (n: number) =>
  n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function BookOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user?.role === 'politician') router.replace('/politician');
  }, [user, router]);

  const [items, setItems] = useState<BookOrder[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [revenue, setRevenue] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
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

  const [selected, setSelected] = useState<BookOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 25 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (debounced) params.search = debounced;
      const { data } = await api.get<ListResponse>('/book-orders', { params });
      setItems(data.data);
      setStatusCounts(data.statusCounts || {});
      setRevenue(data.revenue || { total: 0, count: 0 });
      setPages(data.pagination.pages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: Status, adminNotes?: string) => {
    try {
      const { data } = await api.patch<{ data: BookOrder }>(`/book-orders/${id}`, {
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      });
      toast.success(`Marked ${status}`);
      setItems((arr) => arr.map((it) => (it._id === id ? data.data : it)));
      setSelected((s) => (s && s._id === id ? data.data : s));
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not update');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this order? This cannot be undone.')) return;
    try {
      await api.delete(`/book-orders/${id}`);
      toast.success('Order deleted');
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not delete');
    }
  };

  const totalCount = useMemo(
    () => Object.values(statusCounts).reduce((s, n) => s + n, 0),
    [statusCounts],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Buy requests (leads)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Customer orders from <code>/bookstore</code> — payment isn&apos;t wired in yet, so
            treat each as a lead: contact the customer, ship the book, mark delivered.
          </p>
        </div>
        <div className="flex items-end gap-4">
          <Stat label="Orders" value={String(totalCount)} />
          <Stat label="Committed" value={inr(revenue.total)} sub={`${revenue.count} non-cancelled`} />
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label={`All (${totalCount})`}
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
            placeholder="Search customer, email, phone, book…"
            className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading orders…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <div className="text-base font-medium text-slate-700">No orders yet.</div>
            <div className="text-sm mt-1">
              When a customer places an order on <code>/bookstore</code>, it lands here.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <Th>Customer</Th>
                  <Th>Book</Th>
                  <Th>Format</Th>
                  <Th align="right">Qty</Th>
                  <Th align="right">Total</Th>
                  <Th>Pay</Th>
                  <Th>Status</Th>
                  <Th>Placed</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((o) => (
                  <tr
                    key={o._id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelected(o)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 leading-tight">{o.customerName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{o.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-800">{o.bookTitle}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{o.bookSlug}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{o.format}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{o.quantity}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{inr(o.total)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{o.paymentMethod}</td>
                    <td className="px-4 py-3"><StatusChip s={o.status} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-slate-500">Page {page} of {pages} · {total} total</div>
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
        <Drawer
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={(status, notes) => updateStatus(selected._id, status, notes)}
          onDelete={() => remove(selected._id)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th className={`px-4 py-2.5 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

function Drawer({
  order,
  onClose,
  onStatusChange,
  onDelete,
}: {
  order: BookOrder;
  onClose: () => void;
  onStatusChange: (status: Status, notes?: string) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(order.adminNotes ?? '');
  useEffect(() => {
    setNotes(order.adminNotes ?? '');
  }, [order._id, order.adminNotes]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
              Order
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mt-1 leading-tight truncate">
              {order.bookTitle}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <StatusChip s={order.status} />
              <span>· {order.format} × {order.quantity} · {fmtDate(order.createdAt)}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 grid place-items-center">
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <section>
            <SectionLabel>Customer</SectionLabel>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <KV k="Name" v={order.customerName} />
              <KV k="Email" v={order.email} mono />
              <KV k="Phone" v={order.phone} mono />
              <KV k="PIN" v={order.pincode} mono />
            </div>
            <div className="mt-3">
              <KV k="Delivery address" v={order.address} />
            </div>
          </section>

          <section>
            <SectionLabel>Book</SectionLabel>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <KV k="Title" v={order.bookTitle} />
              <KV k="Author" v={order.bookAuthor} />
              <KV k="Slug" v={order.bookSlug} mono />
              <KV k="Format" v={order.format} />
            </div>
          </section>

          <section>
            <SectionLabel>Payment</SectionLabel>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">{order.format} × {order.quantity} @ {inr(order.unitPrice)}</span>
                <span className="text-slate-700">{inr(order.unitPrice * order.quantity)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-600">Shipping</span>
                <span className="text-slate-700">{order.shipping === 0 ? 'Free' : inr(order.shipping)}</span>
              </div>
              <div className="flex justify-between pt-2 mt-1 border-t border-slate-200 font-semibold">
                <span>Total ({order.paymentMethod})</span>
                <span>{inr(order.total)}</span>
              </div>
            </div>
          </section>

          <section>
            <SectionLabel>Status</SectionLabel>
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_LIST.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(s, notes)}
                  disabled={s === order.status}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                    s === order.status
                      ? 'bg-slate-900 text-white border-slate-900 cursor-default'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            {order.reviewedBy && order.reviewedAt && (
              <div className="text-xs text-slate-500 mt-2">
                Last touched by{' '}
                <b className="text-slate-700">{order.reviewedBy.name || order.reviewedBy.email || '—'}</b>{' '}
                · {fmtDate(order.reviewedAt)}
              </div>
            )}
          </section>

          <section>
            <SectionLabel>Admin notes</SectionLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes — call attempts, courier tracking, refund reasons, etc."
              className="w-full min-h-[100px] p-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 transition-all"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => onStatusChange(order.status, notes)}
                disabled={notes === (order.adminNotes ?? '')}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                Save notes
              </button>
              <button
                onClick={() => setNotes(order.adminNotes ?? '')}
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
            Delete order
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
      <div className={`mt-0.5 text-sm text-slate-800 break-words ${mono ? 'font-mono text-[13px]' : ''}`}>
        {v}
      </div>
    </div>
  );
}
