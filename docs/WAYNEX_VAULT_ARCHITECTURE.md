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
  * Stored in `data JSONB`.
  * **Document Version 2 Format:**
    * `version: 2`: Document version specifier.
    * `sheets`: Array of sheets (primary `sheet-1` in V1.1).
    * `rowCount`: Current row count (minimum 1, default 50, maximum 200).
    * `columnCount`: Current column count (minimum 1, default 20, maximum 26 / A..Z).
    * `columnWidths`: Mapping of column letters to widths in pixels (`Record<string, number>`, default 100px).
    * `rowHeights`: Mapping of row numbers to heights in pixels (`Record<string, number>`, default 28px).
    * `merges`: Array of merged cell ranges (`CellMergeRange[]`), each defining `id`, `startCol`, `startRow`, `endCol`, `endRow`.
    * `cells`: Sparse coordinate matrix (`Record<string, SpreadsheetCell>`) holding `raw`, `type` (`number` | `text`), and optional `align` (`left` | `center` | `right`).
  * **Backward Compatibility Guarantee (`normalizeSpreadsheetData`):**
    * Existing `version: 1` spreadsheets automatically normalize at runtime to `version: 2`.
    * Missing `rowHeights` defaults to `{}`.
    * Missing `merges` defaults to `[]`.
    * Row count clamped to `1..200`; column count clamped to `1..26`.
    * Zero data loss or corruption for legacy documents.
  * **Critical Merge Data-Safety Rule:**
    * If ANY non-anchor cell in a proposed merge range contains non-empty data, the merge operation is strictly aborted.
    * Rejection error message: `"Some selected cells contain data. Clear them before merging."`
    * The anchor cell (top-left) renders with `colSpan` and `rowSpan`. Covered non-anchor cells are omitted from the DOM table to avoid layout shifting.
  * **Row and Column Structural Operations:**
    * Rows and columns can be inserted, deleted, and moved.
    * Moving a row or column that would bisect a multi-row or multi-column merge is strictly prevented with a user warning.
    * Row and column insertions are blocked when maximum dimensions (200 rows, 26 columns) are reached.
  * **Standard TSV Clipboard Interoperability:**
    * Copy/Cut formats tabular selections as Tab-Separated Values (`\t` and `\r\n`).
    * Covered merged non-anchor cells export empty strings.
    * Paste parses `\t` and newline boundaries strictly; commas (e.g., in names like `"Wayne, Shaw"` or figures like `"100,000"`) are preserved within a single cell and never split.
    * Single-cell paste into a multi-cell selection fills the range.
    * Over-limit paste is clipped safely at 200 rows × 26 columns with an in-app notification banner.
  * **CSV Interoperability & Merge Confirmation Safety:**
    * Full RFC 4180 CSV import and export with quote escaping support.
    * Export: covered non-anchor cells export empty strings.
    * Import: if current sheet contains merged ranges, CSV import requires explicit user confirmation before proceeding ("This sheet contains merged cells. CSV import cannot preserve merged cell structure. Continuing will remove the existing merges. Import anyway?").
    * If cancelled: import is aborted; zero cells, dimensions, or merges are modified.
    * If confirmed: CSV is imported, merges are removed to prevent data misalignment, and dimensions are clamped within 200 rows × 26 columns.
  * **Client-Side Undo / Redo:**
    * In-memory 50-step transaction history stack.
    * Fully accessible via toolbar controls and standard keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z`).

### Formula Policy: Deliberately Deferred to V1.2+
* **V1.1 Principle:** Interaction feel, range selections, merge safety, row/col resizing, and TSV clipboard take priority over computational complexity.
* **Storage Semantics:** Any cell string starting with `=` (such as `=SUM(A1:A10)`) is treated strictly as literal text.
* **Future Formula Engine Requirements (V1.2+):**
  * Adding rows/columns requires rewriting relative cell coordinates inside formulas (e.g. inserting row 3 shifts `=A4` to `=A5`).
  * Deleting referenced rows/columns requires formula `#REF!` invalidation.
  * Circular dependency detection graph.
  * Tokenizer and calculation DAG.

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

---

## 13. Live UX, Performance & Interaction Architecture

Following live product testing and UX diagnostics, Waynex Vault implements five architectural performance and interaction patterns:

### 1. Request-Level Context Deduplication (`React.cache()`)
* **Location:** `lib/vault/context.ts`
* **Mechanism:** Next.js Server Components share React's request cache during a single page render. `getVaultContextCached()` wraps the context resolution in React's `cache()` function.
* **Benefits:**
  * Eliminates duplicate `auth.getUser()` network calls between root Vault layout (`app/vault/layout.tsx`) and nested page server components.
  * Parallelizes independent queries (`workspaces`, `identities`, `user_profiles`, and cookie retrieval) with `Promise.all`.
  * Downstream page calls share the exact same context promise, dramatically reducing database round-trips and TTFB.

### 2. High-Cardinality Link Prefetch Policy (`prefetch={false}`)
* **Policy:** All high-cardinality, dynamic item links across Waynex Vault directories MUST explicitly declare `prefetch={false}`:
  * Projects directory cards (`app/vault/projects/page.tsx`)
  * Workbench folder links, document links, spreadsheet links (`components/vault/workbench/workbench-directory-view.tsx`)
  * Project overview sub-links (`components/vault/project/project-detail-view.tsx`)
  * Relationship directories: Contact cards (`app/vault/contacts/page.tsx`) and Company cards (`app/vault/companies/page.tsx`)
  * Retrospectives & Knowledge: Review cards (`components/vault/review/review-list.tsx`) and Research cards (`components/vault/research/research-list.tsx`)
  * Performance: Metric cards (`components/vault/metric/metric-list.tsx`)
  * Operations: Meeting links and Decision links (`components/vault/operations/meeting-list.tsx`, `components/vault/operations/decision-list.tsx`)
  * Evidence & Portfolio Bridge: Claim links (`components/vault/evidence/evidence-list.tsx`)
* **Preserved Prefetching:** Static primary sidebar navigation (`components/vault/sidebar.tsx`) preserves standard automatic prefetching for instantaneous primary navigation.

### 3. Pointer-Based Rectangular Selection & Hit-Testing (`SpreadsheetGrid`)
* **Location:** `components/vault/workbench/spreadsheet-grid.tsx`
* **Mechanism:**
  * Uses pointer event lifecycle (`onPointerDown` on cells/headers, global `window.onPointerMove`, `window.onPointerUp` via `dragStateRef`).
  * Fast element hit-testing via `document.elementFromPoint(clientX, clientY)` with cell data attributes (`data-col`, `data-row`, `data-end-col`, `data-end-row`, `data-cell-coord`).
  * Bidirectional range normalization (`normalizeRange`) supporting fluid drag in all four quadrants (NW, NE, SW, SE).
  * Shift+click range extension from anchor cell to target cell.
  * Header range selection: row/column headers support pointer drag and Shift+click to select complete row/column ranges, with header highlight reflecting normalized bounds across all covered spans.
  * Merged cell traversal without dead zones (`expandRangeForMerges`): selection rectangles intersecting any portion of a merged cell expand seamlessly to encompass the merge's bounding box without dropping pointer events.
  * Strict merge data-safety rule: merge operations inspect all non-anchor cells; if ANY non-anchor cell has data, the merge is rejected.

### 4. Structured Route Loading UX (`loading.tsx`)
* **Route Boundaries:** Implemented calm, non-jarring loading skeletons across dynamic Vault route boundaries:
  * `app/vault/loading.tsx` (Root Vault overview)
  * `app/vault/projects/loading.tsx` (Projects directory)
  * `app/vault/projects/[id]/loading.tsx` (Project overview & summary cards)
  * `app/vault/projects/[id]/workbench/loading.tsx` (Workbench directory & artifacts)
  * `app/vault/operations/loading.tsx` (Operations hub)

### 5. Explicit Created-Item Entry Affordance Principle
* **Standard:** While whole-card clickable surfaces remain convenient, high-cardinality directory cards MUST provide compact, explicit, high-contrast entry CTAs ("Open Project", "Open Folder", "Open Document", "Open Spreadsheet", "Preview", "View Review", "View Record", "View Metric", "View Contact", "View Company", "View Meeting", "View Decision", "View Claim").
* **User Benefit:** Provides immediate visual clarity and obvious intent affordances on desktop browsers and assistive devices without relying solely on subtle card hover effects.

---

## 16. Automation System V1 Architecture (Batch 1: Engine & Approval Core)

### Purpose & Conceptual Operating Model
The Automation System transforms Waynex Vault from a purely manual record-keeping system into an **Assisted Operating System**. It reduces repetitive operational overhead while preserving sovereign human judgment. Consequential actions (creating tasks, staging relationship follow-ups, proposing portfolio bridges, drafting reviews) are never executed autonomously without explicit human authorization.

```text
DOMAIN EVENT
  → EVENT LOG (Durable occurrence capture)
    → MATCH ACTIVE RULES (Workspace-isolated filter)
      → EVALUATE CONDITIONS (Deterministic non-eval JSON engine)
        → CREATE RUN (Idempotent execution ledger)
          → IF SAFE: AUTONOMOUS ACTION (Internal notifications only)
          → IF CONSEQUENTIAL: STAGE APPROVAL (Human authorization required)
            → HUMAN REVIEW (Approve / Reject / Edit+Approve)
              → DETERMINISTIC ACTION EXECUTION + AUDIT UPDATE
```

### Canonical Schema Architecture (Migration 016)
1. **`public.automation_rules`**: Parameterized automation rules scoped strictly to `(workspace_id)`.
   - `trigger_type`: Namespaced trigger identifier (`meeting.completed`, `decision.created`, etc.).
   - `conditions`: Normalized JSON schema holding `conjunction` (`AND` | `OR`) and `predicates` (`equals`, `not_equals`, `in`, `not_in`, `greater_than`, `less_than`, `is_null`, `is_not_null`).
   - `action_type`: Namespaced action identifier (`suggest_task_creation`, `create_internal_notification`, etc.).
   - `requires_approval`: Descriptive boolean flag (independently validated against the server-side hard safety registry).
   - `version`: Monotonically incremented integer tracking rule updates.
   - Lifecycle: `is_active` boolean toggle paired with `archived_at TIMESTAMPTZ`. Permanent deletes are omitted from the UI.
2. **`public.automation_event_log`**: Durable audit ledger capturing raw business domain occurrences with actor ID, entity reference, and full JSON payload snapshot.
3. **`public.automation_runs`**: Execution and audit record tracking rule execution, status lifecycle (`pending`, `awaiting_approval`, `approved`, `rejected`, `running`, `succeeded`, `failed`, `skipped`, `cancelled`), rule snapshot at execution time, execution details, and error diagnostics.
   - Enforces unique idempotency: `UNIQUE (workspace_id, idempotency_key)`.
4. **`public.automation_approvals`**: Human authorization queue storing proposed payloads, optional modified payloads, status (`pending`, `approved`, `rejected`, `expired`), source context provenance, and reviewer attribution.
5. **`public.workspace_notifications`**: In-app internal notification ledger categorized by `approval_required`, `automation_alert`, `reminder`, `system`.

### Structural Workspace Isolation & Composite Foreign Keys
Following established WV multi-tenant principles, all automation tables enforce workspace boundaries at the database level:
- Composite Unique constraints on `(id, workspace_id)` across all five tables.
- Composite Foreign Keys:
  - `automation_runs(rule_id, workspace_id) REFERENCES automation_rules(id, workspace_id)`
  - `automation_runs(trigger_event_id, workspace_id) REFERENCES automation_event_log(id, workspace_id)`
  - `automation_approvals(run_id, workspace_id) REFERENCES automation_runs(id, workspace_id)`
  - `workspace_notifications(source_run_id, workspace_id) REFERENCES automation_runs(id, workspace_id)`
- Immutability Triggers: `trg_prevent_auto_*_tampering` prevent modifying `workspace_id` (and `run_id` on approvals).
- Cross-workspace references are structurally impossible at the database level.

### Hard Approval Safety Registry
The server-side action registry (`lib/vault/automation/actions.ts`) is authoritative for approval requirements:
- `APPROVAL_REQUIRED_ACTION_TYPES`: `suggest_task_creation`, `suggest_follow_up_creation`, `suggest_portfolio_snapshot`, `suggest_review_creation`.
- `SAFE_AUTONOMOUS_ACTION_TYPES`: `create_internal_notification`.
- Invariant: A database rule cannot override hardcoded safety boundaries. Even if a malformed rule specifies `requires_approval: false` for `suggest_portfolio_snapshot`, the executor strictly refuses autonomous execution and diverts to the approval queue.

### Portfolio Bridge Safety Contract
- Invariant: **Evidence approval != publication.**
- Invariant: **Portfolio snapshot != public CMS publication.**
- The automation system cannot mutate public projects, public case studies, or public portfolio narratives. Snapshot generation creates private bridge proposals only, executed exclusively through the existing private `portfolio_evidence_bridges` architecture upon explicit approval.

### Narrow Lifecycle Event Hooks & Reliable Dispatch (Batch 1)
Event emission is integrated into four exact domain transitions:
1. `meeting.completed`: Emitted strictly when meeting status transitions from a non-completed state into `completed`. Editing an already-completed meeting does not re-emit.
2. `decision.created`: Emitted once upon successful creation of an immutable decision ledger record.
3. `evidence.approved`: Emitted strictly when evidence status transitions from `draft` to `approved`. Editing an already-approved evidence does not re-emit.
4. `project.completed`: Emitted strictly when project lifecycle action is `complete`. Other lifecycle actions (`start`, `pause`, `resume`, `reopen`, `archive`, `restore`) do not emit.

- **Reliable Dispatch Model:** Server actions invoke `await emitAutomationEvent(...)` inside an isolated `try/catch` block **after** the primary database operation has completed. This ensures serverless environments (Vercel lambdas) do not terminate early before the event is recorded, while guaranteeing that any automation failure cannot roll back or fail the parent domain transaction.
- **Event Failure Audit Guarantees by Stage:**
  - *Stage 1 (Event Logging Failure):* If inserting into `automation_event_log` fails, logged to **console only** (no database rows created).
  - *Stage 2 (Rule Loading Failure):* If loading rules fails, logged to **console and event log row** (`processed_at` remains null).
  - *Stage 3 (Run Creation Failure):* If creating a run fails, logged to **console and event log row**.
  - *Stage 4 (Action Execution Failure):* Logged to **console, event log row, and run audit row** (`status: 'failed'`, `error_details` populated).
- **Concurrency & Approval Idempotency:**
  - Double-click and race protection is guaranteed via atomic conditional status transitions (`UPDATE automation_approvals SET status = 'approved' ... WHERE id = ... AND status = 'pending' RETURNING *`).
  - Database unique constraint `CONSTRAINT uq_automation_approvals_run UNIQUE (workspace_id, run_id)` enforces at-most-one approval per automation run.

### Batch 1 Release Status
Automation V1 Batch 1 (Database + Engine + Approval Core) was released in commit `d13efcd` with Migration 016 (`016_wv_automation_system.sql`).

---

## 17. Automation System V1 Architecture (Batch 2: UI + Approvals + Templates + History + Notifications + Scheduled Processing)

### Purpose & User Experience
Automation V1 Batch 2 operationalizes the Automation Engine, providing the sovereign human operator with a unified control surface to review suggestions, manage active rules, browse pre-built templates, inspect execution history, receive in-app alerts, and automate periodic background evaluations.

### 1. Unified Automation Hub (`/vault/automations`)
The Automation Hub provides four primary tabs synchronized with the URL query parameter (`?view=inbox|rules|history|templates`):
- **Inbox (`?view=inbox`):**
  - Live approval queue for pending automation actions awaiting human review.
  - Cards present human-readable trigger provenance, proposed entity changes, target metadata, and expiration countdowns.
  - Quick Approve: Atomic conditional authorization executing the proposed action immediately inside Waynex Vault.
  - Quick Reject: Dismisses the suggestion, marking the approval and run as `rejected` with zero external or database side effects.
  - Edit & Approve: Action-aware modal allowing modification of proposed payloads prior to authorization:
    - Task: Title, description, priority, due date.
    - Follow-up: Title, notes, priority, due date, contact association.
    - Review: Canonical WV review types strictly enforced (`project`, `campaign`, `growth`, `strategy`, `opportunity`, `partnership`, `period`, `other`), title, period bounds.
    - Portfolio Snapshot: Verified evidence claim association and target portfolio entity.
- **Rules (`?view=rules`):**
  - Inventory of configured automation rules in the active workspace.
  - Real-time Active / Paused toggle (`is_active`) without record deletion.
  - Descriptive view of trigger types, evaluated conditions, and action types.
  - Archive lifecycle: Rules are soft-archived (`archived_at`); permanent deletions are omitted from the UI.
- **Templates (`?view=templates`):**
  - Curated catalog of 7 pre-built templates spanning reactive workflows and scheduled monitors:
    1. `meeting_task_suggestion` (Reactive: `meeting.completed` → `suggest_task_creation`)
    2. `decision_documentation_prompt` (Reactive: `decision.created` → `create_internal_notification`)
    3. `evidence_snapshot_proposal` (Reactive: `evidence.approved` → `suggest_portfolio_snapshot`)
    4. `project_retrospective_prompt` (Reactive: `project.completed` → `suggest_review_creation`)
    5. `task_overdue_escalation_notice` (Scheduled: `task.overdue_threshold` → `create_internal_notification`)
    6. `upcoming_meeting_briefing_alert` (Scheduled: `meeting.upcoming_reminder` → `create_internal_notification`)
    7. `stale_contact_reconnection_alert` (Scheduled: `crm.contact_inactive_threshold` → `suggest_follow_up_creation`)
  - "In Use" visual badge for templates already instantiated and active in the workspace.
  - Duplicate-active-instance prevention: Workspace operators cannot instantiate duplicate active rules from the same template.
- **History (`?view=history`):**
  - Chronological run ledger tracking every rule evaluation and consequence.
  - Filterable by run status (`all`, `pending`, `awaiting_approval`, `approved`, `rejected`, `running`, `succeeded`, `failed`, `skipped`, `cancelled`).
  - History Detail Inspection Modal displaying run metadata, idempotency key, evaluated rule snapshot, trigger event payload, execution latency, and error diagnostics.

### 2. Internal Notifications & Header Bell
- **Header Notification Bell:**
  - Integrated into the global Vault header (`components/vault/header.tsx`).
  - Unread badge counter tracking active notifications.
  - Interactive dropdown popover displaying notifications categorized by `approval_required`, `automation_alert`, `reminder`, and `system`.
  - Actions: Click-to-mark-as-read, Mark All as Read.
- **Zero External Delivery Boundary:**
  - In-app notification records exist solely in `workspace_notifications`.
  - Strictly internal: Zero email dispatch (no SendGrid/Postmark), zero SMS (no Twilio), zero webhooks, zero Discord/Slack/Telegram integrations.

### 3. Command Center Attention Integration
- The primary Command Center (`app/vault/page.tsx` & `components/vault/attention-section.tsx`) queries pending approvals and recent run failures.
- Surfaces actionable attention cards:
  - "Pending Automation Approvals": Directs operator to the Approval Inbox.
  - "Automation Run Failures": Flags recent rule execution errors for inspection in History.

### 4. Scheduled Processing & Time Semantics (`/api/vault/automation/process-cron`)
- **Vercel Cron Trigger:** Configured via `vercel.json` to execute hourly (`0 * * * *`).
- **Security & Authorization Boundary:**
  - Route requires `Authorization: Bearer <CRON_SECRET>`. Missing or invalid tokens immediately reject with 401 Unauthorized.
  - Secret Non-Leakage: `CRON_SECRET` is never printed, logged, or reflected in API responses.
  - Service-Role Boundary: Scheduled processing runs in the background outside of user sessions, utilizing the Supabase service-role client strictly scoped by workspace IDs retrieved from active rules.
- **Deterministic Time Semantics & Idempotency Keys:**
  - `task.overdue_threshold`: Calculates calendar day differences using `CURRENT_DATE` against ISO `YYYY-MM-DD` date strings (`task.due_date`). Only evaluates incomplete tasks (`todo`, `in_progress`, `blocked`); completed, cancelled, and archived tasks are strictly excluded. Deduplication uses daily deterministic key `sha256(task_overdue:rule_id:task_id:due_date:YYYY-MM-DD)` to ensure at most one escalation notification per calendar day.
  - `meeting.upcoming_reminder`: Evaluates ISO timestamp ranges (`TIMESTAMPTZ`) within a bounded forward-looking window (e.g. 2 hours before `scheduled_at`). Cancelled and archived meetings are strictly excluded. Deduplication uses schedule-anchored key `sha256(meeting_reminder:rule_id:meeting_id:scheduled_at)` ensuring exactly one reminder per scheduled meeting across repeated cron runs.
  - `crm.contact_inactive_threshold`: Calculates elapsed calendar days since last logged interaction (`workspace_contacts.last_contacted_at`, falling back to relationship or contact creation). Generic contact profile updates do not reset inactivity. Uses 30-day cycle bucket key `sha256(contact_inactive:rule_id:contact_id:last_activity_date:cycle_bucket)` and active pending approval checks to prevent hourly approval flooding. Consequence is human approval proposal only (`suggest_follow_up_creation`), zero automated outbound contact.
- **Candidate Failure Isolation:**
  - Candidate processing loops wrap each evaluation in isolated `try/catch` blocks. A failure evaluating a single task, meeting, or contact is audited and logged without halting processing for subsequent items.
- **Automated Approval Maintenance:**
  - The cron runner sweeps `automation_approvals` for pending records past `expires_at`, transitioning them to `expired` and updating associated runs to `cancelled`.
