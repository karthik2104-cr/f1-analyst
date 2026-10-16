"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="state" role="alert">
      <p className="kicker">Unavailable</p>
      <h1>This page could not be rendered</h1>
      <p className="lede">{error.message || "An unexpected error occurred while loading this page."}</p>
      <p style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Retry
        </button>
      </p>
    </div>
  );
}
