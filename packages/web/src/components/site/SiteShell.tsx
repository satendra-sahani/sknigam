/**
 * SiteShell — wraps every public Pollistics marketing page. Provides the
 * `.pol` scope root (so the design-system CSS never touches the admin app),
 * the shared sticky header and the footer. Pages render their own <section>s
 * as children.
 */
import { SiteHeader, SiteNavKey } from './SiteHeader';
import { SiteFooter, FooterVariant } from './SiteFooter';

export function SiteShell({
  active,
  footer = 'default',
  children,
}: {
  active?: SiteNavKey;
  footer?: FooterVariant;
  children: React.ReactNode;
}) {
  return (
    <div className="pol">
      <SiteHeader active={active} />
      {children}
      <SiteFooter variant={footer} />
    </div>
  );
}
