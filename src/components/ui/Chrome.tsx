import Link from "next/link";
import { formatUtc } from "@/lib/f1/format";
import type { DataMeta } from "@/lib/f1/types";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  crumbs,
}: {
  kicker: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  crumbs?: { href: string; label: string }[];
}) {
  return (
    <header className="page-head">
      <div>
        {crumbs?.length ? (
          <nav aria-label="Breadcrumb">
            <ol className="crumbs">
              {crumbs.map((crumb) => (
                <li key={crumb.href}><Link href={crumb.href}>{crumb.label}</Link></li>
              ))}
              <li aria-current="page">{title}</li>
            </ol>
          </nav>
        ) : null}
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        {description ? <p className="lede">{description}</p> : null}
      </div>
      {actions ? <div className="page-head-actions">{actions}</div> : null}
    </header>
  );
}

export function MetaBar({ meta }: { meta: DataMeta }) {
  const freshness = meta.stale ? "Potentially stale" : meta.fetchedAt ? "Within cache window" : "Update time unavailable";
  return (
    <div className="meta-bar">
      <p>
        {meta.source}
        {meta.season ? ` · ${meta.season}` : ""}
        {meta.standingsRound != null ? ` · Standings through round ${meta.standingsRound}` : ""}
        {meta.fetchedAt ? (
          <>
            {" · "}
            <time dateTime={meta.fetchedAt} title="Oldest successful retrieval among the sources on this page">
              Last successful update {formatUtc(meta.fetchedAt)}
            </time>
          </>
        ) : null}
        {` · ${freshness}`}
      </p>
      {meta.stale ? <p className="banner">The latest refresh failed. These figures are the last saved Jolpica response and may be out of date.</p> : null}
      {meta.partial.length ? <p className="banner">Incomplete feed: {meta.partial.join("; ")}. Incomplete sections are not treated as final results.</p> : null}
    </div>
  );
}

export function Section({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {description ? <p className="note">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {detail ? <p className="stat-detail">{detail}</p> : null}
    </article>
  );
}

export function Definitions({ items }: { items: { term: string; detail: string }[] }) {
  return (
    <details className="definitions">
      <summary>How these figures are calculated</summary>
      <dl>
        {items.map((item) => (
          <div key={item.term}>
            <dt>{item.term}</dt>
            <dd>{item.detail}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function DriverMark({ label, number, color }: { label: string; number: string | null; color?: string }) {
  return (
    <span className="mark" style={color ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined} aria-hidden="true">
      <span className="mark-code">{label}</span>
      {number ? <span className="mark-num">{number}</span> : null}
    </span>
  );
}

export function Delta({ value }: { value: number | "new" | null }) {
  if (value === "new") return <span className="chip">New</span>;
  if (value == null) return <span className="muted">—</span>;
  if (value === 0) return <span className="muted">0</span>;
  return <span className={value > 0 ? "delta up" : "delta down"}>{value > 0 ? `+${value}` : value}</span>;
}
