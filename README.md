# Commu

Application communautaire pour partager et découvrir les meilleures adresses.

## Lancement rapide (POC)

```bash
git clone ...
cd commu
npm run poc
```

Ouvrir http://localhost:3000

**Comptes de démo :** alex@commu.dev / sarah@commu.dev / thomas@commu.dev — mot de passe : `password123`

## Développement

```bash
npm install
npm run setup   # DB push + seed
npm run dev
```

## Stack

- **Next.js 15** App Router
- **TypeScript** strict
- **Tailwind CSS** + shadcn/ui
- **Prisma** ORM + SQLite (dev/poc)
- **iron-session** auth (cookie-based)
- **Zod** + React Hook Form

## Scripts

| Commande | Description |
|---|---|
| `npm run poc` | Tout-en-un : install + db + seed + dev |
| `npm run dev` | Démarrer le serveur de développement |
| `npm run setup` | Push DB + seed données démo |
| `npm run db:studio` | Interface graphique Prisma Studio |
| `npm run db:seed` | Re-seeder les données |

## Structure

```
src/
├── app/            # Pages Next.js (App Router)
├── actions/        # Server Actions (mutations)
├── components/     # Composants React
├── lib/            # Utilitaires, Prisma, Auth
├── types/          # Types TypeScript
└── validations/    # Schémas Zod
```
