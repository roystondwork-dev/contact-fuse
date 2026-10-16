import { Archive, CircleUserRound, Lock, Settings, type LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { cn } from "../lib/utils.ts";
import { PAGE_TITLE_ID } from "./page-header.tsx";
import { ThemeToggle } from "./theme-toggle.tsx";

const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/accounts", label: "Accounts", icon: CircleUserRound },
  { to: "/backups", label: "Backups", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
];

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

type AppShellProps = {
  /** Onboarding hides the main navigation. */
  showNav?: boolean;
};

/** Skip link, top bar (name, nav, privacy badge, theme toggle) and the page outlet. */
export function AppShell({ showNav = true }: AppShellProps) {
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);

  // After a route change, move focus to the new page's H1 (docs/design/accessibility.md).
  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    document.getElementById(PAGE_TITLE_ID)?.focus();
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-surface text-text">
      <a
        href="#main"
        className={cn(
          "sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface-raised focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-md",
          FOCUS_RING,
        )}
      >
        Skip to main content
      </a>
      <header className="border-b border-border bg-surface-muted">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <Link
            to="/"
            className={cn("rounded-sm text-base font-semibold whitespace-nowrap", FOCUS_RING)}
          >
            contact-fuse
          </Link>
          {showNav ? (
            <nav aria-label="Main" className="order-last w-full sm:order-none sm:w-auto">
              <ul className="flex flex-wrap gap-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          "flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-text-muted hover:bg-surface hover:text-text",
                          isActive &&
                            "bg-primary-subtle text-primary hover:bg-primary-subtle hover:text-primary",
                          FOCUS_RING,
                        )
                      }
                    >
                      <Icon aria-hidden="true" className="size-5" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-xs font-medium text-text-muted"
              title="Your contacts stay on this computer."
            >
              <Lock aria-hidden="true" className="size-3.5" />
              Local only
              <span className="sr-only">: your contacts stay on this computer</span>
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 outline-none md:px-6 lg:py-12"
      >
        <Outlet />
      </main>
    </div>
  );
}
