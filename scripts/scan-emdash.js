const { createClient } = require('@supabase/supabase-js');
const url = 'https://fvkywedtcwbqtqvgwqhn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2a3l3ZWR0Y3dicXRxdmd3cWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTExNjg3NiwiZXhwIjoyMTA0NjkyODc2fQ.Uk0HkeLr56G6iVoYfdgJJprULxgXUfFXmfBcDZ6iEXk';
const supabase = createClient(url, key);

async function scanAll() {
  const tables = ['experience', 'articles', 'projects', 'settings', 'case_studies'];
  for (const table of tables) {
    const { data } = await supabase.from(table).select('*');
    if (!data) continue;
    data.forEach(row => {
      for (const [col, val] of Object.entries(row)) {
        if (typeof val === 'string' && (val.includes('—') || val.includes('–'))) {
          console.log(`[${table}][${row.title || row.organization || row.key || row.id}][${col}]: ${val.slice(0, 120)}...`);
        } else if (Array.isArray(val)) {
          val.forEach((item, idx) => {
            if (typeof item === 'string' && (item.includes('—') || item.includes('–'))) {
              console.log(`[${table}][${row.title || row.organization || row.id}][${col}][${idx}]: ${item}`);
            }
          });
        }
      }
    });
  }
}
scanAll();