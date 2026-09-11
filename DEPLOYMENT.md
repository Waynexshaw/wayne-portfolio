# DEPLOYMENT GUIDE

## Wayne Portfolio — Vercel + Supabase Deployment

---

## Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account (free tier works)
- Vercel account (free tier works)
- Git

---

## Step 1: Supabase Setup

1. Create a new project at https://supabase.com
2. Wait for the project to initialize (about 1 minute)

### Run the database migration

3. In Supabase dashboard, go to **SQL Editor**
4. Open `supabase/migrations/001_initial.sql`
5. Paste the entire contents into the SQL editor
6. Click **Run**

This creates all tables, RLS policies, indexes, and seeds default settings and services.

### Create admin account

7. Go to **Authentication > Users**
8. Click **Invite user** and use your admin email
9. Or click **Add user** and set email + password directly

### Create media storage bucket

10. Go to **Storage**
11. Click **New bucket**
12. Name it: `media`
13. Set it as **Public**
14. Click **Create**

### Get API credentials

15. Go to **Settings > API**
16. Copy:
    - **Project URL** ? `NEXT_PUBLIC_SUPABASE_URL`
    - **anon/public key** ? `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - **service_role key** ? `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 2: Local Development

```bash
# Clone/navigate to the project
cd wayne-portfolio

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Then fill in your Supabase credentials

# Run development server
npm run dev
```

Open http://localhost:3000

**Admin dashboard:** http://localhost:3000/admin  
Sign in at http://localhost:3000/login with your Supabase admin credentials.

---

## Step 3: Deploy to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (your production domain, e.g., `https://defiwaynex.com`)

### Option B: Vercel Dashboard

1. Push your code to GitHub
2. Go to https://vercel.com/new
3. Import your GitHub repository
4. Add environment variables in the Vercel dashboard
5. Deploy

---

## Step 4: Custom Domain

1. In Vercel, go to your project > Settings > Domains
2. Add your domain (e.g., `defiwaynex.com`)
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_SITE_URL` in Vercel env vars to your domain

---

## Step 5: First Content Setup

Once deployed, go to `/admin`:

1. **Settings** — Add your bio, profile image URL, social links
2. **Projects** ? New project — Add PEVRA and other work
3. **Writing** ? New article — Publish your first piece
4. **Experience** ? Add entry — Document your professional history
5. **Metrics** — Add verified metrics attached to specific projects

---

## Post-deployment checklist

- [ ] Admin login works at `/login`
- [ ] `/admin` dashboard loads
- [ ] Can create a project and see it at `/work/[slug]`
- [ ] Can create an article and see it at `/writing/[slug]`
- [ ] Contact form submits and appears in `/admin/messages`
- [ ] Profile image shows in Settings
- [ ] Site metadata looks correct when shared (test with https://opengraph.xyz)
- [ ] `sitemap.xml` accessible at `/sitemap.xml`
- [ ] `robots.txt` accessible at `/robots.txt`

---

## Ongoing Content Management

| Task | Location |
|------|---------|
| Add/edit projects | `/admin/projects` |
| Write articles | `/admin/writing` |
| Update experience | `/admin/experience` |
| Read messages | `/admin/messages` |
| Change bio/social links | `/admin/settings` |
| Upload images | `/admin/media` |
| Add metrics | Supabase ? Table editor ? metrics |
| Add testimonials | Supabase ? Table editor ? testimonials |

---

## Support

If you run into issues, check the Vercel deployment logs and Supabase logs for errors.

For questions about the codebase, refer to the component comments and structure in `README.md`.
