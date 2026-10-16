import { cookies } from "next/headers";

export async function readSearchParams(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Record<string, string | undefined>> {
  const resolved = await searchParams;
  return Object.fromEntries(
    Object.entries(resolved).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
}

export async function requestedSeason(
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<string> {
  const params = await readSearchParams(searchParams);
  if (params.season && /^\d{4}$/.test(params.season)) return params.season;
  const jar = await cookies();
  const saved = jar.get("f1_season")?.value;
  if (saved && /^\d{4}$/.test(saved)) return saved;
  return "current";
}

export function yearOr(value: string | undefined, fallback: number): number {
  if (!value || !/^\d{4}$/.test(value)) return fallback;
  return Number(value);
}
