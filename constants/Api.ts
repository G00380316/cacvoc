export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const API_SECRET = process.env.EXPO_PUBLIC_API_SECRET;

export async function fetchJson<T>(path: string): Promise<T> {
  const headers: HeadersInit = API_SECRET
    ? { Authorization: `Bearer ${API_SECRET}` }
    : {};

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchFirstJson<T>(paths: string[]): Promise<T> {
  let lastError: unknown;

  for (const path of paths) {
    try {
      return await fetchJson<T>(path);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}
