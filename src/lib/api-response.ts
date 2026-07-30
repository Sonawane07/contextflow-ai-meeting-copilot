import { NextResponse } from "next/server";
import type { ApiError, ApiSuccess } from "@/types";

export function success<T>(
  data: T,
  meta?: ApiSuccess<T>["meta"],
  init?: ResponseInit,
) {
  return NextResponse.json<ApiSuccess<T>>({ data, meta }, init);
}

export function failure(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json<ApiError>(
    { error: { code, message, details } },
    { status },
  );
}
