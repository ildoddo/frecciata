// Piccolo wrapper fetch per i client components: errore leggibile in un ExceptionMessage-friendly shape.
export class ApiClientError extends Error {}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? "GET",
    headers: opts.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Errore ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* corpo non JSON: lasciamo il messaggio generico */
    }
    throw new ApiClientError(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
