import type { NextResponse } from "next/server"
type ResponseBody<Response> = Response extends NextResponse<infer Data> ? Exclude<Data, { error: string }> : never
export type ApiData<Handler extends (...args: never[]) => unknown> = ResponseBody<Awaited<ReturnType<Handler>>>
