export function businessScope(req: Request, userId: string) {
  const id = new URL(req.url).searchParams.get("biz")
  return { userId, ...(id ? { id } : {}) }
}
