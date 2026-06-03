'use client';

/**
 * /books — admin CRUD for the bookstore catalogue.
 *
 * Lists every Book (active + inactive) with inline activate toggle,
 * edit (right-side drawer with the full form) and delete.  The header
 * has a New book button that opens the same drawer in create mode.
 *
 * Politicians never see this page — same pattern as /published-books.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Category = 'Analysis' | 'Psephology' | 'Handbook' | 'Biography' | 'Field';

interface Book {
  _id: string;
  slug: string;
  title: string;
  author: string;
  category: Category;
  categoryLabel: string;
  price: number;
  mrp?: number;
  rating: number;
  reviews: number;
  coverUrl: string;
  coverGradient: { c1: string; c2: string; fg: string };
  isNew: boolean;
  isActive: boolean;
  description?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES: Category[] = ['Analysis', 'Psephology', 'Handbook', 'Biography', 'Field'];

const EMPTY: Partial<Book> = {
  slug: '',
  title: '',
  author: '',
  category: 'Analysis',
  categoryLabel: 'Analysis',
  price: 499,
  mrp: undefined,
  rating: 4.5,
  reviews: 0,
  coverUrl: '',
  coverGradient: { c1: '#2a2a30', c2: '#161619', fg: '#f5f5f7' },
  isNew: false,
  isActive: true,
  description: '',
  sortOrder: 100,
};

function fmtDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function BooksPage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user?.role === 'politician') router.replace('/politician');
  }, [user, router]);

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);

  const [catFilter, setCatFilter] = useState<Category | 'all'>('all');
  const [showInactive, setShowInactive] = useState(true);
  const [editing, setEditing] = useState<Partial<Book> | null>(null);
  const isCreating = editing && !editing._id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ data: Book[] }>('/books/all');
      setBooks(data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not load books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return books.filter((b) => {
      if (!showInactive && !b.isActive) return false;
      if (catFilter !== 'all' && b.category !== catFilter) return false;
      if (debounced) {
        const hay = (b.title + ' ' + b.author + ' ' + b.slug).toLowerCase();
        if (!hay.includes(debounced)) return false;
      }
      return true;
    });
  }, [books, catFilter, debounced, showInactive]);

  const toggleActive = async (b: Book) => {
    try {
      const { data } = await api.patch<{ data: Book }>(`/books/${b._id}`, { isActive: !b.isActive });
      setBooks((arr) => arr.map((x) => (x._id === b._id ? data.data : x)));
      toast.success(data.data.isActive ? 'Activated' : 'Hidden from store');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not toggle');
    }
  };

  const remove = async (b: Book) => {
    if (!confirm(`Delete "${b.title}"? This permanently removes it from the catalogue.`)) return;
    try {
      await api.delete(`/books/${b._id}`);
      setBooks((arr) => arr.filter((x) => x._id !== b._id));
      toast.success('Book deleted');
      if (editing && editing._id === b._id) setEditing(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not delete');
    }
  };

  const save = async (draft: Partial<Book>) => {
    try {
      if (draft._id) {
        const { data } = await api.patch<{ data: Book }>(`/books/${draft._id}`, draft);
        setBooks((arr) => arr.map((x) => (x._id === draft._id ? data.data : x)));
        toast.success('Book updated');
      } else {
        const { data } = await api.post<{ data: Book }>('/books', draft);
        setBooks((arr) => [data.data, ...arr]);
        toast.success('Book created');
      }
      setEditing(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Could not save');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Bookstore catalogue</h1>
          <p className="text-sm text-slate-500 mt-1">
            What appears on the public <code>/bookstore</code> page. Inactive books are
            hidden from shoppers but kept here.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
          + New book
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          label={`All (${books.length})`}
          active={catFilter === 'all'}
          onClick={() => setCatFilter('all')}
        />
        {CATEGORIES.map((c) => (
          <FilterChip
            key={c}
            label={`${c} (${books.filter((b) => b.category === c).length})`}
            active={catFilter === c}
            onClick={() => setCatFilter(c)}
          />
        ))}
        <label className="ml-2 inline-flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Show inactive
        </label>
        <div className="ml-auto flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 min-w-[220px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3-3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, author, slug…"
            className="bg-transparent border-0 outline-none flex-1 text-sm text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500 text-sm">Loading books…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <div className="text-base font-medium text-slate-700">No books match.</div>
            <div className="text-sm mt-1">
              Tap <b>New book</b> above to add one.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <Th>Cover</Th>
                  <Th>Title / Slug</Th>
                  <Th>Author</Th>
                  <Th>Category</Th>
                  <Th align="right">Price</Th>
                  <Th>Active</Th>
                  <Th>Updated</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <div
                        className="w-9 h-12 rounded overflow-hidden"
                        style={{
                          background: `linear-gradient(135deg, ${b.coverGradient.c1}, ${b.coverGradient.c2})`,
                        }}>
                        {b.coverUrl && (
                          <img
                            src={b.coverUrl}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900 leading-tight">{b.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{b.slug}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{b.author}</td>
                    <td className="px-4 py-2.5 text-slate-600">{b.categoryLabel}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="font-semibold text-slate-900">₹{b.price}</div>
                      {b.mrp && b.mrp > b.price && (
                        <div className="text-[11px] text-slate-400 line-through">₹{b.mrp}</div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleActive(b)}
                        className={`inline-flex w-9 h-5 rounded-full transition-colors items-center px-0.5 ${
                          b.isActive ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                        }`}
                        title={b.isActive ? 'Active — visible on /bookstore' : 'Inactive — hidden'}>
                        <span className="w-4 h-4 rounded-full bg-white shadow" />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{fmtDate(b.updatedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditing({ ...b })}
                          className="text-xs font-medium text-brand-600 hover:text-brand-800">
                          Edit
                        </button>
                        <button
                          onClick={() => remove(b)}
                          className="text-xs font-medium text-rose-600 hover:text-rose-800">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditorDrawer
          draft={editing}
          isCreating={!!isCreating}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
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

function EditorDrawer({
  draft,
  isCreating,
  onClose,
  onSave,
}: {
  draft: Partial<Book>;
  isCreating: boolean;
  onClose: () => void;
  onSave: (b: Partial<Book>) => void | Promise<void>;
}) {
  const [d, setD] = useState<Partial<Book>>(draft);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setD(draft);
  }, [draft._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Book>(k: K, v: Book[K] | undefined) =>
    setD((p) => ({ ...p, [k]: v }));

  const setGrad = (k: 'c1' | 'c2' | 'fg', v: string) =>
    setD((p) => ({
      ...p,
      coverGradient: {
        c1: p.coverGradient?.c1 ?? '#000000',
        c2: p.coverGradient?.c2 ?? '#000000',
        fg: p.coverGradient?.fg ?? '#ffffff',
        [k]: v,
      },
    }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(d);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
              {isCreating ? 'New book' : 'Edit book'}
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mt-1 leading-tight">
              {isCreating ? 'Add to the catalogue' : d.title || '—'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 grid place-items-center">
            ×
          </button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-5 flex-1">
          {/* Live preview */}
          <div className="flex items-stretch gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div
              className="w-20 h-28 rounded overflow-hidden relative flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${d.coverGradient?.c1 || '#000'}, ${d.coverGradient?.c2 || '#000'})`,
              }}>
              {d.coverUrl && (
                <img
                  src={d.coverUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                {d.categoryLabel || d.category || '—'}
              </div>
              <div className="text-base font-semibold text-slate-900 truncate mt-0.5">
                {d.title || 'Untitled'}
              </div>
              <div className="text-xs text-slate-500">{d.author || '—'}</div>
              <div className="text-sm text-slate-700 mt-1">
                <span className="font-semibold">₹{d.price ?? 0}</span>
                {d.mrp && d.mrp > (d.price ?? 0) && (
                  <span className="text-xs text-slate-400 line-through ml-2">₹{d.mrp}</span>
                )}
              </div>
            </div>
          </div>

          <SectionLabel>Core</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Slug (URL-safe)" value={d.slug ?? ''} onChange={(v) => set('slug', v.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required mono />
            <SelectField
              label="Category"
              value={d.category ?? 'Analysis'}
              onChange={(v) => set('category', v as Category)}
              options={CATEGORIES}
            />
          </div>
          <TextField label="Title" value={d.title ?? ''} onChange={(v) => set('title', v)} required />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Author" value={d.author ?? ''} onChange={(v) => set('author', v)} required />
            <TextField label="Category label" value={d.categoryLabel ?? ''} onChange={(v) => set('categoryLabel', v)} required placeholder="e.g. Analysis · 2024" />
          </div>

          <SectionLabel>Pricing</SectionLabel>
          <div className="grid grid-cols-3 gap-3">
            <NumField label="Price (₹)" value={d.price ?? 0} onChange={(v) => set('price', v === '' ? 0 : v)} min={0} required />
            <NumField label="MRP (₹, optional)" value={d.mrp ?? ''} onChange={(v) => set('mrp', v === '' ? undefined : v)} min={0} />
            <NumField label="Sort order" value={d.sortOrder ?? ''} onChange={(v) => set('sortOrder', v === '' ? undefined : v)} />
          </div>

          <SectionLabel>Reviews</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Rating (0–5)" value={d.rating ?? 4.5} onChange={(v) => set('rating', v === '' ? 0 : v)} min={0} max={5} step={0.1} />
            <NumField label="Review count" value={d.reviews ?? 0} onChange={(v) => set('reviews', v === '' ? 0 : v)} min={0} />
          </div>

          <SectionLabel>Cover</SectionLabel>
          <TextField label="Cover image URL" value={d.coverUrl ?? ''} onChange={(v) => set('coverUrl', v)} required placeholder="https://images.unsplash.com/photo-..." />
          <div className="grid grid-cols-3 gap-3">
            <ColorField label="Gradient c1" value={d.coverGradient?.c1 ?? '#2a2a30'} onChange={(v) => setGrad('c1', v)} />
            <ColorField label="Gradient c2" value={d.coverGradient?.c2 ?? '#161619'} onChange={(v) => setGrad('c2', v)} />
            <ColorField label="Text fg" value={d.coverGradient?.fg ?? '#f5f5f7'} onChange={(v) => setGrad('fg', v)} />
          </div>

          <SectionLabel>Flags</SectionLabel>
          <div className="flex items-center gap-6">
            <CheckField label="Show NEW badge" checked={!!d.isNew} onChange={(v) => set('isNew', v)} />
            <CheckField label="Active (visible on /bookstore)" checked={d.isActive ?? true} onChange={(v) => set('isActive', v)} />
          </div>

          <SectionLabel>Description (optional)</SectionLabel>
          <textarea
            value={d.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Long-form description shown on a future product detail page."
            className="w-full min-h-[80px] p-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving…' : isCreating ? 'Create book' : 'Save changes'}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 -mb-2">
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  required,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 ${mono ? 'font-mono' : ''}`}
      />
    </label>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  required,
}: {
  label: string;
  value: number | '';
  onChange: (v: number | '') => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        required={required}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400">
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>
      <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-7 h-7 rounded border-0 p-0 cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none text-sm font-mono"
        />
      </div>
    </label>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
