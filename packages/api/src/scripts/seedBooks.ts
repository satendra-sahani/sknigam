/**
 * Seed the Book collection with the original 12 hard-coded titles.
 *
 *   cd packages/api
 *   npx ts-node src/scripts/seedBooks.ts          # add only missing slugs
 *   npx ts-node src/scripts/seedBooks.ts --force  # overwrite existing too
 *
 * Idempotent by default — re-running won't create duplicates because
 * each book's `slug` is unique.  Without --force, books whose slug
 * already exists in the DB are skipped (admins who edit them keep
 * their changes); with --force the seed values overwrite whatever's
 * there.
 */
import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import connectDB from '../config/db';
import Book from '../models/Book';

const u = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?w=600&h=880&fit=crop&crop=entropy&q=80&auto=format`;

const BOOKS = [
  { slug: 'verdict24', title: 'The Verdict 2024', author: 'Aditi Khanna', category: 'Analysis' as const, categoryLabel: 'Analysis · 2024', price: 599, mrp: 799, rating: 4.7, reviews: 212, coverUrl: u('photo-1577563908411-5077b6dc7624'), coverGradient: { c1: '#7a1f1c', c2: '#4a1110', fg: '#fbeae8' }, isNew: true, sortOrder: 10 },
  { slug: 'atlas', title: 'Constituency Atlas: 543 Seats Decoded', author: 'Pollistics Data Desk', category: 'Handbook' as const, categoryLabel: 'Handbook', price: 1299, mrp: 1599, rating: 4.9, reviews: 88, coverUrl: u('photo-1519681393784-d120267933ba'), coverGradient: { c1: '#243b6b', c2: '#16244a', fg: '#eef1f8' }, sortOrder: 20 },
  { slug: 'caste', title: 'Caste & The Ballot', author: 'Dr. Meera Suresh', category: 'Psephology' as const, categoryLabel: 'Psephology', price: 749, rating: 4.6, reviews: 154, coverUrl: u('photo-1532012197267-da84d127e765'), coverGradient: { c1: '#5a3210', c2: '#3a2008', fg: '#f6e9d8' }, sortOrder: 30 },
  { slug: 'swing', title: 'Swing States: UP to Tamil Nadu', author: 'Rohan Menon', category: 'Analysis' as const, categoryLabel: 'Analysis', price: 699, mrp: 899, rating: 4.5, reviews: 97, coverUrl: u('photo-1481627834876-b7833e8f5570'), coverGradient: { c1: '#1d5b4a', c2: '#103a2f', fg: '#e2f1ea' }, sortOrder: 40 },
  { slug: 'booth', title: 'Booth-Level Bharat', author: 'S. Iyer', category: 'Field' as const, categoryLabel: 'Field Manual', price: 499, rating: 4.8, reviews: 301, coverUrl: u('photo-1457369804613-52c61a468e7d'), coverGradient: { c1: '#2a2a30', c2: '#161619', fg: '#f5f5f7' }, isNew: true, sortOrder: 50 },
  { slug: 'pseph', title: 'Psephology: A Field Manual', author: 'Prof. N. Banerjee', category: 'Psephology' as const, categoryLabel: 'Psephology', price: 899, mrp: 1099, rating: 4.7, reviews: 140, coverUrl: u('photo-1544947950-fa07a98d237f'), coverGradient: { c1: '#4a2c5e', c2: '#2e1a3c', fg: '#efe2f6' }, sortOrder: 60 },
  { slug: 'coalition', title: 'The Coalition Decades 1989–2014', author: 'Rohan Menon', category: 'Analysis' as const, categoryLabel: 'Analysis · History', price: 849, rating: 4.6, reviews: 64, coverUrl: u('photo-1495446815901-a7297e633e8d'), coverGradient: { c1: '#6b4a14', c2: '#422d08', fg: '#f7ecd2' }, sortOrder: 70 },
  { slug: 'women', title: 'Women & The Vote', author: 'Kavya Reddy', category: 'Analysis' as const, categoryLabel: 'Analysis', price: 649, mrp: 799, rating: 4.8, reviews: 176, coverUrl: u('photo-1543002588-bfa74002ed7e'), coverGradient: { c1: '#7a1f4a', c2: '#4a112c', fg: '#fbe8f1' }, sortOrder: 80 },
  { slug: 'modi-bio', title: 'The Long Campaign', author: 'V. Raghavan', category: 'Biography' as const, categoryLabel: 'Biography', price: 799, mrp: 999, rating: 4.4, reviews: 233, coverUrl: u('photo-1512820790803-83ca734da794'), coverGradient: { c1: '#2a3a4a', c2: '#18242e', fg: '#e6eef4' }, sortOrder: 90 },
  { slug: 'turnout', title: 'Why India Votes', author: 'Dr. Meera Suresh', category: 'Psephology' as const, categoryLabel: 'Psephology', price: 599, rating: 4.5, reviews: 71, coverUrl: u('photo-1535905557558-afc4877a26fc'), coverGradient: { c1: '#16244a', c2: '#0e1830', fg: '#e6ebf6' }, sortOrder: 100 },
  { slug: 'karyakarta', title: "The Karyakarta's Handbook", author: 'Pollistics Data Desk', category: 'Field' as const, categoryLabel: 'Field Manual', price: 399, mrp: 549, rating: 4.9, reviews: 412, coverUrl: u('photo-1589998059171-988d887df646'), coverGradient: { c1: '#7a3a1c', c2: '#4a2210', fg: '#fbe9de' }, sortOrder: 110 },
  { slug: 'maps', title: 'Mapping the Mandate', author: 'A. Khanna & S. Iyer', category: 'Handbook' as const, categoryLabel: 'Handbook · Atlas', price: 1099, mrp: 1399, rating: 4.7, reviews: 53, coverUrl: u('photo-1524995997946-a1c2e315a42f'), coverGradient: { c1: '#1d4a5b', c2: '#0f2e3a', fg: '#e2eff4' }, isNew: true, sortOrder: 120 },
];

async function main() {
  const force = process.argv.includes('--force');
  console.log(`[seed-books] mode=${force ? 'force (overwrite)' : 'safe (add-only)'}`);
  await connectDB();
  let added = 0, skipped = 0, updated = 0;
  for (const b of BOOKS) {
    const existing = await Book.findOne({ slug: b.slug });
    if (existing && !force) {
      console.log(`  ⊘ ${b.slug.padEnd(14)} already exists, skipping`);
      skipped++;
      continue;
    }
    if (existing && force) {
      Object.assign(existing, b);
      await existing.save();
      console.log(`  ↻ ${b.slug.padEnd(14)} updated`);
      updated++;
    } else {
      await Book.create(b);
      console.log(`  + ${b.slug.padEnd(14)} created`);
      added++;
    }
  }
  console.log(`\n[seed-books] added=${added} updated=${updated} skipped=${skipped}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('[seed-books] FAILED:', e?.message || e);
  process.exit(1);
});
