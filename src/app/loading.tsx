export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="kicker">Loading</p>
      <div className="skeleton" style={{ height: 32, width: "42%", margin: "12px 0 18px" }} />
      <div className="grid-2">
        <div className="skeleton" style={{ height: 148 }} />
        <div className="skeleton" style={{ height: 148 }} />
      </div>
      <p className="note">Requesting Jolpica. The first view of a season can take several seconds. Later views reuse the saved response.</p>
    </div>
  );
}
