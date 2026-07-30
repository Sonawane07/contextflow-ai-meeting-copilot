import type { ApiError, ApiSuccess } from "@/types";

export async function fetchData<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiSuccess<T>> {
  const response = await fetch(input, init);
  const payload = (await response.json()) as ApiSuccess<T> | ApiError;
  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload ? payload.error.message : "The request failed.",
    );
  }
  return payload;
}
