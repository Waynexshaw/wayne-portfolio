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

* Current released migrations: **001 through 013** (`013_wv_project_workbench.sql`).
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

---

## 13. Project Workbench V1 Architecture

### Purpose & Operating Concept
Project Workbench V1 transforms Waynex Vault projects from high-level metadata tracking containers into active, private working environments. Each project houses a private Workbench for organizing deliverables, drafting strategy documents, modeling operational figures, and storing source project files. Folders serve as organizational navigation containers, while native work is captured in three canonical artifact types: Documents, Spreadsheets, and Files.

### Canonical Schema & Storage Architecture (Migration 013)
* **`public.project_folders`**: Multi-level hierarchical organizational navigation containers scoped strictly to `(workspace_id, project_id)`.
  * Unique names enforced via partial unique indexes for root-level and subfolder-level items (`archived_at IS NULL`).
  * Recursive cycle prevention enforced via PostgreSQL trigger (`trg_check_project_folder_hierarchy`).
  * Self-parenting and cross-project hierarchy moves are strictly prohibited at database level.
* **`public.project_documents`**: Native rich-text documents.
  * TipTap JSON AST stored in `content`.
  * Plain text extraction indexed in `plain_text` for search.
  * Word count and optimistic versioning.
* **`public.project_spreadsheets`**: Native 2D grid tabular modeling.
  * Sparse cell matrix indexed by coordinate (`A1`, `B2`, etc.) in `data` JSONB.
  * Explicit column metadata tracking custom widths.
  * Schema versioning for forward compatibility.
* **`public.project_files`**: Metadata records for binary project assets.
  * Tracks display name, original file name, mime type, file size (`size_bytes`), storage path, and extension.
  * SVG files blocked on upload to eliminate stored XSS and active SVG content execution vectors.
* **Archive State — Single Source of Truth**:
  * All Workbench tables use `archived_at TIMESTAMPTZ` exclusively (`archived_at IS NULL` = active, `archived_at IS NOT NULL` = archived).
  * Redundant boolean flags are avoided; archive state cannot contradict itself.
* **Private Storage Bucket (`vault_files`)**:
  * 25MB file size limit (`26214400` bytes).
  * Storage path convention: `workspaces/<workspace_id>/projects/<project_id>/<file_id>/<filename>`.
  * Row Level Security: `SELECT`, `INSERT`, `UPDATE` require verified workspace membership via `wv_internal.is_workspace_member()`.
  * Physical `DELETE` requires workspace admin authorization via `wv_internal.is_workspace_admin()`.
  * Soft-archiving files updates metadata without deleting Storage objects; binary assets remain safely preserved.
  * Direct client uploads bypass serverless payload limits.
  * Downloads and in-browser previews authenticated via short-lived signed URLs (300-second expiration).

### Formula Policy: Deliberately Deferred to V1.1+
* **V1 Principle:** Grid stability, safe numeric data handling, TSV/CSV interoperability, and fast persistence take priority over computational complexity.
* **Storage Semantics:** Any cell string starting with `=` (such as `=SUM(A1:A10)`) is treated strictly as literal text. Zero formula parsing or evaluation engines are loaded in V1.
* **Interoperability:** Full RFC 4180 CSV import and export with quote escaping support.

### UI, Typography & UX Integration
* **Workbench Entry:** Project detail views (`/vault/projects/[id]`) display direct access to the Workbench via a dedicated header button and an aggregate Artifacts Overview card alongside Metrics, Research, and Reviews.
* **Directory Navigation:** Folders remain structural navigation containers in the directory view, while artifact filtering isolates work by canonical type: `All`, `Documents`, `Spreadsheets`, `Files`.
* **Typography:** Conforms strictly to established WV Tailwind typography (`font-serif`, `font-sans`, `font-mono`) without introducing external font packages or Workbench-specific font definitions.
* **Dedicated Full-Surface Editors:** Document and spreadsheet editors operate on focused full-surface views (`/vault/projects/[id]/documents/[docId]` and `/vault/projects/[id]/spreadsheets/[sheetId]`) with breadcrumbs back to the project workbench.
* **Autosave & Draft Safety:** Debounced autosave (1.5s) paired with client-side `sessionStorage` fallback recovery.

---

## 14. Operating Records V1 Architecture

### Purpose & Operating Concept
Operating Records V1 provides an integrated execution layer for Waynex Vault, bridging strategy and operational delivery through four canonical entities:
1. **Meetings:** Time-stamped structured records of internal syncs, external discussions, and client/partner alignments.
2. **Meeting Participants:** Exactly one identity source per participant—either an existing global CRM contact (`contact_id`) or an external guest (`guest_name` with optional `guest_email`), enforced by a strict database CHECK constraint.
3. **Decisions:** An immutable historical ledger recording key architectural, organizational, or strategic decisions with context, rationale, alternatives considered, and consequences. In V1, decisions are historical records without mutable status or revision lineage (lineage deferred to V1.1+).
4. **Tasks:** Operational action items linked optionally to projects, meetings, or decisions. Tasks maintain a single-owner operational model (no assignee fields in V1), canonical priorities (`low`, `medium`, `high`, `urgent`), canonical statuses (`todo`, `in_progress`, `blocked`, `completed`, `cancelled`), and database-enforced completion timestamp synchronization.

### Schema Architecture & Integrity (Migration 014)
* **`public.meetings`**:
  * Scoped strictly to `(workspace_id)`.
  * Composite foreign keys `(project_id, workspace_id)` referencing `public.workspace_projects(id, workspace_id)` ON DELETE SET NULL.
  * Composite foreign key `(workspace_id, company_id)` referencing `public.workspace_companies(workspace_id, company_id) ON DELETE SET NULL (company_id)`, strictly enforcing workspace multi-tenant isolation for meeting company associations.
  * Time semantics & bounds: `scheduled_at` (scheduled start time) and `ended_at` (scheduled end time) define planned scheduling bounds, not clock tracking or telemetry. Time validation constraint `chk_meeting_ended_at` ensures `ended_at IS NULL OR ended_at >= scheduled_at`.
  * Immutability trigger `trg_prevent_meetings_tampering` prevents modifying `workspace_id`.
* **`public.meeting_participants`**:
  * Hard database check constraint `chk_participant_identity`: `((contact_id IS NOT NULL AND guest_name IS NULL AND guest_email IS NULL) OR (contact_id IS NULL AND guest_name IS NOT NULL AND btrim(guest_name) <> ''))`. Supports internal CRM contacts or external guests (with optional email), while rejecting invalid/conflicting identity combinations.
  * Composite foreign key `(meeting_id, workspace_id)` referencing `public.meetings(id, workspace_id)` ON DELETE CASCADE.
  * Partial unique index prevents adding the same CRM contact more than once to a single meeting.
  * Immutability trigger `trg_prevent_meeting_participants_tampering` locks `workspace_id` and `meeting_id`.
* **`public.decisions`**:
  * Historical record with `decided_at DATE NOT NULL DEFAULT CURRENT_DATE`.
  * Composite foreign keys `(project_id, workspace_id)` referencing `workspace_projects` and `(meeting_id, workspace_id)` referencing `meetings`.
  * Immutability trigger `trg_prevent_decisions_tampering` locks `workspace_id`.
* **`public.tasks`**:
  * Composite foreign keys `(project_id, workspace_id)`, `(meeting_id, workspace_id)`, `(decision_id, workspace_id)`.
  * Trigger `trg_task_completion_timestamp` automatically sets `completed_at = NOW()` when status transitions to `completed`, and clears `completed_at = NULL` when status transitions away from `completed`.
  * Immutability trigger `trg_prevent_tasks_tampering` locks `workspace_id`.
* **Archive Single Source of Truth & Lifecycle Policy**:
  * All four tables strictly use `archived_at TIMESTAMPTZ` (`archived_at IS NULL` = active, `archived_at IS NOT NULL` = archived). Zero `is_archived` boolean columns exist.
  * Application Lifecycle: The V1 UI operates exclusively on an Archive/Restore lifecycle. User-facing permanent delete controls and corresponding server actions (`deleteTaskAction`, `deleteMeetingAction`, `deleteDecisionAction`) have been omitted from V1 application code to prevent accidental permanent data loss. Participant unlinking is retained via `removeMeetingParticipantAction`.
* **Row Level Security (RLS)**:
  * `SELECT`, `INSERT`, `UPDATE`: `wv_internal.is_workspace_member(workspace_id)`.
  * `DELETE`: `wv_internal.is_workspace_admin(workspace_id)` retained at database level for defense-in-depth boundary control.

### Unified Operations Hub & Cross-Module Integrations
* **Hub Route (`/vault/operations`)**:
  * Houses three view modes: `?view=tasks` (default), `?view=meetings`, and `?view=decisions`.
  * Single search/filter toolbar with project scoping, status/priority filtering, and archive toggle.
  * Real-time operational attention pills: Active Tasks, Overdue count, Due Today count, Next 7-Day Meetings, and Decisions.
* **Deep-Link Detail Routes**:
  * Dedicated meeting record page: `/vault/operations/meetings/[id]` featuring agenda, notes, outcomes, participants list, and direct buttons to add tasks or record decisions from the meeting.
  * Dedicated decision record page: `/vault/operations/decisions/[id]` highlighting decision statement, context, reasoning, alternatives, consequences, and linked follow-up execution tasks.
* **Sidebar Navigation**:
  * Exactly ONE primary sidebar entry: `Operations` (`/vault/operations`, icon `ClipboardList`).
* **Project Detail Integration (`/vault/projects/[id]`)**:
  * Header quick action button: `Operations` alongside `Workbench`.
  * Compact Operations Summary Card displaying Active Tasks, Upcoming Meetings, and Decisions Recorded with deep links to `/vault/operations?projectId=[id]`.
* **Command Center Integration (`/vault`)**:
  * Overdue tasks and tasks due today are surfaced in the primary attention queue with crimson (`#DC143C`) and amber warnings.
  * Upcoming meetings within the next 7 days are surfaced in the attention grid with direct deep links to `/vault/operations/meetings/[id]`.

---

## 15. Evidence & Portfolio Bridge V1 Architecture

### Purpose & Operating Concept
Evidence & Portfolio Bridge V1 introduces a structured provenance and portfolio bridge layer for Waynex Vault:
1. **Workspace Evidence (`workspace_evidence`):** Curated, publication-ready professional achievement claims, measurable results, deliverable summaries, and strategic decision highlights. Evidence items support a dual-state approval workflow (`draft` | `approved`) requiring deliberate review before public presentation.
2. **Provenance Sources (`workspace_evidence_sources`):** A normalized junction layer linking an evidence claim to its supporting workspace sources within Waynex Vault:
   - Sprint / Quarterly / Strategy Reviews (`reviews`)
   - Performance Metric Observations (`workspace_metric_observations`)
   - Historical Architecture Decisions (`decisions`)
   - Workbench Documents (`project_documents`)
   - Workbench Private Files (`project_files`)
   Every source connection enforces strict workspace isolation and an exact-one-target database CHECK constraint.
3. **Portfolio Evidence Bridges (`portfolio_evidence_bridges`):** A decoupled snapshot publication bridge connecting approved Vault evidence claims to public portfolio entities (`projects` or `case_studies`).

### Schema Architecture & Integrity (Migration 015)
* **`public.workspace_evidence`**:
  * Scoped strictly to `(workspace_id)` with composite unique constraint `uq_workspace_evidence_id_workspace UNIQUE (id, workspace_id)`.
  * Composite foreign key `(project_id, workspace_id)` referencing `public.workspace_projects(id, workspace_id) ON DELETE SET NULL`.
  * Dual-state approval workflow: `approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'approved'))`.
  * Timestamp consistency constraint `chk_evidence_approval_timestamp`: enforces that if `approval_status = 'approved'`, `approved_at` must NOT be NULL.
  * Immutability trigger `trg_prevent_evidence_tampering` prevents modifying `workspace_id`.
  * Single source of truth archive state: `archived_at IS NULL` = active, `archived_at IS NOT NULL` = archived. Zero `is_archived` columns.
* **`public.workspace_evidence_sources`**:
  * Normalized polymorphic junction table with composite foreign keys to parent evidence and target source entities.
  * Exactly-one-target constraint `chk_evidence_source_target_exactly_one`: validates that exactly one of `review_id`, `metric_observation_id`, `decision_id`, `document_id`, or `file_id` is non-null.
  * Unique indexes `(evidence_id, target_id)` prevent redundant attachments of the same source to a claim.
  * Immutability trigger `trg_prevent_evidence_source_tampering` locks `workspace_id` and `evidence_id`.
* **`public.portfolio_evidence_bridges`**:
  * Point-in-time snapshot architecture: captures `snapshot_title`, `snapshot_claim`, `snapshot_summary`, `snapshot_result`, and `snapshotted_at`.
  * Exactly-one-target constraint `chk_bridge_target_exactly_one`: validates that exactly one of `public_project_id` or `public_case_study_id` is non-null.
  * Partial unique indexes `uq_bridge_active_project` and `uq_bridge_active_case_study` prevent duplicate active bridges for the same evidence claim and public target.
  * Soft-detachment lifecycle: setting `detached_at = NOW()` detaches the bridge while permanently preserving audit history and provenance.
  * Immutability trigger `trg_prevent_portfolio_bridge_tampering` locks `workspace_id` and `evidence_id`.
* **Row Level Security (RLS)**:
  * Zero anonymous/public SELECT access on all three tables (`workspace_evidence`, `workspace_evidence_sources`, `portfolio_evidence_bridges`). All tables are strictly private to authenticated workspace members.
  * `SELECT`, `INSERT`, `UPDATE`: `wv_internal.is_workspace_member(workspace_id)`.
  * `DELETE`: `wv_internal.is_workspace_admin(workspace_id)` for evidence and bridges; members for junction sources.

### Decoupled Snapshot Bridge Architecture
* **100% Non-Mutating CMS Contract:** Bridging evidence to public projects or case studies NEVER alters or overwrites narrative columns in `projects` or `case_studies`. The public CMS retains full authorial independence.
* **Draft & Archive Gate:** Only approved, non-archived evidence can be bridged to the portfolio. If an evidence claim is returned to draft or archived, the bridge reflects an `unapproved` or `archived` sync status.
* **Drift Detection & Explicit Refresh:** When an approved evidence claim is modified in Vault, the bridge detects that the live claim differs from the snapshot and flags the bridge as `Live Claim Changed`. The user can review the change and trigger an explicit `Refresh Snapshot` action.
* **Private Vault File Isolation:** Private file storage paths and short-lived signed URLs from `vault_files` are never persisted into public bridge snapshots.

### UI & Workspace Integrations
* **Evidence Directory (`/vault/evidence`)**:
  * Filterable view with tabs (`Active Claims`, `Approved`, `Draft`, `Archived`), project dropdown, evidence type filter, and search.
  * Key performance metrics strip: Total Claims, Approved, In Draft, Bridged, and Archived.
  * Claim cards displaying publication claim formulation, impact metrics, supporting source counts, and portfolio bridge counts.
* **Evidence Detail Page (`/vault/evidence/[id]`)**:
  * Ordered hierarchy: Professional Claim Formulation, Supporting Sources & Provenance, Portfolio Usage & Snapshot Bridges, Internal Vault Notes (private), and Metadata & Audit Trail.
  * Actions for approval toggle, editing claim, attaching/removing sources, creating/refreshing/detaching portfolio bridges.
* **Sidebar Navigation**:
  * Exactly ONE primary sidebar entry: `Evidence` (`/vault/evidence`, icon `Award`).
* **Project Detail Integration (`/vault/projects/[id]`)**:
  * Compact Evidence & Professional Claims Summary Card displaying Approved Claims, Draft Claims, and Total Claims with quick action buttons to Add Claim and View Claims (`/vault/evidence?projectId=[id]`).
