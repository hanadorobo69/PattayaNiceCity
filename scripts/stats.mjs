import { PrismaClient } from "@prisma/client"
import { readdirSync } from "fs"
const p = new PrismaClient()
const total = await p.venue.count({ where: { isActive: true } })
const withPhoto = await p.venue.count({ where: { isActive: true, NOT: { imageUrl: null } } })
const withHours = await p.venue.count({ where: { isActive: true, NOT: { hours: null } } })
const withPhone = await p.venue.count({ where: { isActive: true, NOT: { phone: null } } })
const cats = await p.$queryRaw`SELECT c.slug, COUNT(v.id)::int as count FROM "Category" c LEFT JOIN "Venue" v ON v."categoryId" = c.id AND v."isActive" = true GROUP BY c.id, c.slug ORDER BY count DESC`
let langs = []
try { langs = readdirSync("messages").filter(f => f.endsWith(".json")).map(f => f.replace(".json","")) } catch {}
console.log("Total active venues:", total)
console.log("With photo:", withPhoto)
console.log("With hours:", withHours)
console.log("With phone:", withPhone)
console.log("Languages:", langs.join(", "))
console.log("Categories:")
cats.forEach(c => { if (c.count > 0) console.log("  " + c.slug + ": " + c.count) })
await p.$disconnect()
