"use client";

import {
  CalendarDays,
  Flag,
  GitCompare,
  History,
  LayoutDashboard,
  ListOrdered,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { BriefModel, SearchHit, SearchModel } from "@/lib/f1/models";
import { formatAgo, formatPoints, formatUtc } from "@/lib/f1/format";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/standings", label: "Standings", icon: ListOrdered },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/constructors", label: "Constructors", icon: Shield },
  { href: "/races", label: "Race analysis", icon: Flag },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/circuits", label: "Circuits", icon: Map },
  { href: "/history", label: "History", icon: History },
];

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function writeSeason(season: string) {
  document.cookie = `f1_season=${encodeURIComponent(season)}; path=/; max-age=31536000; samesite=lax`;
}

function ShellInner({ seasons, children }: { seasons: number[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [brief, setBrief] = useState<BriefModel | null>(null);
  const [briefState, setBriefState] = useState<"loading" | "ready" | "error">("loading");
  const seasonKey = searchParams.get("season") || readCookie("f1_season") || "current";

  useEffect(() => {
    setCollapsed(document.documentElement.dataset.sidebar === "collapsed");
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [pathname, searchParams]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setBriefState("loading");
    fetch(`/api/brief?season=${encodeURIComponent(seasonKey)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("brief failed");
        setBrief((await response.json()) as BriefModel);
        setBriefState("ready");
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setBriefState("error");
      });
    return () => controller.abort();
  }, [seasonKey]);

  const seasonValue = searchParams.get("season") || (brief ? String(brief.season) : "");
  const options = useMemo(() => {
    const years = new Set(seasons);
    if (seasonValue && /^\d{4}$/.test(seasonValue)) years.add(Number(seasonValue));
    return [...years].sort((a, b) => b - a);
  }, [seasons, seasonValue]);

  function changeSeason(nextSeason: string) {
    writeSeason(nextSeason);
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", nextSeason);
    params.delete("round");
    const raceDetail = /^\/races\/\d{4}\/\d+/.test(pathname);
    router.push(`${raceDetail ? "/races" : pathname}?${params.toString()}`);
  }

  function toggleSidebar() {
    const next = collapsed ? "expanded" : "collapsed";
    setCollapsed(!collapsed);
    if (next === "collapsed") document.documentElement.dataset.sidebar = "collapsed";
    else delete document.documentElement.dataset.sidebar;
    localStorage.setItem("f1-sidebar", next);
  }

  function hrefFor(path: string) {
    const season = searchParams.get("season") || (brief ? String(brief.season) : "");
    if (!season) return path;
    return `${path}?season=${encodeURIComponent(season)}`;
  }

  return (
    <div className={open ? "shell nav-open" : "shell"}>
      <a className="skip" href="#main">Skip to content</a>
      <button type="button" className="backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} />
      <aside className="sidebar" id="sidebar">
        <Link href={hrefFor("/")} className="brand" aria-label="F1 Analyst home">
          <span className="brand-mark">F1</span>
          <span className="brand-copy">
            <span className="brand-name">Analyst</span>
            <span className="brand-sub">Performance lab</span>
          </span>
        </Link>
        <nav className="nav" aria-label="Primary">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={hrefFor(item.href)} className="nav-link" aria-current={active ? "page" : undefined}>
                <Icon aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="champ">
            {briefState === "ready" && brief?.leader ? (
              <div className="champ-copy">
                <p className="stat-label">Drivers · R{brief.standingsRound ?? "—"}</p>
                <p><strong>{brief.leader.name}</strong> {formatPoints(brief.leader.points)}</p>
                <p className="note">{brief.gap == null ? "Gap unavailable" : `Gap to P2 ${formatPoints(brief.gap)}`}</p>
                {brief.constructorLeader ? <p className="note">{brief.constructorLeader.name} {formatPoints(brief.constructorLeader.points)}</p> : null}
              </div>
            ) : (
              <p className="note champ-copy">{briefState === "error" ? "Championship status unavailable" : "Loading championship"}</p>
            )}
          </div>
          <button type="button" className="btn" onClick={toggleSidebar} aria-pressed={collapsed}>
            {collapsed ? <PanelLeftOpen aria-hidden="true" size={16} /> : <PanelLeftClose aria-hidden="true" size={16} />}
            <span className="collapse-label">{collapsed ? "Expand" : "Collapse"}</span>
          </button>
          <Link href={hrefFor("/settings")} className="nav-link" aria-current={pathname === "/settings" ? "page" : undefined}>
            <Settings aria-hidden="true" />
            <span className="nav-label">Settings</span>
          </Link>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label="Open navigation" aria-expanded={open} aria-controls="sidebar" onClick={() => setOpen((value) => !value)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <SearchBox season={seasonKey} />
          <label className="field">
            <span className="sr-only">Season</span>
            <select className="control" aria-label="Season" value={seasonValue} onChange={(event) => changeSeason(event.target.value)}>
              {seasonValue ? null : <option value="">Season</option>}
              {options.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
          <Freshness brief={brief} state={briefState} />
        </header>
        <main id="main" className="main">{children}</main>
        <footer className="footer">Results, standings, schedules, qualifying, lap times, and pit stops from Jolpica-F1. Not a live timing feed. Not affiliated with Formula 1 or the FIA.</footer>
      </div>
    </div>
  );
}

function Freshness({ brief, state }: { brief: BriefModel | null; state: "loading" | "ready" | "error" }) {
  const [ago, setAgo] = useState("Checking data");
  useEffect(() => {
    if (!brief?.fetchedAt) return;
    const update = () => setAgo(`${formatAgo(brief.fetchedAt!)} · ${formatUtc(brief.fetchedAt)}`);
    update();
    const id = window.setInterval(update, 30000);
    return () => window.clearInterval(id);
  }, [brief]);
  const stale = brief?.stale || state === "error";
  return (
    <p className="fresh" title="Oldest retrieval time among the championship feeds">
      <span className={state === "error" ? "dot bad" : stale ? "dot warn" : "dot"} />
      <span className="fresh-time">{state === "loading" ? "Checking data" : state === "error" ? "Status unavailable" : stale ? `Stale · ${ago}` : `Updated · ${ago}`}</span>
    </p>
  );
}

function SearchBox({ season }: { season: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [results, setResults] = useState<SearchModel | null>(null);
  const [active, setActive] = useState(0);
  const items = useMemo(() => {
    const hits: SearchHit[] = [...(results?.drivers ?? []), ...(results?.constructors ?? []), ...(results?.races ?? [])];
    return hits;
  }, [results]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setStatus("idle");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setStatus("loading");
      fetch(`/api/search?season=${encodeURIComponent(season)}&q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error("search failed");
          setResults((await response.json()) as SearchModel);
          setStatus("ready");
          setActive(0);
          setOpen(true);
        })
        .catch((error: Error) => {
          if (error.name === "AbortError") return;
          setStatus("error");
        });
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, season]);

  return (
    <div className="search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <Search aria-hidden="true" />
      <input
        className="control"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-results"
        aria-autocomplete="list"
        aria-label="Search drivers, constructors, and races"
        placeholder="Search drivers, teams, races"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((value) => Math.min(value + 1, Math.max(items.length - 1, 0)));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((value) => Math.max(value - 1, 0));
          } else if (event.key === "Enter" && items[active]) {
            event.preventDefault();
            router.push(items[active].href);
            setOpen(false);
          } else if (event.key === "Escape") setOpen(false);
        }}
      />
      {open ? (
        <div className="search-panel" id="search-results" role="listbox">
          {status === "error" ? <p className="note">Search is unavailable right now.</p> : null}
          {status === "loading" ? <p className="note">Searching…</p> : null}
          {status === "ready" && items.length === 0 ? <p className="note">No matches in this season.</p> : null}
          {items.map((item, index) => (
            <Link key={item.href} href={item.href} role="option" aria-selected={index === active} className={index === active ? "is-active" : undefined} onMouseEnter={() => setActive(index)}>
              <span>{item.label}</span>
              <span className="note">{item.detail}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ seasons, children }: { seasons: number[]; children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="main">Loading workspace…</div>}>
      <ShellInner seasons={seasons}>{children}</ShellInner>
    </Suspense>
  );
}
