const { createClient } = require('@supabase/supabase-js');
const url = 'https://fvkywedtcwbqtqvgwqhn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2a3l3ZWR0Y3dicXRxdmd3cWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTExNjg3NiwiZXhwIjoyMTA0NjkyODc2fQ.Uk0HkeLr56G6iVoYfdgJJprULxgXUfFXmfBcDZ6iEXk';
const supabase = createClient(url, key);

function replaceEmdash(text) {
  if (!text || typeof text !== 'string') return text;
  // Replace emdash surrounded by optional spaces with comma and space: ' — ' -> ', '
  return text.replace(/\s*—\s*/g, ', ');
}

async function updateAll() {
  // 1. Experience
  const { data: exp } = await supabase.from('experience').select('*');
  for (const e of exp) {
    let updated = false;
    const newDesc = replaceEmdash(e.description);
    if (newDesc !== e.description) {
      e.description = newDesc;
      updated = true;
    }
    if (e.achievements) {
      const newAch = e.achievements.map(a => replaceEmdash(a));
      if (JSON.stringify(newAch) !== JSON.stringify(e.achievements)) {
        e.achievements = newAch;
        updated = true;
      }
    }
    if (updated) {
      console.log('Updating experience:', e.organization);
      await supabase.from('experience').update({
        description: e.description,
        achievements: e.achievements
      }).eq('id', e.id);
    }
  }

  // 2. Articles
  const { data: articles } = await supabase.from('articles').select('*');
  for (const a of articles) {
    let updated = false;
    const newTitle = replaceEmdash(a.title);
    const newExcerpt = replaceEmdash(a.excerpt);
    const newContent = replaceEmdash(a.content);
    if (newTitle !== a.title || newExcerpt !== a.excerpt || newContent !== a.content) {
      console.log('Updating article:', a.title);
      await supabase.from('articles').update({
        title: newTitle,
        excerpt: newExcerpt,
        content: newContent
      }).eq('id', a.id);
    }
  }

  // 3. Projects
  const { data: projects } = await supabase.from('projects').select('*');
  for (const p of projects) {
    let updated = false;
    const newSummary = replaceEmdash(p.summary);
    const newDesc = replaceEmdash(p.description);
    if (newSummary !== p.summary || newDesc !== p.description) {
      console.log('Updating project:', p.title);
      await supabase.from('projects').update({
        summary: newSummary,
        description: newDesc
      }).eq('id', p.id);
    }
  }

  console.log('Supabase emdash replacement complete!');
}

updateAll();