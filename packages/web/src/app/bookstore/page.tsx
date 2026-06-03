'use client';

/**
 * Pollistics Bookstore — browse + buy election books.
 *
 * Translated from the design-handoff Bookstore.html prototype.  Wraps in
 * PublicShell for header / drawer / footer consistency; filter chips +
 * search + grid + buy-modal are all client-side state.  The "order" is
 * a fake mock — no payment integration yet, the success screen just
 * fakes an order ID.
 */
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { PublicShell } from '@/components/landing/PublicShell';

/** Public catalogue is a thin client over /api/books — admins manage
 *  the catalogue from the admin /books page; this just renders what
 *  the API returns.  Shape matches the Book Mongoose model. */
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

const CATEGORIES: Array<[string, string]> = [
  ['all', 'All titles'],
  ['Analysis', 'Election Analysis'],
  ['Psephology', 'Psephology'],
  ['Handbook', 'Handbooks'],
  ['Biography', 'Biography'],
  ['Field', 'Field Manuals'],
];

const SHIP = 49;

function starStr(r: number) {
  const full = Math.round(r);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
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
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      const okCat = activeCat === 'all' || b.category === activeCat;
      const plain = (b.title + ' ' + b.author).toLowerCase();
      const okQ = !q || plain.includes(q);
      return okCat && okQ;
    });
  }, [books, activeCat, query]);

  const openBook = openBookId ? books.find((b) => b._id === openBookId) ?? null : null;

  return (
    <PublicShell activeNav="Bookstore">
      <BookstoreStyles />

      {/* HERO */}
      <section className="ps-hero-section" style={{ paddingBottom: 32 }}>
        <div className="ps-container">
          <span className="ps-kicker">Pollistics Bookstore</span>
          <h1 className="ps-hero-title-md">
            Every election,{' '}
            <em className="ps-serif-it ps-accent">between two covers</em>.
          </h1>
          <p className="ps-hero-lede" style={{ maxWidth: 560 }}>
            Analysis, handbooks and field manuals — written by psephologists, journalists and our
            own data desk. Print and e-book editions, delivered across India.
          </p>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="bs-filterbar">
        <div className="ps-container bs-filterbar-row">
          {CATEGORIES.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setActiveCat(k)}
              className={`bs-chip ${activeCat === k ? 'bs-chip-active' : ''}`}>
              {l}
            </button>
          ))}
          <div className="bs-search-box">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ps-muted)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles or authors…"
            />
          </div>
          <div className="bs-cart-pill" title={`${cartCount} item${cartCount === 1 ? '' : 's'} in cart`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ps-ink)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6" />
            </svg>
            {cartCount > 0 && <span className="bs-cart-count">{cartCount}</span>}
          </div>
        </div>
      </div>

      {/* GRID */}
      <section style={{ padding: '40px 0 72px' }}>
        <div className="ps-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ps-muted)', fontSize: 14 }}>
              Loading catalogue…
            </div>
          ) : loadError ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ps-muted)' }}>
              <div className="ps-serif" style={{ fontSize: 22, marginBottom: 6, color: 'var(--ps-ink)' }}>
                Could not load the bookstore.
              </div>
              <div style={{ fontSize: 13 }}>{loadError}</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ps-muted)' }}>
              <div className="ps-serif" style={{ fontSize: 24, marginBottom: 6 }}>
                {books.length === 0 ? 'No titles yet.' : 'No titles match.'}
              </div>
              <div style={{ fontSize: 13 }}>
                {books.length === 0
                  ? 'The catalogue is empty — admins can add books from the dashboard.'
                  : 'Try a different category or search term.'}
              </div>
            </div>
          ) : (
            <div className="bs-grid">
              {filtered.map((b) => (
                <BookCard key={b._id} book={b} onBuy={() => setOpenBookId(b._id)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {openBook && (
        <BuyModal
          book={openBook}
          onClose={() => setOpenBookId(null)}
          onOrder={(qty) => {
            setCartCount((c) => c + qty);
          }}
        />
      )}
    </PublicShell>
  );
}

function BookCard({ book, onBuy }: { book: Book; onBuy: () => void }) {
  return (
    <div className="bs-card">
      <div
        className="bs-cover"
        style={{
          background: `linear-gradient(135deg, ${book.coverGradient.c1} 0%, ${book.coverGradient.c2} 100%)`,
          color: book.coverGradient.fg,
        }}>
        {book.isNew && <span className="bs-badge-new">NEW</span>}
        {/* CDN photo background; loading="lazy" so off-screen covers
            don't tax mobile data on initial paint.  The gradient + title
            overlay underneath is the graceful fallback if the image 404s. */}
        <img
          src={book.coverUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="bs-cover-img"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="bs-cover-inner">
          <div className="ps-mono bs-cover-cat">{book.categoryLabel}</div>
          <div className="ps-serif bs-cover-title">{book.title}</div>
          <div className="ps-mono bs-cover-author">{book.author}</div>
        </div>
      </div>
      <div className="bs-meta">
        <div className="ps-serif bs-meta-title">{book.title}</div>
        <div className="bs-meta-author">{book.author}</div>
        <div className="ps-mono bs-rating">
          {starStr(book.rating)}{' '}
          <span style={{ opacity: 0.7 }}>
            {book.rating} · {book.reviews}
          </span>
        </div>
      </div>
      <div className="bs-foot">
        <div className="ps-serif bs-price">
          {book.mrp && (
            <s style={{ fontSize: 13, color: 'var(--ps-muted)', marginRight: 6, fontFamily: 'inherit' }}>
              ₹{book.mrp}
            </s>
          )}
          ₹{book.price}
        </div>
        <button onClick={onBuy} className="bs-buy-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6" />
          </svg>
          Buy
        </button>
      </div>
    </div>
  );
}

type Fmt = 'Paperback' | 'E-book' | 'Hardcover';

function BuyModal({
  book,
  onClose,
  onOrder,
}: {
  book: Book;
  onClose: () => void;
  onOrder: (qty: number) => void;
}) {
  const paper = book.price;
  const ebook = Math.round((book.price * 0.6) / 10) * 10 - 1;
  const hard = Math.round((book.price * 1.6) / 10) * 10 + 9;
  const priceOf = (f: Fmt) => (f === 'Paperback' ? paper : f === 'E-book' ? ebook : hard);

  const [fmt, setFmt] = useState<Fmt>('Paperback');
  const [qty, setQty] = useState(1);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (fmt === 'E-book') setQty(1);
  }, [fmt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
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

  const place = (e: React.FormEvent) => {
    e.preventDefault();
    const oid = 'PB-' + Math.floor(100000 + Math.random() * 900000);
    setOrderId(oid);
    onOrder(qty);
  };

  return (
    <div className="bs-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bs-modal">
        {orderId ? (
          <div style={{ padding: '44px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'var(--ps-accent)',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 20px',
                color: '#fff',
                fontSize: 30,
                fontWeight: 700,
              }}>
              ✓
            </div>
            <h3 className="ps-serif" style={{ fontSize: 28, margin: '0 0 8px', fontWeight: 460 }}>
              Order placed!
            </h3>
            <p style={{ color: 'var(--ps-ink-soft)', maxWidth: 400, margin: '0 auto', fontSize: 14 }}>
              Your copy of <b style={{ color: 'var(--ps-ink)' }}>{book.title}</b> is confirmed. A
              receipt and tracking link are on the way to your email.
            </p>
            <div
              className="ps-mono"
              style={{ fontSize: 12, color: 'var(--ps-muted)', marginTop: 14, letterSpacing: '.06em' }}>
              ORDER #{orderId} · {fmt} × {qty}
            </div>
            <button onClick={onClose} className="ps-btn-ghost" style={{ marginTop: 22 }}>
              Continue browsing
            </button>
          </div>
        ) : (
          <>
            <div className="bs-modal-head">
              <div
                className="bs-modal-cover"
                style={{
                  background: `linear-gradient(135deg, ${book.coverGradient.c1} 0%, ${book.coverGradient.c2} 100%)`,
                  color: book.coverGradient.fg,
                }}>
                <img
                  src={book.coverUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="bs-modal-cover-img"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="ps-serif bs-modal-cover-title">{book.title}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="ps-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    color: 'var(--ps-accent)',
                  }}>
                  Buy this book
                </div>
                <h3
                  className="ps-serif"
                  style={{ fontSize: 26, margin: '8px 0 4px', lineHeight: 1.05 }}>
                  {book.title}
                </h3>
                <div style={{ color: 'var(--ps-muted)', fontSize: 13 }}>by {book.author}</div>
                <div className="ps-mono bs-rating" style={{ marginTop: 10 }}>
                  {starStr(book.rating)}{' '}
                  <span style={{ opacity: 0.7 }}>
                    {book.rating} · {book.reviews} reviews
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="bs-modal-close" aria-label="Close">
                ×
              </button>
            </div>
            <form onSubmit={place} style={{ padding: 24 }}>
              <p className="ps-mono bs-section-label">Edition</p>
              <div className="bs-fmt-row">
                {(['Paperback', 'E-book', 'Hardcover'] as Fmt[]).map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFmt(f)}
                    className={`bs-fmt ${fmt === f ? 'bs-fmt-active' : ''}`}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {f === 'E-book' ? 'E-book · PDF + Kindle' : f}
                    </div>
                    <div
                      className="ps-serif"
                      style={{ fontSize: 18, fontWeight: 500, marginTop: 3 }}>
                      ₹{priceOf(f)}
                    </div>
                  </button>
                ))}
              </div>

              <p className="ps-mono bs-section-label">Delivery details</p>
              <div className="bs-frow">
                <BsField label="Full name" required type="text" placeholder="Recipient name" />
                <BsField label="Email" required type="email" placeholder="you@email.com" />
              </div>
              <div className="bs-frow">
                <BsField label="Phone" required type="tel" placeholder="+91 ·········" />
                <BsField label="PIN code" required type="text" placeholder="110001" />
              </div>
              <BsField
                label="Delivery address"
                required
                type="text"
                placeholder="House, street, city, state"
              />

              <p className="ps-mono bs-section-label">Quantity &amp; payment</p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 18,
                  flexWrap: 'wrap',
                }}>
                <div className="bs-qty">
                  <button
                    type="button"
                    onClick={() => fmt !== 'E-book' && setQty((q) => Math.max(1, q - 1))}>
                    −
                  </button>
                  <span>{qty}</span>
                  <button
                    type="button"
                    onClick={() => fmt !== 'E-book' && setQty((q) => Math.min(20, q + 1))}>
                    +
                  </button>
                </div>
                <div className="bs-field" style={{ margin: 0, flex: 1, minWidth: 160 }}>
                  <label className="ps-mono bs-field-label">Payment method</label>
                  <select className="bs-input">
                    <option>UPI · GPay / PhonePe</option>
                    <option>Credit / Debit card</option>
                    <option>Net banking</option>
                    <option>Cash on delivery</option>
                  </select>
                </div>
              </div>

              <div className="bs-summary">
                <div className="bs-summary-line">
                  <span>
                    {fmt} × {qty}
                  </span>
                  <span>₹{sub}</span>
                </div>
                <div className="bs-summary-line">
                  <span>Delivery</span>
                  <span>{ship === 0 ? 'Free' : `₹${ship}`}</span>
                </div>
                <div className="bs-summary-total">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>

              <button
                type="submit"
                className="ps-btn-solid ps-btn-accent"
                style={{ width: '100%', justifyContent: 'center', height: 50 }}>
                Place order →
              </button>
              <p
                className="ps-mono"
                style={{
                  fontSize: 10,
                  color: 'var(--ps-muted)',
                  textAlign: 'center',
                  margin: '12px 0 0',
                  letterSpacing: '.04em',
                }}>
                Secure checkout · Free delivery over ₹699 · 7-day returns
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function BsField({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="bs-field">
      <label className="ps-mono bs-field-label">{label}</label>
      <input className="bs-input" {...rest} />
    </div>
  );
}

function BookstoreStyles() {
  return (
    <style jsx global>{`
      .ps-page .bs-filterbar {
        position: sticky;
        top: 60px;
        z-index: 30;
        background: var(--ps-bg);
        border-top: 1px solid var(--ps-rule);
        border-bottom: 1px solid var(--ps-rule);
      }
      .ps-page .bs-filterbar-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 0;
        flex-wrap: wrap;
      }
      .ps-page .bs-chip {
        padding: 8px 14px;
        border-radius: 999px;
        font-size: 12.5px;
        font-weight: 600;
        background: var(--ps-paper);
        color: var(--ps-ink-soft);
        border: 1px solid var(--ps-rule);
        cursor: pointer;
        white-space: nowrap;
        font-family: inherit;
      }
      .ps-page .bs-chip-active {
        background: var(--ps-ink);
        color: var(--ps-paper);
        border-color: var(--ps-ink);
      }
      .ps-page .bs-search-box {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 8px;
        height: 38px;
        padding: 0 12px;
        border: 1px solid var(--ps-rule);
        border-radius: 6px;
        background: var(--ps-paper);
        min-width: 220px;
      }
      .ps-page .bs-search-box input {
        background: transparent;
        border: 0;
        outline: 0;
        color: var(--ps-ink);
        font-family: inherit;
        font-size: 13px;
        width: 100%;
      }
      .ps-page .bs-cart-pill {
        position: relative;
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 999px;
        border: 1px solid var(--ps-rule);
        background: var(--ps-paper);
      }
      .ps-page .bs-cart-count {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 8px;
        background: var(--ps-accent);
        color: #fff;
        font-family: var(--font-jetbrains), monospace;
        font-size: 10px;
        font-weight: 700;
        display: grid;
        place-items: center;
      }

      .ps-page .bs-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 28px;
      }
      .ps-page .bs-card {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .ps-page .bs-cover {
        position: relative;
        aspect-ratio: 3 / 4.4;
        border-radius: 3px 8px 8px 3px;
        overflow: hidden;
        box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.35);
        transition: transform 0.25s cubic-bezier(0.2, 0.7, 0.2, 1), box-shadow 0.25s;
        display: flex;
        flex-direction: column;
      }
      .ps-page .bs-card:hover .bs-cover {
        transform: translateY(-4px);
        box-shadow: 0 26px 54px -16px rgba(0, 0, 0, 0.4);
      }
      .ps-page .bs-cover-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        z-index: 0;
      }
      .ps-page .bs-cover-inner {
        position: relative;
        z-index: 1;
        padding: 22px 18px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        /* Dark gradient floor so the title text stays legible on top
           of any random photo background. */
        background: linear-gradient(
          180deg,
          rgba(0, 0, 0, 0.05) 0%,
          rgba(0, 0, 0, 0.45) 60%,
          rgba(0, 0, 0, 0.78) 100%
        );
        justify-content: flex-end;
      }
      .ps-page .bs-cover-cat {
        font-size: 9.5px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        opacity: 0.7;
      }
      .ps-page .bs-cover-title {
        font-size: 22px;
        line-height: 1.1;
        font-weight: 500;
        letter-spacing: -0.015em;
        color: #fff;
        text-shadow: 0 1px 8px rgba(0, 0, 0, 0.4);
      }
      .ps-page .bs-cover-cat,
      .ps-page .bs-cover-author {
        color: #fff;
      }
      .ps-page .bs-cover-author {
        font-size: 10px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        opacity: 0.6;
      }
      .ps-page .bs-badge-new {
        position: absolute;
        top: 12px;
        right: -28px;
        transform: rotate(45deg);
        background: var(--ps-accent);
        color: #fff;
        font-family: var(--font-jetbrains), monospace;
        font-size: 8.5px;
        font-weight: 700;
        letter-spacing: 0.12em;
        padding: 3px 32px;
        z-index: 2;
      }
      .ps-page .bs-meta {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .ps-page .bs-meta-title {
        font-size: 17px;
        font-weight: 500;
        letter-spacing: -0.01em;
        line-height: 1.15;
      }
      .ps-page .bs-meta-author {
        font-size: 12px;
        color: var(--ps-muted);
      }
      .ps-page .bs-rating {
        font-size: 11px;
        color: var(--ps-muted);
      }
      .ps-page .bs-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 2px;
      }
      .ps-page .bs-price {
        font-size: 22px;
        font-weight: 500;
        letter-spacing: -0.02em;
      }
      .ps-page .bs-buy-btn {
        height: 34px;
        padding: 0 16px;
        font-size: 12.5px;
        font-weight: 700;
        background: var(--ps-accent);
        color: #fff;
        border: 0;
        border-radius: 5px;
        cursor: pointer;
        font-family: inherit;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .ps-page .bs-buy-btn:hover {
        opacity: 0.92;
      }

      /* MODAL */
      .bs-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 8, 10, 0.55);
        backdrop-filter: blur(4px);
        z-index: 200;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 40px 16px;
        overflow-y: auto;
      }
      .bs-modal {
        width: 100%;
        max-width: 760px;
        background: var(--ps-paper);
        border: 1px solid var(--ps-rule);
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.4);
      }
      .ps-page .bs-modal-head {
        display: flex;
        gap: 20px;
        padding: 24px;
        border-bottom: 1px solid var(--ps-rule);
        position: relative;
      }
      .ps-page .bs-modal-cover {
        position: relative;
        width: 96px;
        aspect-ratio: 3 / 4.4;
        border-radius: 2px 5px 5px 2px;
        overflow: hidden;
        flex-shrink: 0;
        box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.35);
      }
      .ps-page .bs-modal-cover-img {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .ps-page .bs-modal-cover-title {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        padding: 8px;
        font-size: 11px;
        line-height: 1.1;
        color: #fff;
        background: linear-gradient(
          180deg,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 0.7) 80%,
          rgba(0, 0, 0, 0.85) 100%
        );
      }
      .ps-page .bs-modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;
        border-radius: 999px;
        border: 1px solid var(--ps-rule);
        background: var(--ps-bg-tint);
        color: var(--ps-ink);
        cursor: pointer;
        display: grid;
        place-items: center;
        font-size: 18px;
        line-height: 1;
        font-family: inherit;
      }
      .ps-page .bs-section-label {
        font-size: 10.5px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ps-muted);
        margin: 0 0 14px;
      }
      .ps-page .bs-fmt-row {
        display: flex;
        gap: 10px;
        margin-bottom: 18px;
      }
      .ps-page .bs-fmt {
        flex: 1;
        border: 1px solid var(--ps-rule);
        border-radius: 6px;
        padding: 12px;
        cursor: pointer;
        background: transparent;
        color: var(--ps-ink);
        text-align: left;
        font-family: inherit;
      }
      .ps-page .bs-fmt-active {
        border-color: var(--ps-accent);
        background: rgba(225, 30, 44, 0.06);
      }
      .ps-page .bs-frow {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
      }
      .ps-page .bs-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 14px;
      }
      .ps-page .bs-field-label {
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--ps-muted);
      }
      .ps-page .bs-input {
        background: var(--ps-bg-tint);
        border: 1px solid var(--ps-rule);
        border-radius: 5px;
        color: var(--ps-ink);
        font-family: inherit;
        font-size: 14px;
        padding: 11px 13px;
        outline: none;
        transition: border-color 0.15s;
        width: 100%;
      }
      .ps-page .bs-input:focus {
        border-color: var(--ps-accent);
      }
      .ps-page .bs-qty {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--ps-rule);
        border-radius: 6px;
        overflow: hidden;
      }
      .ps-page .bs-qty button {
        width: 36px;
        height: 38px;
        background: var(--ps-bg-tint);
        border: 0;
        color: var(--ps-ink);
        font-size: 18px;
        cursor: pointer;
        font-family: inherit;
      }
      .ps-page .bs-qty span {
        width: 44px;
        text-align: center;
        font-family: var(--font-jetbrains), monospace;
        font-size: 14px;
      }
      .ps-page .bs-summary {
        background: var(--ps-bg-tint);
        border: 1px solid var(--ps-rule);
        border-radius: 8px;
        padding: 16px;
        margin: 4px 0 18px;
      }
      .ps-page .bs-summary-line {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        padding: 4px 0;
        color: var(--ps-ink-soft);
      }
      .ps-page .bs-summary-total {
        display: flex;
        justify-content: space-between;
        padding-top: 10px;
        margin-top: 6px;
        border-top: 1px solid var(--ps-rule);
        font-family: var(--font-newsreader), serif;
        font-size: 22px;
        font-weight: 500;
      }

      @media (max-width: 1100px) {
        .ps-page .bs-grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
      @media (max-width: 960px) {
        .ps-page .bs-grid {
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .ps-page .bs-search-box {
          margin-left: 0;
          flex: 1;
          min-width: 0;
        }
        .ps-page .bs-frow {
          grid-template-columns: 1fr;
        }
        .ps-page .bs-fmt-row {
          flex-direction: column;
        }
      }
      @media (max-width: 560px) {
        .ps-page .bs-modal-head {
          flex-direction: column;
        }
        .ps-page .bs-modal-cover {
          width: 80px;
        }
      }
    `}</style>
  );
}
