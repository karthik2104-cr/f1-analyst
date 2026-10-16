export class DataError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "DataError";
    this.status = status;
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof DataError && error.status === 404;
}

export function errorMessage(error: unknown, fallback = "The data could not be loaded."): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
