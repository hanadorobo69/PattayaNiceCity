# Commu — État du projet

## Stack
Next.js 15 App Router · TypeScript · Tailwind CSS · shadcn/ui · Prisma · SQLite (dev) · iron-session (auth) · Zod · React Hook Form

---

## ✅ Fait

### Infrastructure
- [x] Projet Next.js 15 initialisé, TypeScript strict
- [x] Tailwind CSS + `postcss.config.js` + `tailwindcss-animate`
- [x] shadcn/ui composants UI de base (`Button`, `Card`, `Input`, `Badge`, `Avatar`, `Select`, `Tabs`, `Toast`, `DropdownMenu`, `Separator`, `Label`, `Textarea`)
- [x] `components.json` shadcn configuré
- [x] Prisma + SQLite (dev local, prêt pour PostgreSQL/Supabase en prod)
- [x] Auth avec `iron-session` + bcryptjs (pas de Supabase pour l'instant — swap facile plus tard)
- [x] `.env.local` configuré

### Schéma Prisma
- [x] `Profile` (id cuid, username unique, email unique, password, displayName, bio, avatarUrl)
- [x] `Category` (id, name, slug, color, icon)
- [x] `Post` (title, slug unique, content, imageUrl, score, authorId, categoryId)
- [x] `Comment` (content, authorId, postId, parentId → replies imbriquées)
- [x] `Vote` (value 1/-1, @@unique[userId, postId])
- [x] `Favorite` (@@unique[userId, postId])
- [x] DB seedée : 6 catégories, 3 profils démo, 8 posts, votes et favoris

### Pages
- [x] `/` — Feed home avec tri Hot/New/Top + sidebar catégories
- [x] `/post/[slug]` — Détail post + commentaires + vote + favori
- [x] `/create` — Créer un post (auth requis)
- [x] `/saved` — Posts sauvegardés (auth requis)
- [x] `/profile/[username]` — Profil public
- [x] `/login` — Connexion
- [x] `/register` — Inscription

### Fonctionnalités
- [x] Auth complète (inscription, connexion, déconnexion, session)
- [x] Feed avec sort Hot (score/temps), New (date), Top (score)
- [x] Filtre par catégorie (sidebar + URL param)
- [x] Création de post (titre, contenu, catégorie, image URL optionnelle)
- [x] Slug auto-généré depuis le titre
- [x] Upvote / Downvote avec transaction atomique + optimistic UI
- [x] Toggle off du vote (re-cliquer = retirer son vote)
- [x] Favoris avec optimistic UI
- [x] Commentaires (ajout + affichage)
- [x] Structure extensible pour replies imbriquées (parentId)
- [x] Dark mode (next-themes, CSS variables)
- [x] Toasts pour feedback utilisateur

### Design
- [x] Layout 2 colonnes (feed + sidebar) sur desktop
- [x] PostCard avec sidebar score, badge catégorie coloré, meta auteur
- [x] FeedTabs style pill/segmented
- [x] Header sticky avec backdrop blur, logo orange, user menu dropdown
- [x] Pages auth avec gradient bar top
- [x] PostDetail avec back link, vote/favori inline
- [x] Dark mode prêt (variables CSS light + dark)

### API Routes (pour future app mobile)
- [x] `GET/POST /api/posts`
- [x] `GET/PATCH/DELETE /api/posts/[id]`
- [x] `POST /api/votes`
- [x] `POST /api/favorites`
- [x] `GET/POST /api/comments`

---

## 🔧 À régler au prochain démarrage

### Lancer le serveur
```bash
cd c:\Users\trist\projet\commu
npm run dev
```
> Si erreur `EADDRINUSE` — fermer tous les terminaux avec node qui tournent, puis relancer.

### Comptes démo pour tester
```
alex@commu.dev / password123
sarah@commu.dev / password123
thomas@commu.dev / password123
```

---

## 🚧 Reste à faire (par priorité)

### P0 — Bugs / manques immédiats
- [ ] **VoteButtons sur PostCard** — le score s'affiche mais les boutons up/down sont absents de la card (uniquement sur le détail). Ajouter les VoteButtons interactifs sur la card ou décider d'un comportement (clic → redirect vers détail)
- [ ] **FavoriteButton sur PostCard** — même chose, absent de la card
- [ ] **Page profil** `/profile/[username]` — existe mais à compléter (afficher les posts de l'utilisateur, son bio, stats)
- [ ] **Page saved** `/saved` — existe mais à vérifier le rendu
- [ ] **Gestion des erreurs 404** — page `not-found.tsx` à créer

### P1 — Features MVP manquantes
- [ ] **Pagination ou infinite scroll** sur le feed
- [ ] **Suppression d'un post** par son auteur (bouton sur PostDetail)
- [ ] **Édition d'un post** par son auteur
- [ ] **Réponses aux commentaires** (parentId est prêt dans le schéma)
- [ ] **Upload d'image** via Supabase Storage (actuellement image URL manuelle)
- [ ] **Recherche** full-text sur les posts

### P2 — Polish UI
- [ ] **Loading states** — skeletons sur le feed pendant le chargement
- [ ] **Empty states** propres sur toutes les pages
- [ ] **Animations** sur les interactions (vote, favori)
- [ ] **Mobile nav** — menu hamburger ou bottom nav sur mobile
- [ ] **Métadonnées OG** (og:image, og:description) sur les posts

### P3 — Technique / Prod
- [ ] **Migrer vers PostgreSQL/Supabase** (changer `provider = "sqlite"` → `postgresql` dans schema.prisma + mettre les vraies env vars)
- [ ] **Migrer auth vers Supabase Auth** (remplacer iron-session + bcrypt)
- [ ] **Variables d'env de prod** (Vercel ou autre)
- [ ] **Rate limiting** sur les actions (vote, commentaire)
- [ ] **Tests** (au moins les actions critiques : auth, vote, createPost)

### P4 — Futures évolutions
- [ ] Notifications (quand quelqu'un commente ton post)
- [ ] Classement hebdo / mensuel / annuel
- [ ] Trending posts (algorithme hot amélioré)
- [ ] Profils publics enrichis (followers, badges)
- [ ] API REST documentée pour app mobile iOS/Android
- [ ] Modération (signalement de posts/commentaires)

---

## Architecture — rappels clés

```
src/
  actions/          ← Server Actions (mutations web)
  app/api/          ← Route Handlers (future app mobile)
  components/
    layout/         ← Header, ThemeToggle, UserMenu
    posts/          ← PostCard, PostFeed, FeedTabs, VoteButtons, FavoriteButton...
    comments/       ← CommentList, CommentItem, CommentForm
    auth/           ← LoginForm, RegisterForm
    ui/             ← shadcn components
  lib/
    prisma.ts       ← singleton Prisma client
    auth/           ← session.ts (iron-session), password.ts (bcrypt)
    utils.ts        ← cn(), formatRelativeDate(), generateSlug(), calculateHotScore()
  types/index.ts    ← PostWithDetails, CommentWithAuthor, SortOption, ActionResult...
  validations/      ← Zod schemas (post, comment, auth)
prisma/
  schema.prisma
  seed.ts
```
