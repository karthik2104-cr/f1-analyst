import "server-only";

import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { DataError } from "./errors";

type CacheEntry = {
  url: string;
  fetchedAt: string;
  expiresAt: string;
  body: unknown;
};

export type FetchResult<T> = {
  data: T;
  fetchedAt: string;
  stale: boolean;
  url: string;
};

const GAP_MS = 260;
let nextSlot = 0;
const inflight = new Map<string, Promise<FetchResult<unknown>>>();

function cacheDirectory(): string {
  return path.resolve(process.cwd(), process.env.F1_CACHE_DIR || "data/cache");
}

function cachePath(key: string): string {
  return path.join(cacheDirectory(), `${key}.json`);
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pace(): Promise<void> {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + GAP_MS;
  const wait = start - now;
  return wait > 0 ? sleep(wait) : Promise.resolve();
}

function userAgent(): string {
  return process.env.F1_USER_AGENT || "F1Analyst/1.0.0";
}

export function jolpicaUrl(resource: string): string {
  const base = (process.env.JOLPICA_BASE_URL || "https://api.jolpi.ca/ergast/f1").replace(/\/$/, "");
  return `${base}/${resource.replace(/^\//, "")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

async function readCache(key: string): Promise<CacheEntry | null> {
  const file = cachePath(key);
  try {
    const parsed = JSON.parse(await readFile(file, "utf8")) as CacheEntry;
    if (!parsed || typeof parsed.expiresAt !== "string" || !("body" in parsed) || typeof parsed.fetchedAt !== "string") {
      return null;
    }
    return parsed;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && code !== "ENOENT") await unlink(file).catch(() => undefined);
    return null;
  }
}

async function writeCache(key: string, entry: CacheEntry): Promise<void> {
  const dir = cacheDirectory();
  await mkdir(dir, { recursive: true });
  const file = cachePath(key);
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(entry));
  await rename(temp, file);
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return "the requested resource";
  }
}

function asDataError(error: unknown): DataError {
  if (error instanceof DataError) return error;
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new DataError("The Jolpica request timed out.", 504);
  }
  return new DataError("The Jolpica request failed.");
}

async function fetchWithRetry(url: string): Promise<unknown> {
  let last = new DataError("The Jolpica request failed.");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await pace();
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": userAgent() },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get("retry-after"));
        last = new DataError(`Jolpica was busy (${response.status}).`, response.status);
        if (attempt === 3) throw last;
        const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10000) : 400 * attempt;
        await sleep(wait);
        continue;
      }
      if (!response.ok) throw new DataError(`Jolpica responded ${response.status} for ${safePath(url)}.`, response.status);
      const body: unknown = await response.json();
      if (!isRecord(body) || !isRecord(body.MRData)) throw new DataError("Jolpica returned an unexpected payload.");
      return body;
    } catch (error) {
      const normalized = asDataError(error);
      if (normalized.status < 500 && normalized.status !== 429) throw normalized;
      last = normalized;
      if (attempt === 3) throw normalized;
      if (!(error instanceof DataError)) await sleep(350 * attempt);
    }
  }
  throw last;
}

async function load<T>(url: string, ttlMs: number): Promise<FetchResult<T>> {
  const key = hash(url);
  const cached = await readCache(key);
  if (cached && Date.parse(cached.expiresAt) > Date.now()) {
    return { data: cached.body as T, fetchedAt: cached.fetchedAt, stale: false, url };
  }
  try {
    const data = (await fetchWithRetry(url)) as T;
    const fetchedAt = new Date().toISOString();
    await writeCache(key, {
      url,
      fetchedAt,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      body: data,
    });
    return { data, fetchedAt, stale: false, url };
  } catch (error) {
    if (cached) return { data: cached.body as T, fetchedAt: cached.fetchedAt, stale: true, url };
    throw asDataError(error);
  }
}

export function getJson<T>(resource: string, ttlMs: number): Promise<FetchResult<T>> {
  const url = jolpicaUrl(resource);
  const existing = inflight.get(url);
  if (existing) return existing as Promise<FetchResult<T>>;
  const promise = load<T>(url, ttlMs).finally(() => {
    if (inflight.get(url) === promise) inflight.delete(url);
  });
  inflight.set(url, promise as Promise<FetchResult<unknown>>);
  return promise;
}

export type CacheInfo = {
  directory: string;
  files: number;
  bytes: number;
  newestFetchedAt: string | null;
  oldestFetchedAt: string | null;
};

export async function getCacheInfo(): Promise<CacheInfo> {
  const dir = cacheDirectory();
  let files = 0;
  let bytes = 0;
  let newest: string | null = null;
  let oldest: string | null = null;
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    names = [];
  }
  for (const name of names) {
    if (!name.endsWith(".json") || name.includes("..")) continue;
    const file = path.join(dir, name);
    try {
      const info = await stat(file);
      bytes += info.size;
      files += 1;
      const parsed = JSON.parse(await readFile(file, "utf8")) as CacheEntry;
      if (typeof parsed.fetchedAt !== "string") continue;
      if (!newest || parsed.fetchedAt > newest) newest = parsed.fetchedAt;
      if (!oldest || parsed.fetchedAt < oldest) oldest = parsed.fetchedAt;
    } catch {
      continue;
    }
  }
  return { directory: "data/cache", files, bytes, newestFetchedAt: newest, oldestFetchedAt: oldest };
}

export async function clearCache(): Promise<void> {
  const dir = cacheDirectory();
  const resolved = path.resolve(dir);
  const root = path.resolve(process.cwd());
  const relative = path.relative(root, resolved);
  if (!relative || relative === "." || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new DataError("Cache directory must be a folder inside the project.");
  }
  await rm(resolved, { recursive: true, force: true });
}
