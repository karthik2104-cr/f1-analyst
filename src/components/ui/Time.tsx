"use client";

import { useEffect, useState } from "react";
import { formatRaceDate } from "@/lib/f1/format";

export function LocalTime({ date, time }: { date: string; time?: string | null }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!time) return;
    const parsed = Date.parse(`${date}T${time.endsWith("Z") ? time : `${time}Z`}`);
    if (!Number.isFinite(parsed)) return;
    setText(new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(parsed)));
  }, [date, time]);
  return (
    <span>
      {formatRaceDate(date)}
      {time ? ` · ${time.replace(/Z$/, "")} UTC` : ""}
      {text ? ` · ${text} local` : ""}
    </span>
  );
}

export function Countdown({ iso }: { iso: string | null }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!iso) return;
    const update = () => {
      const delta = Date.parse(iso) - Date.now();
      if (!Number.isFinite(Date.parse(iso))) {
        setLabel("The published start time could not be read.");
        return;
      }
      if (delta <= 0) {
        setLabel("The scheduled start time has passed.");
        return;
      }
      const total = Math.floor(delta / 1000);
      if (total < 60) {
        setLabel("Under 1 minute");
        return;
      }
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      setLabel(`${days}d ${hours}h ${minutes}m`);
    };
    update();
    const id = window.setInterval(update, 15000);
    return () => window.clearInterval(id);
  }, [iso]);
  if (!iso) return <p className="note">Start time has not been published, so a countdown is not shown.</p>;
  return (
    <p className="countdown" aria-live="polite">
      {label ?? "Calculating countdown"}
    </p>
  );
}
