"use client";

import { useRouter } from "next/navigation";

export function PathSelect({
  label,
  value,
  options,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <label className="field">
      {label}
      <select
        className="control"
        aria-label={label}
        value={value}
        onChange={(event) => {
          const href = options.find((option) => option.value === event.target.value)?.href;
          if (href) router.push(href);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
