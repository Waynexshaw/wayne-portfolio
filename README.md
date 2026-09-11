# Wayne Portfolio

Personal professional portfolio for Henshaw Joseph (Wayne / @defiwaynex).

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui patterns
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Rich text**: Tiptap
- **Animations**: Framer Motion
- **Deployment**: Vercel

## Getting Started

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full setup and deployment instructions.

```bash
npm install
cp .env.local.example .env.local
# Add your Supabase credentials to .env.local
npm run dev
```

## Project Structure

```
app/
  (public)/     # Public-facing pages
  (auth)/       # Login
  admin/        # Protected CMS dashboard
  api/          # API routes (contact form)
components/
  public/       # Homepage and public page sections
  admin/        # CMS components (editors, tables)
lib/
  supabase/     # Supabase client helpers
  validations/  # Zod schemas
supabase/
  migrations/   # Database schema + RLS policies
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/about` | About page |
| `/work` | Work listing |
| `/work/[slug]` | Case study |
| `/writing` | Writing archive |
| `/writing/[slug]` | Article |
| `/experience` | Experience timeline |
| `/contact` | Contact form |
| `/resume` | Web resume |
| `/admin` | CMS dashboard (protected) |
| `/login` | Admin login |

## Content Policy

**No fabricated content is included in this codebase.**

All section placeholder text is clearly marked. Use the admin dashboard to add real content.
