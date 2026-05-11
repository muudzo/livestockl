import { Outlet, NavLink, Link, useLocation } from 'react-router';
import { useEffect } from 'react';

/**
 * Public layout for the SaPS operator marketing surface (/operators/*).
 *
 * Editorial publication-style — kraft paper background, ink text, sale-ring red
 * accent. Distinct from the tenant-aware buyer Root layout: no auth, no drawer,
 * no tenant context. Designed to read like Foreign Affairs, not a SaaS dashboard.
 *
 * The aesthetic shares its palette + typography with AuthScreen so the brand
 * stays coherent across the marketing surfaces. Buyer screens keep their own
 * shadcn defaults.
 */
export function OperatorLayout() {
  const location = useLocation();

  // Scroll to top on route change — editorial pages are long, and the
  // operator should always land at the top of the next section.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="operators-theme min-h-screen bg-kraft-100 text-ink-900 font-body antialiased">
      <OperatorNav />
      <main>
        <Outlet />
      </main>
      <OperatorFooter />
    </div>
  );
}

function OperatorNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-900/10 bg-kraft-100/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          to="/operators"
          className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-ink-900 transition-colors hover:text-ring-red"
        >
          <span className="inline-block h-px w-6 bg-ink-900/60" />
          ZimLivestock <span className="text-ink-500">· for operators</span>
        </Link>

        <nav aria-label="Operators" className="flex items-center gap-7">
          <NavLink
            to="/operators/pricing"
            className={({ isActive }) =>
              `font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                isActive ? 'text-ring-red' : 'text-ink-700 hover:text-ink-900'
              }`
            }
          >
            Pricing
          </NavLink>
          <NavLink
            to="/operators/case-studies/harare"
            className={({ isActive }) =>
              `hidden font-mono text-[11px] uppercase tracking-[0.18em] transition-colors sm:inline ${
                isActive ? 'text-ring-red' : 'text-ink-700 hover:text-ink-900'
              }`
            }
          >
            Case study
          </NavLink>
          <Link
            to="/operators/request-access"
            className="inline-flex items-center gap-1.5 border border-ink-900 px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-900 transition-colors hover:bg-ink-900 hover:text-kraft-50"
          >
            Request access <span aria-hidden>→</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

function OperatorFooter() {
  return (
    <footer className="mt-24 border-t border-ink-900/15 bg-kraft-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <FootCol heading="Platform">
            <FootLink to="/operators">Overview</FootLink>
            <FootLink to="/operators/pricing">Pricing</FootLink>
            <FootLink to="/operators/case-studies/harare">Case study</FootLink>
          </FootCol>

          <FootCol heading="Trust">
            <li className="text-[12px] leading-relaxed text-ink-700">
              Paynow Integration{' '}
              <span className="font-mono text-ink-900">#23997</span>
            </li>
            <li className="text-[12px] leading-relaxed text-ink-700">
              Row-level security · audited 2026-04-13
            </li>
            <li className="text-[12px] leading-relaxed text-ink-700">
              Built on Supabase + Paynow
            </li>
          </FootCol>

          <FootCol heading="Contact">
            <li className="text-[12px] leading-relaxed text-ink-700">
              Tatenda Nyemudzo
              <br />
              <span className="text-ink-500">Paynow internship · 2026</span>
            </li>
            <li>
              <a
                href="mailto:dev@paynow.co.zw"
                className="text-[12px] leading-relaxed text-ink-700 underline decoration-ink-500/40 underline-offset-2 hover:text-ring-red hover:decoration-ring-red"
              >
                dev@paynow.co.zw
              </a>
            </li>
          </FootCol>

          <FootCol heading="Buyers & sellers">
            <li className="text-[12px] leading-relaxed text-ink-500">
              Looking to bid on livestock?
            </li>
            <li>
              <Link
                to="/"
                className="text-[12px] leading-relaxed text-ink-700 underline decoration-ink-500/40 underline-offset-2 hover:text-ring-red hover:decoration-ring-red"
              >
                Open the marketplace →
              </Link>
            </li>
          </FootCol>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-ink-900/10 pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500 sm:flex-row sm:items-center">
          <span>© MMXXVI · ZimLivestock</span>
          <span>Harare, Zimbabwe</span>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-500">
        {heading}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FootLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-[12px] leading-relaxed text-ink-700 transition-colors hover:text-ring-red"
      >
        {children}
      </Link>
    </li>
  );
}

export default OperatorLayout;
