// Проверка декодируемости: каждое слово рассказа должно собираться только из
// графем, пройденных к этой неделе. Слова-обманщики (k:) — исключение, они
// на то и обманщики. Без такой проверки любая правка текста рискует подсунуть
// ребёнку букву, которой он ещё не знает.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { GROUPS } = await import(pathToFileURL(path.join(ROOT, 'public', 'assets', 'data.js')).href);

const EXTRA = { set4: ['ff','ll','ss','zz'], me: ['a_e','i_e','o_e','u_e','e_e'] };

function graphemesUpTo(idx){
  const set = new Set();
  for (let i = 0; i <= idx; i++){
    const g = GROUPS[i];
    (g.sounds || []).forEach(([l]) => set.add(l.toLowerCase()));
    (EXTRA[g.id] || []).forEach(x => set.add(x));
  }
  return set;
}

/** Жадно режем слово на графемы: сначала пробуем длинные (ck, th, qu). */
function decodable(word, gset){
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return true;
  // немая e: слово вида CVCe разрешено, если открыт соответствующий a_e и т.д.
  const silentE = /^[a-z]+[aeiou][bcdfgklmnprstvz]e$/.test(w) &&
    ['a_e','i_e','o_e','u_e','e_e'].some(x => gset.has(x));
  const body = silentE ? w.slice(0, -1) : w;
  let i = 0;
  while (i < body.length){
    let hit = null;
    for (const len of [3, 2, 1]){
      const part = body.slice(i, i + len);
      if (part.length === len && gset.has(part)) { hit = part; break; }
    }
    if (!hit) return false;
    i += hit.length;
  }
  return true;
}

let problems = 0, checked = 0;
GROUPS.forEach((g, idx) => {
  const gset = graphemesUpTo(idx);
  for (const st of [g.story, g.story3, g.story2]){
    if (!st) continue;
    const tricky = new Set((st.k || []).map(x => x.toLowerCase()));
    const bad = [];
    for (const line of st.l.filter(Boolean)){
      for (const raw of line.split(/\s+/)){
        const w = raw.replace(/[^A-Za-z]/g, '');
        if (!w) continue;
        checked++;
        if (tricky.has(w.toLowerCase())) continue;
        if (!decodable(w, gset)) bad.push(w);
      }
    }
    if (bad.length){ problems++; console.log(`  ${st.t}: ${[...new Set(bad)].join(', ')}`); }
  }
});
console.log(`\nпроверено слов: ${checked} | текстов с нарушениями: ${problems}`);
if (problems) process.exit(1);
