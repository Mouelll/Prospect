# Prospecteur B2B

Outil de prospection B2B pour vidéaste freelance. Usage solo, sans authentification.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS**
- **Supabase** (PostgreSQL, clé anon, RLS désactivé)
- **@tanstack/react-table** — tableau prospects
- **papaparse** — import CSV Sirene
- **date-fns** — formatage des dates
- **lucide-react** — icônes

---

## Setup en 3 étapes

### 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Dans **SQL Editor**, exécutez le contenu de `supabase/schema.sql`
3. Récupérez dans **Settings → API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Variables d'environnement

Copiez `.env.local.example` en `.env.local` et renseignez vos clés :

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

Lancez en local :

```bash
npm install
npm run dev
```

### 3. Déploiement Vercel

1. Importez le repo dans [vercel.com](https://vercel.com)
2. Ajoutez les deux variables d'environnement dans **Settings → Environment Variables**
3. Déployez — l'URL générée est votre accès solo

---

## Fonctionnalités

| Page | Description |
|------|-------------|
| `/prospects` | Liste filtrée + export CSV |
| `/prospects/new` | Formulaire de création |
| `/prospects/[id]` | Fiche détaillée (infos, contacts, historique, notes) |
| `/pipeline` | Vue Kanban par statut |
| `/relances` | Suivi des relances à venir (7 jours) |
| `/import` | Import du CSV Sirene INSEE |
| `/templates` | Templates de messages avec variables |

## Import Sirene

Téléchargez le fichier `StockEtablissement_utf8.csv` sur
[data.gouv.fr](https://www.data.gouv.fr/fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/)
puis utilisez la page `/import` pour filtrer par codes NAF et départements.
