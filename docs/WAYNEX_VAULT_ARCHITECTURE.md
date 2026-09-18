# Waynex Vault (WV) — Architecture Documentation

**Official Name:** Waynex Vault  
**Short Name:** WV  
**Tagline:** Your work. Your records. Your history.  

---

## 1. Product Definition & Core Loops

Waynex Vault is a private professional operating environment for managing work, relationships, research, performance metrics, retrospective reviews, and institutional career history.

### Core Operating Loop
```text
Work → Record → Measure → Review → Improve → Work
```

### Relationship Loop
```text
Find → Research → Contact → Converse → Follow up → Build relationship → Create opportunity → Work together
```

### Evidence Loop
```text
Work → Document → Review → Approve → Publish
```

### Core Principle
> **Do the work once. Document it once. Store it once. Reuse it where appropriate.**

---

## 2. Technical Architecture

* **Framework:** Next.js 15 (App Router, Server Components & Server Actions)
* **UI Library & Runtime:** React 19, Tailwind CSS
* **Language:** TypeScript (strict type checking)
* **Backend Database & Auth:** Supabase (PostgreSQL with Row Level Security, Supabase Auth)
* **Deployment & Hosting:** Vercel (Edge Middleware, Serverless Functions)
* **Code Repository:** GitHub (`Waynexshaw/wayne-portfolio`)
* **Path Mounting:** Waynex Vault operates exclusively under `/vault` within the same Next.js repository as the public portfolio and the `/admin` CMS. Public portfolio and `/admin` remain isolated experiences.

---

## 3. Security Boundary & RLS

* **Private Boundary:** All data under `/vault` is private and protected by session authentication and database-enforced Row Level Security (RLS).
* **Workspace Isolation:** Access is gated on active workspace membership verified through `workspace_members`.
* **Zero Public Leakage:** Private CRM contacts, companies, interactions, research notes, performance metrics, and reviews never appear automatically on the public portfolio.
* **Public Publishing Bridge:** Any portfolio artifact derived from internal Vault records requires an explicit, approved publishing bridge.
* **Server Verification:** Server actions and queries never trust client-supplied workspace parameters without DB-level membership and ownership validation.

---

## 4. Workspace Model

Waynex Vault operates on a multi-workspace architecture rooted in:
* **`workspaces`:** Defines the tenant entity (`id`, `name`, `slug`, `owner_id`, `created_at`, `updated_at`).
* **`workspace_members`:** Associates authenticated users with a workspace (`workspace_id`, `user_id`, `role`, `created_at`).
* **Roles:** `owner`, `admin`, `member`, `guest`.

### Primary Production Workspaces
1. **PEVRA:** Telecom infrastructure, business development, institutional investors, and strategic partnerships.
2. **DeFiwayneX:** Web3 ecosystem, decentralized finance protocols, tokenomics research, and developer relations.
3. **Joseph Henshaw:** Founder executive networking, career advisory, leadership governance, and personal professional history.

---

## 5. Identity Model

Waynex Vault models three primary operational identities mapped to communication channels and business contexts:
* **Joseph Henshaw:** Founder & executive networking; primary channel: **LinkedIn**.
* **DeFiwayneX:** Web3, DeFi research, growth engineering, and crypto ecosystem; primary channel: **X (Twitter)**.
* **PEVRA:** Enterprise partnerships, institutional telecom deals, and capital raising; primary channel: **PEVRA Corporate Channels / Email**.

The system provides identity context and recommended channels. The user retains absolute control over all communications; no automated messaging or unsolicited outreach occurs.

---

## 6. Core WV Domains & Responsibilities

| Domain | Canonical Responsibility |
| :--- | :--- |
| **Command Center** | Executive dashboard surfacing active attention items, overdue follow-ups, key metrics, and recent activities. |
| **Projects** | Work management container tracking initiatives, priority deliverables, and milestones across workspaces. |
| **Metrics** | Quantitative performance layer tracking measurable KPIs, targets, and chronological snapshot values. |
| **Research** | Institutional knowledge layer capturing structured research questions, sources, verbatim evidence, and findings. |
| **Reviews** | Operational retrospectives analyzing objectives, actual outcomes, what worked, what didn't work, why, and lessons. |
| **Contacts** | Person-level relationship records tracking role, relationship stage, relationship strength score, and follow-ups. |
| **Companies** | Organization-level context tracking corporate status, industry, domain, and associated workspace tier. |
| **Interactions** | Chronological contact-centric communication logs (meetings, calls, messages, notes) with direction and channel. |
| **Follow-ups** | Actionable relationship commitments tracking due dates, priority, status, and automated next-contact recalculation. |
| **Opportunities**| Commercial pipeline tracking partnership, investment, advisory, and growth initiatives with stages and probabilities. |

---

## 7. Relationship Architecture & Conceptual Flow

### Conceptual Flow
```text
Company → Contact → Interaction → Follow-up → Opportunity
```

### Canonical Rules & Schema Realities
1. **Global Owner Records:** `contacts` and `companies` are owner-level records.
2. **Workspace Relationship Tables:**
   * `workspace_contacts`: Encapsulates workspace-specific contact state (`relationship_stage`, `relationship_score`, `priority`, `notes`, `next_follow_up_at`).
   * `workspace_companies`: Encapsulates workspace-specific company state (`tier`, `status`, `notes`).
3. **Interactions are Contact-Centric:** Interactions belong strictly to a contact (`contact_id`) within a workspace. **Interactions do NOT have a `company_id` column.**
4. **Follow-ups:** Belong to a contact and may optionally reference a specific interaction (`interaction_id`).
5. **Opportunities:** Link to a workspace and optionally reference a contact (`contact_id`) and/or company (`company_id`).
6. **Relationship Score vs. Opportunity Probability:**
   * **Relationship Score (1–10):** Measures interpersonal rapport and trust (1–3: Cold, 4–6: Familiar, 7–8: Strong, 9–10: Close).
   * **Opportunity Probability (0–100%):** Measures commercial deal certainty in the pipeline.
   * *These concepts are completely distinct and are never merged or auto-calculated.*

---

## 8. Brand System V1

### Palette
* **Deep Purple (#3B1E65):** Primary brand anchor, header identity accents.
* **Muted/Dusty Purple (#6B4A91):** Secondary brand elements, active states.
* **Soft Violet (#A270DB):** Tertiary brand highlights, subtle focus rings.
* **Rich Black (#0B0B0D):** Dark mode background, high-contrast surfaces.
* **Warm White (#F7F5F2):** Light mode background, subtle card fills.
* **Crimson (#DC143C):** Urgent priority, destructive actions, errors.
* **Vivid Green (#2DB52D):** Completed lifecycle state only.
* **Amber:** Warning semantic, overdue alerts, high priority.

### Core Visual Rule
Warm white and rich black construct the calm environment. Purple identifies Waynex Vault. Green and crimson communicate state.

### Typography
* **Serif (Playfair Display / Georgia):** Page titles, review titles, major entity names.
* **Sans (Inter / system-ui):** Body prose, UI controls, navigation, forms, metadata.
* **Monospace (JetBrains Mono / monospace):** Compact structural labels, status badges, timestamps, codes.

---

## 9. Responsive Architecture

* **Desktop (≥ 1024px):** Persistent 256px sidebar, top workspace switcher, spacious content area.
* **Mobile (< 1024px):** Compact header with hamburger trigger, slide-over off-canvas navigation drawer, full-width scrollable views, flex-stacked modal dialogs with `max-h-[90vh]` viewport safety.

---

## 10. Status & Priority Semantics

### General Lifecycle
* **Planning / Draft:** Neutral structural tone.
* **Active / In Progress:** Subtle brand purple tone.
* **Paused / On Hold:** Warning amber tone.
* **Completed:** Vivid green tone (`VaultStatusBadge`).
* **Archived:** Muted neutral tone.

### Priority Levels
* **Low:** Neutral muted.
* **Medium:** Structured neutral.
* **High:** Warning amber.
* **Urgent:** Crimson accent.

*Completed strictly denotes completion of an activity or retrospective. It never implies an automatic value judgment on business success.*

---

## 11. Database Migration Discipline

* Current released migrations: **001 through 012**.
* Migrations are immutable once deployed to production.
* Sequential naming convention must strictly be preserved.
* **No migrations may be created without explicit authorization.**

---

## 12. Single-Owner Access Model

### System Access Definition
Waynex Vault V1 is currently a private single-owner system.

* **Designated Vault Owner Account:** `defiwaynex@gmail.com`
* **Access Policy:** Only the designated Vault owner account should be authorized to authenticate into and access the private Waynex Vault (`/vault`) environment.

### Important Distinction: Authentication vs. Operating Identities
The three WV operating identities:
* **DeFiwayneX**
* **Joseph Henshaw**
* **PEVRA**

are operational identities *inside* Waynex Vault. They are used for:
* Professional context
* Relationship context
* Outreach identity
* Workspace context
* Channel recommendations

They are **NOT** separate Vault authentication accounts.  
They do **NOT** independently grant access to `/vault`.  
**Authentication ownership and operating identity are separate concepts.**

### Future Implementation Note
Future implementation must inspect and enforce the owner-only rule across the actual authentication and security boundary.  
The technical implementation must **NOT** rely only on:
* Client-side email checks
* Hidden navigation elements
* Login-page filtering

Future security implementation work must inspect and enforce across:
* Supabase Auth
* Server-side Vault authorization
* Route protection & middleware
* Server actions
* Row Level Security (RLS) / owner enforcement
* Auth callbacks where applicable
*(Note: Not implemented in this batch; recorded here as authoritative architecture requirements).*
