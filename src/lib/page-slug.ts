export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export async function generateUniqueSlug(
  name: string,
  prisma: { business: { findUnique: (args: any) => Promise<any> } }
): Promise<string> {
  const base = slugify(name)
  let slug = base
  let attempt = 0
  while (attempt < 10) {
    const existing = await prisma.business.findUnique({ where: { pageSlug: slug }, select: { id: true } })
    if (!existing) return slug
    attempt++
    slug = `${base}-${attempt}`
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}
