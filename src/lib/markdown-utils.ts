// Server-safe markdown utility functions (no "use client" - can be called from Server Components)

export function extractHeadings(content: string): Array<{ id: string; text: string; level: number }> {
  const headings: Array<{ id: string; text: string; level: number }> = []
  const regex = /^(#{2,4})\s+(.+)$/gm
  let match

  while ((match = regex.exec(content)) !== null) {
    const level = match[1].length
    const text = match[2].replace(/[*_`\[\]()]/g, "").trim()
    const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-")
    headings.push({ id, text, level })
  }

  return headings
}
