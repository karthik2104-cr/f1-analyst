"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBytes, formatUtc } from "@/lib/f1/format";
import { SOURCE_URL } from "@/lib/f1/source";

type CacheStatus = {
  directory: string;
  files: number;
  bytes: number;
  newestFetchedAt: string | null;
  oldestFetchedAt: string | null;
};

export function SettingsPanel({ cache }: { cache: CacheStatus }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [density, setDensity] = useState("default");
  const [motion, setMotion] = useState("default");

  useEffect(() => {
    setDensity(document.documentElement.dataset.density === "compact" ? "compact" : "default");
    setMotion(document.documentElement.dataset.motion === "reduce" ? "reduce" : "default");
  }, []);

  function setPref(key: "f1-density" | "f1-motion", value: string, attribute: "density" | "motion") {
    if (value === "default") {
      localStorage.removeItem(key);
      delete document.documentElement.dataset[attribute];
    } else {
      localStorage.setItem(key, value);
      document.documentElement.dataset[attribute] = value;
    }
  }

  async function clear() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/cache", { method: "DELETE" });
      if (!response.ok) throw new Error("The cache could not be cleared.");
      setMessage("Saved responses were cleared. The next page will request Jolpica again.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The cache could not be cleared.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid-2">
      <section className="card">
        <h2>Display</h2>
        <div className="toolbar">
          <label className="field">Density
            <select className="control" value={density} onChange={(event) => { setDensity(event.target.value); setPref("f1-density", event.target.value, "density"); }}>
              <option value="default">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label className="field">Motion
            <select className="control" value={motion} onChange={(event) => { setMotion(event.target.value); setPref("f1-motion", event.target.value, "motion"); }}>
              <option value="default">Standard</option>
              <option value="reduce">Reduce</option>
            </select>
          </label>
        </div>
        <p className="note">The season in the header is stored in a cookie named f1_season on this browser. It does not change historical calculations until you open a season page.</p>
      </section>
      <section className="card">
        <h2>Cache</h2>
        <p>{cache.files} saved responses · {formatBytes(cache.bytes)} · {cache.directory}</p>
        <p className="note">Newest retrieval {cache.newestFetchedAt ? formatUtc(cache.newestFetchedAt) : "none yet"}.</p>
        <p className="note">Oldest retrieval {cache.oldestFetchedAt ? formatUtc(cache.oldestFetchedAt) : "none yet"}.</p>
        <p style={{ marginTop: 12 }}><button type="button" className="btn" disabled={busy} onClick={clear}>{busy ? "Clearing" : "Clear saved data"}</button></p>
        {message ? <p className="note">{message}</p> : null}
      </section>
      <section className="card">
        <h2>Jolpica-F1</h2>
        <p><span className="chip phase-completed">Connected</span></p>
        <p>Schedules, standings, race results, qualifying, sprint results, lap times, and pit stops. Responses are cached. Current standings expire after 30 minutes. Past seasons are kept for seven days.</p>
        <p><a href={SOURCE_URL} target="_blank" rel="noreferrer">Project and documentation</a></p>
        <p className="note">Unauthenticated use is limited by Jolpica to about 4 requests per second and 500 requests per hour. This app spaces requests and sends the user agent F1Analyst/1.0.0. No API key is required or stored.</p>
      </section>
      <section className="card">
        <h2>FastF1</h2>
        <p><span className="chip">Not connected</span></p>
        <p>Tyre compounds, stints, sector times, and telemetry are unavailable. The interface does not substitute sample telemetry.</p>
      </section>
      <section className="card">
        <h2>What the numbers are</h2>
        <ul>
          <li>Live timing is not connected. A result appears after Jolpica publishes it.</li>
          <li>Delayed data is the cached response. The timestamp on each page is the oldest retrieval used there.</li>
          <li>Historical data is the same feed, with a longer cache because finished seasons rarely change.</li>
          <li>There is no demo dataset. Empty states mean the feed did not return that metric.</li>
        </ul>
      </section>
    </div>
  );
}
