'use client';

/**
 * Pollistics Bookstore — browse + buy election books.
 * Visual translation of the handoff's Bookstore.html, wired to the live
 * catalogue (GET /api/books) and checkout (POST /api/book-orders) endpoints.
 */

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { SiteShell } from '@/components/site/SiteShell';

interface Book {
  _id: string;
  slug: string;
  title: string;
  author: string;
  category: string;
  categoryLabel: string;
  price: number;
  mrp?: number;
  rating: number;
  reviews: number;
  coverUrl: string;
  coverGradient: { c1: string; c2: string; fg: string };
  isNew?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9003/api';
const SHIP = 49;

const CATEGORIES: Array<[string, string]> = [
  ['all', 'All titles'],
  ['Analysis', 'Election Analysis'],
  ['Psephology', 'Psephology'],
  ['Handbook', 'Handbooks'],
  ['Biography', 'Biography'],
  ['Field', 'Field Manuals'],
];

const PAYMENTS: Array<['UPI' | 'Card' | 'NetBanking' | 'COD', string]> = [
  ['UPI', 'UPI · GPay / PhonePe'],
  ['Card', 'Credit / Debit card'],
  ['NetBanking', 'Net banking'],
  ['COD', 'Cash on delivery'],
];

function starStr(r: number) {
  const full = Math.round(r);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function BookCover({ book, className }: { book: Book; className?: string }) {
  if (book.coverUrl) {
    return <img className={className} src={book.coverUrl} alt={`${book.title} cover`} loading="lazy" />;
  }
  const g = book.coverGradient;
  return (
    <div
      className={className ? `${className}` : 'cover-fallback'}
      style={{ background: `linear-gradient(145deg, ${g.c1}, ${g.c2})`, color: g.fg, width: '100%', height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 12 }}
    >
      <span>{book.title}</span>
    </div>
  );
}

export default function BookstorePage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState('all');
  const [query, setQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [openBookId, setOpenBookId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get<{ data: Book[] }>(`${API_BASE}/books`);
        if (!cancelled) setBooks(data.data);
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || 'Could not load catalogue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      const okCat = activeCat === 'all' || b.category === activeCat;
      const okQ = !q || (b.title + ' ' + b.author).toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [books, activeCat, query]);

  const openBook = openBookId ? books.find((b) => b._id === openBookId) ?? null : null;

  return (
    <SiteShell active="bookstore" footer="store">
      {/* HERO */}
      <section className="phero">
        <div className="page" style={{ padding: '56px 0' }}>
          <span className="tag">Pollistics Bookstore</span>
          <h1 style={{ fontSize: 54, fontWeight: 900, letterSpacing: '-0.03em', marginTop: 14 }}>
            Every election, <span style={{ color: 'var(--coral)' }}>between two covers.</span>
          </h1>
          <p className="lead" style={{ maxWidth: 560, marginTop: 14 }}>
            Analysis, handbooks and field manuals — written by psephologists, journalists and our own data desk. Print and e-book editions, delivered across India.
          </p>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="filterbar">
        <div className="page row">
          {CATEGORIES.map(([cat, label]) => (
            <div
              key={cat}
              className={`chip${activeCat === cat ? ' active' : ''}`}
              onClick={() => setActiveCat(cat)}
            >
              {label}
            </div>
          ))}
          <div className="search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
            <input type="text" placeholder="Search titles or authors…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="cart-btn" aria-label="Cart">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6" /></svg>
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* GRID */}
      <section className="section" style={{ paddingTop: 44 }}>
        <div className="page">
          {loading ? (
            <div className="empty" style={{ display: 'block' }}>Loading catalogue…</div>
          ) : loadError ? (
            <div className="empty" style={{ display: 'block' }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Couldn&apos;t load the catalogue.</div>
              <div>{loadError}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty" style={{ display: 'block' }}>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>No titles match.</div>
              <div>Try a different category or search term.</div>
            </div>
          ) : (
            <div className="book-grid">
              {filtered.map((b) => (
                <div className="book-card" key={b._id}>
                  <div className="cover">
                    {b.isNew && <span className="badge-new">NEW</span>}
                    <BookCover book={b} />
                  </div>
                  <div>
                    <div className="bm-title">{b.title}</div>
                    <div className="bm-author">{b.author}</div>
                  </div>
                  <div className="rating"><span className="stars">{starStr(b.rating)}</span> {b.rating} · {b.reviews}</div>
                  <div className="book-foot">
                    <div className="price">{b.mrp ? <s>₹{b.mrp}</s> : null}₹{b.price}</div>
                    <button className="buy-btn" onClick={() => setOpenBookId(b._id)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6" /></svg>
                      Buy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {openBook && (
        <BuyModal
          book={openBook}
          onClose={() => setOpenBookId(null)}
          onOrder={(q) => setCartCount((c) => c + q)}
        />
      )}
    </SiteShell>
  );
}

type Fmt = 'Paperback' | 'E-book' | 'Hardcover';

function BuyModal({ book, onClose, onOrder }: { book: Book; onClose: () => void; onOrder: (q: number) => void }) {
  const [fmt, setFmt] = useState<Fmt>('Paperback');
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'NetBanking' | 'COD'>('UPI');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const priceOf = (f: Fmt) => {
    if (f === 'E-book') return Math.round((book.price * 0.6) / 10) * 10 - 1;
    if (f === 'Hardcover') return Math.round((book.price * 1.6) / 10) * 10 + 9;
    return book.price;
  };

  useEffect(() => { if (fmt === 'E-book') setQty(1); }, [fmt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const sub = priceOf(fmt) * qty;
  const ship = fmt === 'E-book' ? 0 : sub >= 699 ? 0 : SHIP;
  const total = sub + ship;

  const place = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlaceError(null);
    setPlacing(true);
    try {
      const { data } = await axios.post<{ data: { orderId: string } }>(`${API_BASE}/book-orders`, {
        bookSlug: book.slug,
        format: fmt,
        quantity: qty,
        customerName: customerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        pincode: pincode.trim(),
        address: address.trim(),
        paymentMethod,
      });
      setOrderId(data.data.orderId);
      onOrder(qty);
    } catch (err: any) {
      setPlaceError(err?.response?.data?.error || err?.message || 'Could not place order. Please try again or contact us directly.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="pol-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        {orderId ? (
          <div className="modal-success">
            <div className="ck"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg></div>
            <h3 style={{ fontSize: 28, fontWeight: 800 }}>Order placed!</h3>
            <p className="muted" style={{ maxWidth: 400, margin: '8px auto 0' }}>
              Your copy of <b style={{ color: 'var(--ink)' }}>{book.title}</b> is confirmed. A receipt and tracking link are on the way to your email.
            </p>
            <div className="muted" style={{ fontSize: 12, marginTop: 14, fontWeight: 700, letterSpacing: '.06em' }}>ORDER #{orderId} · {fmt} × {qty}</div>
            <button className="btn btn-ghost" style={{ marginTop: 24 }} onClick={onClose}>Continue browsing</button>
          </div>
        ) : (
          <>
            <div className="modal-head">
              <BookCover book={book} className={book.coverUrl ? 'modal-cover' : 'modal-cover-fallback'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tag soft">Buy this book</div>
                <h3 style={{ fontSize: 25, fontWeight: 800, margin: '10px 0 4px', lineHeight: 1.1 }}>{book.title}</h3>
                <div className="muted" style={{ fontSize: 14 }}>by {book.author}</div>
                <div className="rating" style={{ marginTop: 10 }}><span className="stars">{starStr(book.rating)}</span> {book.rating} · {book.reviews} reviews</div>
              </div>
              <button className="modal-close" onClick={onClose}><svg width="13" height="13" viewBox="0 0 12 12" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" fill="none"><path d="M2 2l8 8 M10 2l-8 8" /></svg></button>
            </div>
            <div className="modal-body">
              <form onSubmit={place}>
                <p className="lbl-sm">Edition</p>
                <div className="fmt-row">
                  {(['Paperback', 'E-book', 'Hardcover'] as Fmt[]).map((f) => (
                    <div key={f} className={`fmt${fmt === f ? ' active' : ''}`} onClick={() => setFmt(f)}>
                      <div className="fmt-name">{f}</div>
                      <div className="fmt-price">₹{priceOf(f)}</div>
                    </div>
                  ))}
                </div>
                <p className="lbl-sm">Delivery details</p>
                <div className="f-row">
                  <div className="field"><label>Full name</label><input required type="text" placeholder="Recipient name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
                  <div className="field"><label>Email</label><input required type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
                <div className="f-row">
                  <div className="field"><label>Phone</label><input required type="tel" placeholder="+91 ·········" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                  <div className="field"><label>PIN code</label><input required type="text" placeholder="110001" value={pincode} onChange={(e) => setPincode(e.target.value)} /></div>
                </div>
                <div className="field"><label>Delivery address</label><input required type="text" placeholder="House, street, city, state" value={address} onChange={(e) => setAddress(e.target.value)} /></div>
                <p className="lbl-sm">Quantity &amp; payment</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
                  <div className="qty">
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                    <span>{qty}</span>
                    <button type="button" onClick={() => fmt !== 'E-book' && setQty((q) => Math.min(20, q + 1))}>+</button>
                  </div>
                  <div className="field" style={{ margin: 0, flex: 1, minWidth: 160 }}>
                    <label>Payment method</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as any)}>
                      {PAYMENTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="summary">
                  <div className="line"><span>{fmt} × {qty}</span><span>₹{sub}</span></div>
                  <div className="line"><span>Delivery</span><span>{ship === 0 ? 'Free' : `₹${ship}`}</span></div>
                  <div className="total"><span>Total</span><span>₹{total}</span></div>
                </div>
                {placeError && <p style={{ color: 'var(--coral-deep)', fontSize: 13, margin: '0 0 12px' }}>{placeError}</p>}
                <button type="submit" className="btn btn-coral" style={{ width: '100%', height: 52 }} disabled={placing}>
                  {placing ? 'Placing order…' : 'Place order →'}
                </button>
                <p className="muted" style={{ fontSize: 11, textAlign: 'center', margin: '12px 0 0' }}>Secure checkout · Free delivery over ₹699 · 7-day returns</p>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
