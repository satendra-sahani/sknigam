/**
 * Shared Pollistics footer. The handoff uses a few footer variants across
 * pages (the consulting site, the App page, Pollistics Press, the Bookstore).
 * `variant` selects between them; markup/classes mirror the design's <footer>.
 */
import Link from 'next/link';

export type FooterVariant = 'default' | 'app' | 'press' | 'store';

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>
);

const Social = () => (
  <div className="social">
    <a href="#" aria-label="Facebook"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1z" /></svg></a>
    <a href="#" aria-label="X"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h3l-7 8 8 12h-6l-5-7-6 7H1l8-9L1 2h6l5 6z" /></svg></a>
    <a href="#" aria-label="LinkedIn"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 002.5 6 2.5 2.5 0 005 8.5 2.5 2.5 0 007.5 6 2.5 2.5 0 004.98 3.5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05 4 0 4.74 2.64 4.74 6.07V21H18.5v-5.4c0-1.3 0-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86V21H10z" /></svg></a>
  </div>
);

const Brand = ({ name }: { name: string }) => (
  <div className="bn2"><img src="/assets/logo.png" alt="" /><span>{name}</span></div>
);

export function SiteFooter({ variant = 'default' }: { variant?: FooterVariant }) {
  if (variant === 'press') {
    return (
      <footer>
        <div className="page">
          <div className="ftop">
            <div>
              <Brand name="Pollistics Press" />
              <p className="desc">India&apos;s home for election writing — from the booth worker&apos;s manual to the psephologist&apos;s magnum opus.</p>
            </div>
            <div><h5>Publish</h5><ul><li>How it works</li><li>Packages</li><li>Royalties</li><li>Author guide</li></ul></div>
            <div><h5>Bookstore</h5><ul><li><Link href="/bookstore">Browse titles</Link></li><li>Bestsellers</li><li>New releases</li></ul></div>
            <div><h5>About</h5><ul><li><Link href="/about">Pollistics</Link></li><li><Link href="/#enquiry">Contact</Link></li><li>Terms</li></ul></div>
          </div>
          <div className="fbot"><span>© 2026 Pollistics Media Pvt. Ltd. · Pollistics Press</span><span>ISBN registrar · POD partner network</span></div>
        </div>
      </footer>
    );
  }

  if (variant === 'store') {
    return (
      <footer>
        <div className="page">
          <div className="ftop">
            <div>
              <Brand name="Pollistics Bookstore" />
              <p className="desc">The shelf for India&apos;s election readers — analysis, atlases and field manuals, delivered.</p>
            </div>
            <div><h5>Shop</h5><ul><li>Bestsellers</li><li>New releases</li><li>E-books</li></ul></div>
            <div><h5>Help</h5><ul><li>Track order</li><li>Returns</li><li>Delivery</li></ul></div>
            <div><h5>About</h5><ul><li><Link href="/publish">Pollistics Press</Link></li><li><Link href="/#enquiry">Contact</Link></li><li>Terms</li></ul></div>
          </div>
          <div className="fbot"><span>© 2026 Pollistics Media Pvt. Ltd. · Bookstore</span><span>Secure payments · Pan-India delivery</span></div>
        </div>
      </footer>
    );
  }

  if (variant === 'app') {
    return (
      <footer>
        <div className="page">
          <div className="ftop">
            <div>
              <Brand name="Pollistics" />
              <p className="desc">India&apos;s data-driven political strategy and election-management firm.</p>
            </div>
            <div><h5>Company</h5><ul><li><Link href="/about">About Us</Link></li><li><Link href="/services">Services</Link></li><li><Link href="/#insights">Insights</Link></li><li><Link href="/#enquiry">Contact</Link></li></ul></div>
            <div><h5>Products</h5><ul><li><Link href="/download">Pollistics App</Link></li><li><Link href="/publish">Publish a book</Link></li><li><Link href="/bookstore">Bookstore</Link></li></ul></div>
            <div><h5>Connect</h5><ul><li>Privacy Policy</li><li>Terms &amp; Conditions</li><li>App Privacy Policy</li></ul></div>
          </div>
          <div className="fbot"><span>© 2026 Pollistics Management Consulting Pvt. Ltd.</span><span>v2.1 · build 247</span></div>
        </div>
      </footer>
    );
  }

  // default — Pollistics consulting firm (home / about / services / contact)
  return (
    <footer>
      <div className="page">
        <div className="ftop">
          <div>
            <Brand name="Pollistics" />
            <p className="desc">India&apos;s data-driven political strategy and election-management firm — research, analytics, war-room strategy and ground execution under one roof.</p>
            <div className="contact-line"><PinIcon /> Tower B3, Spaze I-Tech Park, Sohna Road, Gurgaon, Haryana 122001</div>
            <div className="contact-line"><PhoneIcon /> +91 96500 60882 · strategy@pollistics.in</div>
          </div>
          <div><h5>Company</h5><ul><li><Link href="/about">About Us</Link></li><li><Link href="/services">Services</Link></li><li><Link href="/#insights">Insights</Link></li><li><Link href="/contact">Contact</Link></li></ul></div>
          <div><h5>Products</h5><ul><li><Link href="/download">Pollistics App</Link></li><li><Link href="/publish">Publish a book</Link></li><li><Link href="/bookstore">Bookstore</Link></li><li><Link href="/services">War Room</Link></li></ul></div>
          <div>
            <h5>Connect</h5>
            <ul><li>Privacy Policy</li><li>Terms &amp; Conditions</li><li>App Privacy Policy</li></ul>
            <Social />
          </div>
        </div>
        <div className="fbot"><span>© 2026 Pollistics Management Consulting Pvt. Ltd. · All rights reserved.</span><span>Data sourced from ECI &amp; verified independently.</span></div>
      </div>
    </footer>
  );
}
