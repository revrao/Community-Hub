"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const links = [
    ["/", "Explore", "map"],
    ["/leaderboard", "Leaderboard", "trophy"],
    ["/profile", "Profile", "user"],
  ];
  const nav = links.map(([href, label, icon]) => (
    <Link
      key={href}
      href={href}
      className={
        (
          href === "/"
            ? path === "/" || path.startsWith("/events/")
            : path.startsWith(href)
        )
          ? "active"
          : ""
      }
      aria-current={path === href ? "page" : undefined}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  ));
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="nav-inner">
          <Link className="brand" href="/">
            Community<strong>Hub</strong>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {nav}
          </nav>
          <div className="nav-right">
            <Link className="topsearch" href="/#search">
              <Icon name="search" />
              Search opportunities
            </Link>
            <Link
              href="/profile"
              className="avatar"
              aria-label="Open sample profile"
            >
              CM
            </Link>
          </div>
        </div>
      </header>
      <div className="demo-strip">
        Sample data preview · Changes last only while this app is open. Accounts
        and live maps are coming next.
      </div>
      <main id="main" className="shell">
        {children}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav}
      </nav>
    </>
  );
}
