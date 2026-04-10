# Homepage `/` — Explain

## Layout General

```
┌──────────────────────────────────────────────────────┐
│                     HEADER                           │
│  Logo | Spots · Community · About | Lang/Theme/User  │
├────────────┬─────────────────────────────────────────┤
│  SIDEBAR   │  SEARCH BAR  [OK]                       │
│  (desktop) │─────────────────────────────────────────│
│            │  FILTRES (Sort | Rating | Price | Games) │
│ CATEGORIES │─────────────────────────────────────────│
│            │  FEATURED SPOT (si ≥ 8 venues)          │
│ ┌──┬──┬──┐ │  ┌──────────┬────┬────┬────┐            │
│ │Ba│Go│KT│ │  │  BIG     │ sm │ sm │ sm │            │
│ ├──┼──┼──┤ │  │  CARD    │card│card│card│            │
│ │Ma│Be│  │ │  └──────────┴────┴────┴────┘            │
│ └──┴──┴──┘ │─────────────────────────────────────────│
│            │  GRILLE DE VENUES (4 colonnes)           │
│ LADYBOY    │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│ ┌──┬──┬──┐ │  │card │ │card │ │card │ │card │      │
│ │LB│Go│Cl│ │  └─────┘ └─────┘ └─────┘ └─────┘      │
│ └──┴──┴──┘ │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│            │  │card │ │card │ │card │ │card │      │
│ GAY        │  └─────┘ └─────┘ └─────┘ └─────┘      │
│ ┌──┬──┐    │─────────────────────────────────────────│
│ │GB│Go│    │  CTA — "Join the Community"             │
│ └──┴──┘    │  FOOTER LINKS                           │
└────────────┴─────────────────────────────────────────┘
```

---

## Sidebar (Desktop uniquement)

La sidebar est fixe (`sticky`) sur la gauche, 200px de large. Elle affiche les **categories** en grille d'icones (3 colonnes).

Chaque categorie est un bouton avec :
- Emoji (ex: 🍺, 💃, 🎤)
- Label en dessous (ex: "Bar", "GoGo Club", "KTV")

Les categories sont groupees par section :
- **STRAIGHT** : Bar, GoGo Club, KTV, Massage, Short-Time Hotel, etc.
- **LADYBOY** : Ladyboy Bar, Ladyboy GoGo, Ladyboy Club, Ladyboy Massage
- **GAY** : Gay Bar, Gay GoGo, Gay Club, Gay Massage

Cliquer sur une categorie filtre les venues via le query param `?category=slug`.

Sur **mobile** : la sidebar est remplacee par un bouton `MobileCategoryPanel` qui ouvre un drawer slide-in depuis la gauche.

---

## Search Bar

En haut du contenu principal. Barre de recherche full-width avec un bouton **"OK"** rose a droite.

- Placeholder : "Search bars, clubs, massage, GoGo..."
- Filtre via le query param `?q=texte`
- Recherche dans le nom et la description des venues

Sur **mobile** : une barre sticky se colle sous le header.

---

## Filtres

Les filtres sont organises en **4 groupes horizontaux** sur desktop (collapsibles sur mobile via `MobileFiltersPanel`).

### 1. Sort By (Tri)

Chips toggle avec icones :
| Chip | Param `sort=` | Description |
|------|---------------|-------------|
| ⭐ Rating | `rating` / `ratingasc` | Par note moyenne (desc/asc) |
| 💬 Reviews | `reviews` / `reviewsasc` | Par nombre d'avis |
| 🔥 Hot | `mentions` / `mentionsasc` | Par mentions dans les posts |
| 🆕 Newest | `newest` / `oldest` | Par date de creation |
| 🔤 Name | `namedesc` / `name` | Alphabetique |
| 💰 Price | `pricedesc` / `price` | Par gamme de prix |

Cliquer bascule entre desc ↓ et asc ↑. Une fleche s'affiche.

### 2. Status & Rating

| Chip | Param | Description |
|------|-------|-------------|
| 2+ ★ | `minStars=2` | Note minimum 2/5 |
| 3+ ★ | `minStars=3` | Note minimum 3/5 |
| 4+ ★ | `minStars=4` | Note minimum 4/5 |
| 4.5+ ★ | `minStars=4.5` | Note minimum 4.5/5 |
| 🟢 Open Now | `openNow=true` | Ouvert maintenant (calcul basé sur les horaires) |

### 3. Price Range

| Chip | Param | Description |
|------|-------|-------------|
| $ Budget | `price=$` | Gamme budget |
| $$ Mid | `price=$$` | Gamme moyenne |
| $$$ Premium | `price=$$$` | Gamme premium |

### 4. Games & Amenities

Visible uniquement pour certaines categories (bars, KTV, gentleman's club — pas massage, clubs, hotels).

| Chip | Param | Description |
|------|-------|-------------|
| 🎱 Pool | `pool=true` | Table de billard |
| 🎯 Darts | `darts=true` | Flechettes |
| 🔴 Connect 4 | `connect4=true` | Puissance 4 |
| 🃏 Cards | `cards=true` | Jeux de cartes |
| 🎲 Dices | `dices=true` | Des |
| 🏓 Beer Pong | `beerpong=true` | Beer Pong |

### Clear Filters

Un bouton rouge **"Clear (N)"** apparait quand des filtres sont actifs. Reinitialise tous les filtres d'un coup.

### Advanced (Filtres de prix avances)

Sous les filtres principaux, un panneau collapsible `AdvancedPriceFilters` permet de definir un **budget max** par type de prix (biere, alcool, lady drink, barfine, short-time, long-time, massage, etc.). Non detaille ici.

---

## Cards — Presentation des Venues

### Logique Featured vs Grille

- **Si ≥ 8 venues** : la section "Featured Spot" s'affiche
  - **1 grande carte** (2fr de large) : image grande, nom en Orbitron, rating + status overlay, adresse
  - **3 cartes moyennes** (1fr chacune) a droite : image, nom + rating, status, adresse
  - Les venues restantes s'affichent dans la **grille reguliere** en dessous

- **Si < 8 venues** : pas de featured, toutes les venues vont directement dans la grille reguliere

### Grille Reguliere

Grid responsive :
- **Mobile** : 1 colonne
- **SM (640px+)** : 2 colonnes
- **LG (1024px+)** : 3 colonnes
- **XL (1280px+)** : 4 colonnes

**⚠️ Les cards prennent autant de place les unes que les autres.** Chaque card a exactement la meme taille :
- Image : ratio fixe `16:9`, meme hauteur partout
- Body : 3 lignes fixes (nom+rating, categorie+status+prix, adresse)
- Tout le texte est tronque sur 1 ligne (`text-overflow: ellipsis`)
- Pas de variation de hauteur possible — toutes les cards font exactement la meme dimension

### Contenu d'une Card

```
┌─────────────────────────┐
│                         │
│      IMAGE (16:9)       │
│                         │
├─────────────────────────┤
│ Venue Name        ⭐4.9 │  ← Ligne 1 : nom + note
│ 🍺 Bar  🟢 Open   $$$  │  ← Ligne 2 : categorie + status + prix
│ 📍 Walking Street, P...│  ← Ligne 3 : adresse
└─────────────────────────┘
```

- **Nom** : gras, tronque, devient rose au hover
- **Rating** : etoile orange + note (ex: 4.9), aligne a droite
- **Categorie** : emoji + nom (ex: "🍺 Bar")
- **Status** : badge colore :
  - 🟢 `OPEN` — vert
  - 🟡 `CLOSING SOON` — jaune, pulse
  - 🔴 `CLOSED` — rouge
- **Prix** : `$`, `$$`, ou `$$$` en orange, aligne a droite
- **Adresse** : icone MapPin + texte tronque

### Hover

Au hover sur une card :
- `translateY(-4px)` — la carte se souleve
- `box-shadow` neon rose — glow effect
- L'image fait un leger zoom (`scale(1.05)`)
- Le nom passe en rose

### Animation d'entree

Les cards apparaissent avec un stagger : chaque card a un `animation-delay` croissant (0ms, 50ms, 100ms...) pour un effet de cascade.

---

## CTA — Community

En bas de la page, une section glass-card avec :
- Titre "Join the Community" en gradient
- Sous-titre
- 2 boutons : "Explore Community" (rose) et "About Us" (cyan)

---

## Footer Links

Liens discrets en bas : Spots · Community · About · Help

---

## Mobile

- Sidebar → `MobileCategoryPanel` (drawer slide-in)
- Filtres → `MobileFiltersPanel` (collapsible toggle)
- Search → sticky sous le header
- Grille → 1 puis 2 colonnes
- Bottom nav bar fixe (Spots, Community, Post/Sign In, About)

---

## Query Params Resume

Tous les filtres sont des query params URL, ce qui permet :
- Partager un lien filtre
- Bookmark une recherche
- Navigation back/forward native

| Param | Exemple | Description |
|-------|---------|-------------|
| `category` | `gogo-bar` | Filtre par categorie |
| `sort` | `rating` | Tri |
| `minStars` | `4` | Note minimum |
| `price` | `$$` | Gamme de prix |
| `openNow` | `true` | Ouvert maintenant |
| `pool` | `true` | A du billard |
| `darts` | `true` | A des flechettes |
| `connect4` | `true` | A du Puissance 4 |
| `cards` | `true` | A des jeux de cartes |
| `dices` | `true` | A des des |
| `beerpong` | `true` | A du beer pong |
| `q` | `kink` | Recherche texte |
