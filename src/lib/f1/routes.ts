export function seasonQuery(season: number | string, extra?: Record<string, string | number | null | undefined>): string {
  const params = new URLSearchParams();
  params.set("season", String(season));
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value != null && value !== "") params.set(key, String(value));
    }
  }
  return params.toString();
}

export function withSeason(path: string, season: number | string, extra?: Record<string, string | number | null | undefined>): string {
  return `${path}?${seasonQuery(season, extra)}`;
}

export function driverPath(season: number, driverId: string): string {
  return withSeason(`/drivers/${driverId}`, season);
}

export function constructorPath(season: number, constructorId: string): string {
  return withSeason(`/constructors/${constructorId}`, season);
}

export function racePath(season: number, round: number): string {
  return `/races/${season}/${round}`;
}

export function circuitPath(circuitId: string, season?: number): string {
  return season ? withSeason(`/circuits/${circuitId}`, season) : `/circuits/${circuitId}`;
}
