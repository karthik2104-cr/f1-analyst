import Link from "next/link";

export default function NotFound() {
  return (
    <div className="state">
      <p className="kicker">Missing</p>
      <h1>That record is not in the loaded feed</h1>
      <p className="lede">The season, round, driver, constructor, or circuit was not returned by Jolpica.</p>
      <p style={{ marginTop: 16 }}>
        <Link className="btn btn-primary" href="/">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
