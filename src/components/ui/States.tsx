"use client";

export function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="state" role="alert">
      <p className="kicker">Unavailable</p>
      <h1>{title}</h1>
      <p className="lede">{body}</p>
      <p style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </p>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="state">
      <p className="kicker">No data</p>
      <h2>{title}</h2>
      <p className="lede">{body}</p>
    </div>
  );
}
