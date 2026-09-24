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

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  adminToken?: string | null;
};

/** JSON request that surfaces the server's `{ error }` message on failure. */
export async function apiRequest<T>(
  path: string,
  { method = "GET", body, adminToken }: ApiRequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};

  if (API_SECRET) {
    headers.Authorization = `Bearer ${API_SECRET}`;
  }
  if (adminToken) {
    headers["X-Admin-Token"] = adminToken;
  }
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  }

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof json?.error === "string" ? json.error : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return json as T;
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
