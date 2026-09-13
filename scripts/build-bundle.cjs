const fs = require('fs');
const path = require('path');

const bundlesDir = path.join(__dirname, '..', 'supabase', 'bundles');
if (!fs.existsSync(bundlesDir)) {
  fs.mkdirSync(bundlesDir, { recursive: true });
}

const header = `-- ============================================================================
-- Waynex Vault (WV) Phase 1 Consolidated Deployment Bundle
-- ============================================================================
-- Target Database: Supabase PostgreSQL
-- Description: Core Schema, Workspaces, RBAC, Projects, Global CRM, and Activities
-- Safety: Fully transactional, idempotent (IF NOT EXISTS), zero impact on public portfolio tables
-- Notice: This bundle is an exact concatenation of canonical migrations 002 through 006.
-- ============================================================================

BEGIN;

`;

const files = [
  { name: '002: Core Schema, Profiles & Identities', file: '002_wv_core_schema_and_helpers.sql' },
  { name: '003: Workspaces, Members & RBAC', file: '003_wv_workspaces_and_members.sql' },
  { name: '004: Workspace Projects', file: '004_wv_workspace_projects.sql' },
  { name: '005: Global CRM & Workspace Links', file: '005_wv_global_crm.sql' },
  { name: '006: CRM Activities & History', file: '006_wv_crm_activities.sql' },
];

let bundle = header;
for (const item of files) {
  const content = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', item.file), 'utf8');
  bundle += `-- >>> SECTION: ${item.name} <<<\n` + content + `\n\n`;
}

bundle += `COMMIT;\n`;

const outputPath = path.join(bundlesDir, 'phase1_deployment.sql');
fs.writeFileSync(outputPath, bundle, 'utf8');
console.log('Successfully generated:', outputPath, 'Size:', bundle.length, 'bytes');
