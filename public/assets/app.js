import { GROUPS, CARDS, phrasesOf, EXTRA_SAY, MIN_PAIRS, trickyWords, drillWords } from './data.js';
import { art } from './art.js';

/* ==================== СОСТОЯНИЕ ==================== */
const LS = {
  get(k, d){ try{ const v = localStorage.getItem('vio.'+k); return v===null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('vio.'+k, JSON.stringify(v)); }catch(e){} }
};
let seen = {}, audioOn = true, rate = 1;
let fluent = new Set();   // столбики, отмеченные родителем как беглые
let MANIFEST = null;                       // {текст: URL в Cloud Storage} из audio/manifest.json
let BAKED = 1;                             // темп, с которым записаны файлы — из манифеста
let player = null, timer = null, actx = null;
const got = id => (seen[id] ||= new Set());
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function saveSeen(){ const o={}; for(const k in seen) o[k]=[...seen[k]]; LS.set('seen',o); }

/* ==================== БЕГЛОСТЬ ====================
   Касание слова — это не владение. Курс построен на трёх проходах до беглости,
   и услышать её может только взрослый, который сидит рядом. Поэтому отметку
   ставит он, а маршрут на 12 недель считает по ней, а не по кликам. */
const colsOf = g => [
  ...(g.cols||[]).map(c => g.id+'/'+c[0]),
  ...(g.extra?.cols||[]).map(c => g.id+'+/'+c[0]),
];
function toggleFluent(id){
  fluent.has(id) ? fluent.delete(id) : fluent.add(id);
  LS.set('fluent', [...fluent]);
  paintFluent();
}
function paintFluent(){
  document.querySelectorAll('[data-fluent]').forEach(b=>{
    const on = fluent.has(b.dataset.fluent);
    b.classList.toggle('on', on); b.textContent = on ? '✓ Бегло' : 'Бегло';
    b.closest('.col')?.classList.toggle('done', on);
  });
  paintWeeks();
}
function weekState(gid){
  if(gid==='drill'){
    const base = GROUPS.filter(g=>['set1','set2','set3','set4'].includes(g.id)).flatMap(colsOf);
    return [base.filter(c=>fluent.has(c)).length, base.length];
  }
  const g = GROUPS.find(x=>x.id===gid); if(!g) return [0,0];
  const cs = colsOf(g);
  return [cs.filter(c=>fluent.has(c)).length, cs.length];
}
function paintWeeks(){
  document.querySelectorAll('[data-week]').forEach(el=>{
    const [n,total] = weekState(el.dataset.week);
    const bar = el.querySelector('.wbar i'), lab = el.querySelector('.wnum');
    if(!total){ if(lab) lab.textContent=''; return; }
    if(bar) bar.style.width = Math.round(n/total*100)+'%';
    if(lab) lab.textContent = n+' / '+total;
    el.classList.toggle('done', n===total);
  });
}

/* ==================== АУДИО ====================
   Озвучка собрана заранее (npm run audio) и лежит в Cloud Storage. Здесь ключей
   нет и в API никто не ходит: манифест даёт готовый URL, браузерный голос —
   запасной вариант, если файла для строки не нашлось. */
const MANIFEST_FALLBACK = 'https://storage.googleapis.com/violet-3e5a8.firebasestorage.app/audio/manifest.json';
function stopAudio(){ try{ if(player){player.pause();player=null;} speechSynthesis.cancel(); }catch(e){} }

function browserSay(t){
  try{
    if(!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang='en-GB'; u.rate=rate; u.pitch=1.06;
    const vs = speechSynthesis.getVoices();
    const v = vs.find(x=>x.lang==='en-GB') || vs.find(x=>x.lang&&x.lang.startsWith('en'));
    if(v) u.voice=v;
    speechSynthesis.speak(u);
  }catch(e){}
}
function playUrl(u){ stopAudio(); player = new Audio(u); player.playbackRate = rate; player.play().catch(()=>{}); }

function speak(text){ speakDone(text); }

/** То же, что speak, но возвращает обещание, которое ждёт конца записи. */
function speakDone(text){
  if(!audioOn || !text) return Promise.resolve();
  const key = text.trim();
  const url = MANIFEST && MANIFEST[key];
  if(!url){ browserSay(key); return new Promise(r=>setTimeout(r, 380 + key.length*55)); }
  return new Promise(res=>{
    stopAudio();
    player = new Audio(url);
    player.playbackRate = rate;
    const done = () => res();
    player.addEventListener('ended', done);
    player.addEventListener('error', done);
    player.play().catch(done);
  });
}

/** Слово, растянутое для слияния: сначала «сссаааат», потом обычное. */
function speakBlend(word){
  const slow = MANIFEST && MANIFEST['blend:'+word];
  if(!slow) return speakDone(word);
  return new Promise(res=>{
    stopAudio();
    player = new Audio(slow);
    player.playbackRate = rate;
    const next = () => { setTimeout(()=>speakDone(word).then(res), 260); };
    player.addEventListener('ended', next);
    player.addEventListener('error', next);
    player.play().catch(next);
  });
}


/* Столбик подсвечивает слова по очереди и держит темп — ждать сеть на каждом
   слове нельзя. При открытии набора его озвучка тихо уезжает в кэш браузера,
   дальше её отдаёт service worker, и повторные занятия идут офлайн. */
const warmed = new Set();
function warm(id){
  const g = GROUPS.find(x => x.id === id);
  if(!g || !MANIFEST) return;
  const urls = phrasesOf(g).map(t => MANIFEST[t]).filter(u => u && !warmed.has(u));
  urls.forEach(u => warmed.add(u));
  let i = 0;
  const next = () => { const u = urls[i++]; if(u) fetch(u).catch(()=>{}).then(next); };
  for(let k = 0; k < 4; k++) next();
}

/* Прогон по столбику ждёт конца записи, а не тикает по таймеру.
   Фиксированный интервал держался только на том, что слова короткие: стоит
   сменить темп или добавить длинную строку — и записи начнут накладываться. */
let walkStop = null;
function stopWalk(){
  if(walkStop){ walkStop(); walkStop=null; }
  clearInterval(timer);
  document.querySelectorAll('.lit').forEach(e=>e.classList.remove('lit'));
}
function walkThrough(items, textOf, gap, onEnd){
  let i=0, cancelled=false;
  walkStop = () => { cancelled=true; };
  const step = async () => {
    document.querySelectorAll('.lit').forEach(e=>e.classList.remove('lit'));
    if(cancelled) return;
    if(i>=items.length){ walkStop=null; onEnd && onEnd(); return; }
    const el = items[i++];
    el.classList.add('lit');
    await speakDone(textOf(el));
    if(cancelled) return;
    setTimeout(step, gap);
  };
  step();
}

function tick(){
  if(!audioOn) return;
  try{
    actx = actx || new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    const o=actx.createOscillator(), g=actx.createGain(), n=actx.currentTime;
    o.type='triangle';
    o.frequency.setValueAtTime(1250,n); o.frequency.exponentialRampToValueAtTime(620,n+.06);
    g.gain.setValueAtTime(.0001,n); g.gain.exponentialRampToValueAtTime(.05,n+.006);
    g.gain.exponentialRampToValueAtTime(.0001,n+.08);
    o.connect(g); g.connect(actx.destination); o.start(n); o.stop(n+.09);
  }catch(e){}
}

/* ==================== РАЗБОР СЛОВА ==================== */
const V='aeiou';
/* Делим слово на onset / гласную / конец — в том порядке, в каком его читают.
   qu приходится оговаривать отдельно: u здесь формально гласная, и поиск
   первой гласной резал слово как q|u|iz, хотя карточка набора 4 прямо учит,
   что qu — «всегда вдвоём». Диграфы ch, th, sh ловятся сами: у них вторая
   буква согласная, и поиск через них проходит. */
function split(w){
  const start = /^qu/i.test(w) ? 2 : 1;
  let i=start; while(i<w.length && V.indexOf(w[i].toLowerCase())<0) i++;
  if(i>=w.length){ i=0; while(i<w.length && V.indexOf(w[i].toLowerCase())<0) i++; }
  return [w.slice(0,i), w[i]||'', w.slice(i+1)];
}

/* ==================== СБОРКА СТРАНИЦ ==================== */
const panes = document.getElementById('panes'), segs = document.getElementById('segs');

GROUPS.forEach(g => {
  const b = document.createElement('button');
  b.className='seg'; b.dataset.go=g.id; b.style.setProperty('--c',g.c); b.textContent=g.nav;
  b.onclick = () => show(g.id); segs.appendChild(b);
  const p = document.createElement('section');
  p.className='pane'; p.id='x-'+g.id;
  p.innerHTML = g.kind==='start' ? startHTML()
              : g.kind==='cards' ? cardsHTML()
              : g.kind==='drill' ? drillHTML()
              : groupHTML(g);
  panes.appendChild(p);
});

function show(id){
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id==='x-'+id));
  document.querySelectorAll('.seg').forEach(s=>s.classList.toggle('on',s.dataset.go===id));
  const s=document.querySelector('.seg.on'); if(s) s.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
  window.scrollTo({top:0,behavior:'smooth'}); stopAudio(); stopWalk();
  LS.set('tab', id); warm(id);
}

function startHTML(){ return `
<div class="card hero" style="--t:#FFF3D0;--c:#F59E0B">
  ${art('sun')}
  <div class="inner">
    <div class="kick">Фоникс · 5–9 лет</div>
    <h1 class="big">Ребёнок читает не слова, а звуки — и складывает их сам</h1>
    <p class="sub">Через 12 недель он прочитает английское слово, которое видит впервые. Мама ведёт занятие: 15 минут в день, по одной вкладке сверху.</p>
  </div>
  <div class="rules">
    <div class="rl"><b>🔤 Звук, а не буква</b><span>Не «эм», а /m/. Названия букв — потом, иначе <span class="en">cat</span> станет «си-эй-ти».</span></div>
    <div class="rl"><b>🤫 Без призвука «э»</b><span>Не «бэ», «дэ», «кэ». Взрывные /p/ /b/ /t/ /d/ /k/ /g/ — резко и почти шёпотом.</span></div>
    <div class="rl"><b>⏱ 15 минут ежедневно</b><span>Частота важнее длительности. Час в воскресенье не работает.</span></div>
    <div class="rl"><b>👀 Сначала прочитал</b><span>Ребёнок озвучивает слово и только потом вспоминает смысл. Перевод — в конце.</span></div>
  </div>
</div>

<div class="card">
  <h2 class="sec"><span class="emo">📊</span> Как читать таблицы слов</h2>
  <p class="sub"><b>Столбиками, сверху вниз. Не строками.</b> В каждом столбике одна и та же гласная — ребёнок перестаёт перебирать гласные и меняет только согласные.</p>
  <ol class="steps">
    <li>Покажите на шапку столбика: «Здесь везде /a/». Ребёнок повторяет звук три раза.</li>
    <li>Читаем столбик сверху вниз, медленно. Кнопка <b>▶</b> подсвечивает слова по очереди и держит темп.</li>
    <li>Тот же столбик ещё раз, быстрее. И третий раз — бегло.</li>
    <li>Следующий столбик. Так же, три прохода.</li>
    <li>Когда все столбики бегло — читаем <b>строками</b>, слева направо. Это проверка.</li>
    <li>Финал: закройте шапку листком. Ребёнок читает без подсказки.</li>
  </ol>
</div>

<div class="list">
  <details class="row"><summary><span class="emo">📋</span> Мелочи, которые решают</summary>
    <div class="body"><ul>
      <li>Закрывайте соседние столбики листком бумаги.</li>
      <li>Запнулся — <b>не подсказывайте слово целиком</b>. Ткните в первую букву: «Какой звук?»</li>
      <li>Один столбик за раз. Не проходите всю таблицу в первый день.</li>
      <li>Столбик освоен, если читается сверху вниз <b>и</b> снизу вверх без пауз.</li>
    </ul></div></details>
  <details class="row"><summary><span class="emo">🎰</span> Что делать со спиннером</summary>
    <div class="body"><ol>
      <li><b>Просто крути.</b> Барабаны останавливаются по очереди слева направо — слово собирается в том же порядке, в каком ребёнок его читает.</li>
      <li><b>Меняем одну деталь.</b> Кнопки ↻ под Onset и Ending крутят только один барабан, гласная стоит на месте.</li>
      <li><b>Слить по звукам.</b> Части подсвечиваются по очереди: сначала ребёнок называет части, потом слово целиком.</li>
    </ol>
    <p style="margin:8px 0 0">Спиннер собирает слова только из пройденных звуков — незнакомого не выпадет.</p></div></details>
  <details class="row"><summary><span class="emo">🔊</span> Как работает озвучка</summary>
    <div class="body">
      <p style="margin:0 0 8px">Слова читает <b>Sophia</b> — живой голос ElevenLabs. Все записи сделаны заранее: при открытии набора они уезжают в память браузера, и дальше занятие идёт мгновенно и без интернета. Скорость чтения — в ⚙︎.</p>
      <p style="margin:0"><b>Отдельные звуки не озвучиваются намеренно.</b> Синтез читает их как названия букв — «си» вместо /k/ — и это сломало бы метод. Звуки произносит взрослый по подсказкам в карточке набора.</p></div></details>
  <details class="row"><summary><span class="emo">🧩</span> Проверка: бессмысленные слова</summary>
    <div class="body"><p style="margin:0 0 8px">Если ребёнок читает выдуманные слова — он декодирует, а не угадывает. Скажите: «Это слова из языка роботов».</p>
    <p class="en" style="font-size:20px;font-weight:700;color:var(--ink);margin:0">vap · zib · fom · dut · nes · quz · lig · mub · tesh · chid</p></div></details>
</div>

<div class="card">
  <h2 class="sec"><span class="emo">🗓</span> Маршрут на 12 недель</h2>
  <div class="weeks">
    ${[['1','Набор 1','Text 1','set1'],['2','Набор 2','Text 2','set2'],['3–4','Набор 3','Text 3','set3'],
       ['5','Набор 4','Text 4','set4'],['6','Повтор 1–4','проверка','drill'],['7–8','th','Text 5','th'],
       ['9','ch','Text 6','ch'],['10','sh','Text 7','sh'],['11','ph','Text 8–9','ph'],
       ['12','Немая e','Text 10–12','me']]
      .map(([n,t,x,gid])=>`<div class="wk" data-week="${gid}"><div class="n">${n} нед.</div><div class="t">${t}</div>`+
        `<div class="x">${x}</div><div class="wbar"><i></i></div><div class="wnum"></div></div>`).join('')}
  </div>
  <p class="hint" style="margin-bottom:10px">Клетка закрашивается, когда все столбики набора отмечены «бегло» — отметку ставите вы, кнопкой под столбиком. Клики ребёнка сюда не считаются: их слишком легко набрать, не читая.</p>
  <p class="hint"><b>th стоит первым среди диграфов намеренно</b> — этого звука нет в русском, ему нужно больше всего времени. Если через две недели он не звучит, идите дальше к <span class="en">ch</span>, а <span class="en">th</span> держите разминкой по 30 секунд перед занятием. Застревание на <span class="en">th</span> — главная причина, по которой семьи бросают фоникс.</p>
</div>`; }

function groupHTML(g){
  let h = `<div class="card hero" style="--t:${g.soft||'#EEF2FF'};--c:${g.c}">
    ${art(g.art)}
    <div class="inner">
      <div class="kick">${esc(g.num)}</div>
      <h1 class="big en">${esc(g.title)}</h1>
      <p class="sub">${esc(g.lead)}</p>
    </div>
    <div class="chips">${g.sounds.map(([l,i])=>`<div class="chip" style="--c:${g.c}"><b class="en">${esc(l)}</b><i>${esc(i)}</i></div>`).join('')}</div>
    <div class="artic">${g.sounds.map(([l,i,t])=>`<b>${esc(l)}</b> — ${esc(t)}`).join(' · ')}</div>
  </div>`;
  if(g.cols) h += `<div class="card"><h2 class="sec"><span class="emo">📊</span> Слова · читаем столбиками</h2>
    <p class="sub" style="margin-bottom:11px">Три прохода по каждому столбику, и только потом — строками.</p>${colsHTML(g.cols, g.id)}</div>`;
  if(g.extra) h += `<div class="card"><h2 class="sec">${esc(g.extra.t)}</h2>${colsHTML(g.extra.cols, g.id+'+')}</div>`;
  if(g.wall) h += `<div class="card"><h2 class="sec"><span class="emo">🔤</span> Стена слов</h2>
    <p class="sub" style="margin-bottom:13px">Спиннера здесь нет: слова с <span class="en">ph</span> длиннее CVC, их берут целиком. Нажмите — прозвучит.</p>
    <div class="wall">${g.wall.map(w=>`<button class="pill" data-say="${esc(w)}">${w.replace(/([Pp])h/,'<u>$1h</u>')}</button>`).join('')}</div></div>`;
  if(g.spin) h += spinHTML(g);
  if(g.pairs) h += pairHTML(g);
  if(g.story) h += storyHTML(g.story);
  if(g.story2) h += storyHTML(g.story2);
  return h;
}
/* Панели строятся сразу при загрузке модуля, до этих строк, поэтому здесь
   объявления функций, а не const-стрелки: стрелка в этот момент ещё в
   временной мёртвой зоне, и первый же набор со столбиками рушил всю отрисовку. */
function colsHTML(cols, gid){ return `<div class="cols">${cols.map(([head,ipa,ws])=>`<div class="col" data-col="${esc(gid+'/'+head)}">
  <div class="chead"><span class="en">${esc(head)}</span>${ipa?`<i>${esc(ipa)}</i>`:''}</div>
  ${ws.map(w=>`<button class="word en" data-say="${esc(w)}">${esc(w)}</button>`).join('')}
  <button class="walk" data-walk>▶ Пройти</button>
  <button class="fluent" data-fluent="${esc(gid+'/'+head)}">Бегло</button></div>`).join('')}</div>`; }

function spinHTML(g){ return `<div class="spin" data-spin="${g.id}">
  <div class="kick" style="--c:${g.c}">Тренажёр слов</div>
  <div class="sw en" data-w>—</div>
  <div class="pips"><i></i><i></i><i></i></div>
  <div class="tiles">
    <div class="tw"><div class="tlab">Onset</div><div class="tile" data-t="0"><div class="strip"></div></div><button class="re" data-re="0">↻</button></div>
    <div class="tw"><div class="tlab">Vowel</div><div class="tile v" data-t="1"><div class="strip"></div></div><button class="re gh">↻</button></div>
    <div class="tw"><div class="tlab">Ending</div><div class="tile" data-t="2"><div class="strip"></div></div><button class="re" data-re="2">↻</button></div>
  </div>
  <div class="bar">
    <button class="btn" data-a="spin" style="background:${g.c};box-shadow:0 5px 14px ${g.c}55">🎰 Новое слово</button>
    <button class="btn soft sm" data-a="blend">🐛 Слить по звукам</button>
    <button class="btn soft sm" data-a="say">🔊</button>
  </div>
  <div class="bank"><div class="bhead"><span class="t">Слова набора</span><span class="cnt" data-cnt></span>
    <button class="re" data-a="reset">Сбросить</button></div>
  <div class="bws" data-bank></div></div></div>`; }

function pairHTML(g){ return `<div class="spin" data-pair="${g.id}">
  <div class="kick" style="--c:${g.c}">Тренажёр пар</div>
  <div class="pair"><div class="pw en" data-s>—</div><div class="arw">+e</div><div class="pw en off" data-l>—</div></div>
  <div class="bar">
    <button class="btn pur" data-p="add">✨ Добавить e</button>
    <button class="btn soft" data-p="spin">Новая пара</button>
    <button class="btn soft sm" data-p="say">🔊</button>
  </div>
  <div class="bank"><div class="bhead"><span class="t">Пары набора</span><span class="cnt" data-pcnt></span>
    <button class="re" data-p="reset">Сбросить</button></div>
  <div class="bws" data-pbank></div></div>
  <p class="hint" style="text-align:left">Ребёнок читает короткое слово → нажимает «Добавить e» → читает длинное. Вслух оба. Гласная должна назвать своё имя.</p></div>`; }

function storyHTML(s){ return `<div class="card story">
  <h2 class="sec">${art(s.art,'sm')}${esc(s.t)}</h2>
  <div style="margin:13px 0 0">${s.l.map(l=>l===''?'<div class="gap"></div>':
    `<button class="ln en" data-say="${esc(l.replace(/"/g,''))}">${esc(l)}</button>`).join('')}</div>
  <div class="trk"><span class="l">Хитрецы</span>${s.k.map(t=>`<span class="tw2 en">${esc(t)}</span>`).join('')}</div>
  <ol class="qs">${s.q.map((q,i)=>`<li><button class="qq en" data-say="${esc(q)}">${esc(q)}</button>`+
    `${s.qRu&&s.qRu[i]?`<span class="qru">${esc(s.qRu[i])}</span>`:''}</li>`).join('')}</ol>
  <div class="bar" style="justify-content:flex-start"><button class="btn soft sm" data-read>▶ Прочитать вслух</button></div></div>`; }

function cardsHTML(){
  const gs=[...new Set(CARDS.map(c=>c[0]))];
  return `<div class="card hero" style="--t:#EDF1F9;--c:#6E7691">
    ${art('cards')}
    <div class="inner"><div class="kick">Печать</div><h1 class="big">Карточки со звуками</h1>
    <p class="sub">Девять карточек на лист A4 с пунктиром для разреза: картинка, звук, слово-якорь. Названия букв на карточках нет намеренно.</p></div>
    <div class="pick">${gs.map(g=>`<button class="pk on" data-set="${esc(g)}">${esc(g)}</button>`).join('')}</div>
    <button class="btn" data-print>🖨 Распечатать</button></div>
  <div class="card"><h2 class="sec">Предпросмотр</h2><div class="fgrid" id="fgrid" style="margin-top:13px"></div></div>
  <div class="list"><details class="row" open><summary><span class="emo">✂️</span> Как пользоваться</summary><div class="body"><ul>
    <li>Разрежьте по пунктиру, наклейте на картон.</li>
    <li>Разминка 30 секунд в начале занятия: показываете карточку — ребёнок говорит <b>звук</b>, не название буквы.</li>
    <li>Слово-якорь — подсказка для взрослого. Ребёнку показывайте стороной с буквой.</li>
    <li>Освоенные карточки не убирайте: колода должна расти.</li>
  </ul></div></details></div>`;
}

/* ==================== БАРАБАНЫ ==================== */
function setCell(tile,val){
  const s = tile.querySelector('.strip');
  s.style.transition='none'; s.style.transform='translateY(0)';
  s.innerHTML = '<div class="cell rest">'+esc(val||'·')+'</div>';
}
function roll(tile,pool,target,dur){
  return new Promise(done=>{
    const h = tile.clientHeight, s = tile.querySelector('.strip');
    if(REDUCE || !h){ setCell(tile,target); tick(); done(); return; }
    s.style.setProperty('--h', h+'px');
    const cells=[];
    for(let i=0;i<14;i++) cells.push(pool[Math.floor(Math.random()*pool.length)]||'·');
    cells.push(target||'·');
    s.style.transition='none'; s.style.transform='translateY(0)';
    s.innerHTML = cells.map(c=>'<div class="cell">'+esc(c)+'</div>').join('');
    tile.classList.add('rolling'); void s.offsetHeight;
    const end = -(cells.length-1)*h;
    s.style.transition='transform '+dur+'ms cubic-bezier(.10,.58,.16,1)';
    s.style.transform='translateY('+(end-11)+'px)';
    setTimeout(()=>{
      s.style.transition='transform 170ms cubic-bezier(.34,1.45,.64,1)';
      s.style.transform='translateY('+end+'px)';
      tile.classList.remove('rolling');
      tile.classList.remove('land'); void tile.offsetWidth; tile.classList.add('land');
      tick();
      setTimeout(()=>{ setCell(tile,target); done(); },180);
    }, dur+25);
  });
}

function initSpin(box){
  const id=box.dataset.spin, g=GROUPS.find(x=>x.id===id), ws=g.spin;
  let cur=null, busy=false;
  const parts = ws.map(split);
  const pools = [0,1,2].map(i=>[...new Set(parts.map(p=>p[i]).filter(Boolean))]);
  const tiles = [0,1,2].map(i=>box.querySelector('[data-t="'+i+'"]'));
  const bigEl = box.querySelector('[data-w]');
  const pips = [...box.querySelectorAll('.pips i')];
  const btn = box.querySelector('[data-a="spin"]');
  const CL = ['o','v','e'];
  const bank = box.querySelector('[data-bank]');
  bank.innerHTML = ws.map(w=>`<span class="bw en" data-bw="${esc(w)}">${esc(w)}</span>`).join('');

  const paint = () => { const s=got(id);
    bank.querySelectorAll('.bw').forEach(e=>{e.classList.toggle('seen',s.has(e.dataset.bw));e.classList.toggle('now',e.dataset.bw===cur);});
    box.querySelector('[data-cnt]').textContent = s.size+' / '+ws.length; };
  const showBig = p => { bigEl.innerHTML = p.map((x,i)=>'<span class="'+CL[i]+'">'+esc(x)+'</span>').join(''); };
  const settle = w => { cur=w; got(id).add(w); saveSeen(); paint(); speak(w); };
  const pick = f => { const s=got(id);
    let pool = ws.filter(f||(()=>1)).filter(w=>w!==cur); if(!pool.length) pool=ws.filter(w=>w!==cur);
    const fresh = pool.filter(w=>!s.has(w)); const src = fresh.length?fresh:pool;
    return src[Math.floor(Math.random()*src.length)]; };

  async function spinAll(){
    if(busy) return; busy=true; btn.disabled=true;
    const w=pick(), p=split(w);
    bigEl.innerHTML=''; pips.forEach(x=>x.classList.remove('a'));
    const durs=[720,980,1240];
    await Promise.all([0,1,2].map(i=>roll(tiles[i],pools[i],p[i],durs[i]).then(()=>{
      bigEl.insertAdjacentHTML('beforeend','<span class="'+CL[i]+'">'+esc(p[i])+'</span>');
      pips[i].classList.add('a');
    })));
    bigEl.classList.remove('bump'); void bigEl.offsetWidth; bigEl.classList.add('bump');
    setTimeout(()=>pips.forEach(x=>x.classList.remove('a')),480);
    settle(w); busy=false; btn.disabled=false;
  }
  async function respin(i){
    if(busy||!cur) return; busy=true;
    const p=split(cur);
    const w = i===0 ? pick(x=>{const q=split(x);return q[1]===p[1]&&q[2]===p[2];})
                    : pick(x=>{const q=split(x);return q[0]===p[0]&&q[1]===p[1];});
    const np=split(w);
    await roll(tiles[i],pools[i],np[i],860);
    showBig(np); settle(w); busy=false;
  }
  /* Слияние — тот самый навык, ради которого метод называется синтетическим.
     Раньше кнопка только двигала CSS и произносила готовое слово: ребёнок
     видел подсветку и запоминал слово картинкой. Теперь под подсветку идёт
     растянутая запись — «сссаааат», — а следом слово в обычном темпе. */
  const clearParts = () => { pips.forEach(p=>p.classList.remove('a')); tiles.forEach(t=>t.style.transform=''); };
  async function blend(w){
    let i=0;
    const step=()=>{
      clearParts();
      if(i<3){ pips[i].classList.add('a'); tiles[i].style.transform='translateY(-7px) scale(1.06)'; i++; setTimeout(step,470); }
    }; step();
    await speakBlend(w);
    clearParts();
    bigEl.classList.remove('bump'); void bigEl.offsetWidth; bigEl.classList.add('bump');
  }

  box.addEventListener('click', ev=>{
    const a = ev.target.closest('[data-a]')?.dataset.a, re = ev.target.closest('[data-re]')?.dataset.re;
    if(a==='spin') spinAll();
    if(a==='say' && cur) speak(cur);
    if(a==='reset'){ seen[id]=new Set(); saveSeen(); paint(); }
    if(re!==undefined) respin(+re);
    if(a==='blend' && cur && !busy) blend(cur);
  });

  const w0=ws[Math.floor(Math.random()*ws.length)], p0=split(w0);
  cur=w0; showBig(p0); tiles.forEach((t,i)=>setCell(t,p0[i])); paint();
}

function initPair(box){
  const id=box.dataset.pair, g=GROUPS.find(x=>x.id===id), ps=g.pairs; let cur=null;
  const bank=box.querySelector('[data-pbank]');
  bank.innerHTML = ps.map(([s,l])=>`<span class="bw en" data-bw="${esc(l)}">${esc(s)}→${esc(l)}</span>`).join('');
  const paint=()=>{ const s=got(id+'.p');
    bank.querySelectorAll('.bw').forEach(e=>{e.classList.toggle('seen',s.has(e.dataset.bw));e.classList.toggle('now',cur&&e.dataset.bw===cur[1]);});
    box.querySelector('[data-pcnt]').textContent = s.size+' / '+ps.length; };
  const fmt=(w,sil)=>{ const p=split(w);
    return `<span>${esc(p[0])}</span><span class="v">${esc(p[1])}</span>` +
      (sil?`<span>${esc(p[2].slice(0,-1))}</span><span class="se">e</span>`:`<span>${esc(p[2])}</span>`); };
  const spin=()=>{ const s=got(id+'.p'); let pool=ps.filter(p=>!s.has(p[1])); if(!pool.length) pool=ps;
    cur=pool[Math.floor(Math.random()*pool.length)];
    box.querySelector('[data-s]').innerHTML=fmt(cur[0],false);
    const L=box.querySelector('[data-l]'); L.innerHTML=fmt(cur[1],true); L.classList.add('off'); L.classList.remove('in');
    paint(); speak(cur[0]); };
  box.addEventListener('click', ev=>{
    const p = ev.target.closest('[data-p]')?.dataset.p;
    if(p==='spin') spin();
    if(p==='add' && cur){ const L=box.querySelector('[data-l]');
      L.classList.remove('off','in'); void L.offsetWidth; L.classList.add('in');
      got(id+'.p').add(cur[1]); saveSeen(); paint(); speak(cur[1]); }
    if(p==='say' && cur) speak(cur[0]+', '+cur[1]);
    if(p==='reset'){ seen[id+'.p']=new Set(); saveSeen(); paint(); }
  });
  spin();
}

/* ==================== ГЛОБАЛЬНЫЕ КЛИКИ ==================== */
document.addEventListener('click', ev=>{
  const fl = ev.target.closest('[data-fluent]');
  if(fl) toggleFluent(fl.dataset.fluent);

  const s = ev.target.closest('[data-say]');
  if(s){ speak(s.dataset.say);
    if(s.classList.contains('word')) s.classList.add('done');
    if(s.classList.contains('ln')){ document.querySelectorAll('.ln.lit').forEach(l=>l.classList.remove('lit')); s.classList.add('lit'); } }

  const wb = ev.target.closest('[data-walk]');
  if(wb){ const col=wb.closest('.col'), ws=[...col.querySelectorAll('.word')];
    stopWalk();
    if(wb.dataset.on){ wb.dataset.on=''; wb.textContent='▶ Пройти'; return; }
    document.querySelectorAll('[data-walk]').forEach(b=>{b.dataset.on='';b.textContent='▶ Пройти';});
    wb.dataset.on='1'; wb.textContent='⏸ Стоп';
    walkThrough(ws, w=>w.textContent, 900, ()=>{ wb.dataset.on=''; wb.textContent='▶ Пройти'; }); }

  const rd = ev.target.closest('[data-read]');
  if(rd){ const ls=[...rd.closest('.story').querySelectorAll('.ln')];
    stopWalk(); walkThrough(ls, l=>l.dataset.say, 1100); }

  const pk = ev.target.closest('[data-set]');
  if(pk){ pk.classList.toggle('on'); renderCards(); }
  if(ev.target.closest('[data-print]')){ renderCards(); setTimeout(()=>window.print(),80); }
});

/* ==================== КАРТОЧКИ ==================== */
function renderCards(){
  const on = [...document.querySelectorAll('[data-set]')].filter(b=>b.classList.contains('on')).map(b=>b.dataset.set);
  const list = CARDS.filter(c=>on.includes(c[0]));
  const g = document.getElementById('fgrid');
  if(g) g.innerHTML = list.map(([a,l,w,e,v])=>`<div class="fc"><div class="e">${e}</div><div class="l en ${v?'v':''}">${esc(l)}</div><div class="w en">${esc(w)}</div></div>`).join('');
  document.getElementById('printsheet').innerHTML = '<div class="pg">' + list.map(([a,l,w,e])=>
    `<div class="pc"><div class="e">${e}</div><div class="l">${esc(l)}</div><div class="w">${esc(w)}</div></div>`).join('') + '</div>';
}


/* ==================== ТРЕНИРОВКА ====================
   Четыре упражнения, которых курсу не хватало: повтор вперемешку (столбик
   читается по инерции — ребёнок уже знает, что здесь везде /æ/), обманщики
   (самые частые слова английского, правило на них не работает), диктант
   (обратная операция закрепляет чтение быстрее, чем повторное чтение) и
   пары гласных (у русскоязычных /æ/, /e/ и /ʌ/ схлопываются в один звук). */
function drillHTML(){
  return `
<div class="card hero" style="--t:#E0F4FE;--c:#0EA5E9">
  ${art('bug')}
  <div class="inner">
    <div class="kick">Тренировка</div>
    <h1 class="big">Четыре упражнения между наборами</h1>
    <p class="sub">Берите по одному в конце занятия, две-три минуты. Шестая неделя маршрута — это целиком повтор вперемешку.</p>
  </div>
</div>

<div class="card" data-drill="review">
  <h2 class="sec"><span class="emo">🔀</span> Повтор вперемешку</h2>
  <p class="sub">Слова из всех наборов сразу, без подсказки гласной в шапке. Если читается здесь — читается по-настоящему.</p>
  <div class="dbig en" data-word>—</div>
  <div class="bar" style="justify-content:flex-start">
    <button class="btn" data-d="next" style="background:#0EA5E9;box-shadow:0 5px 14px #0EA5E955">🔀 Новое слово</button>
    <button class="btn soft sm" data-d="say">🔊 Проверить</button>
    <button class="btn soft sm" data-d="blend">🐛 Слить</button>
  </div>
  <p class="hint">Сначала читает ребёнок, потом проверяем кнопкой. Не наоборот.</p>
</div>

<div class="card" data-drill="tricky">
  <h2 class="sec"><span class="emo">🃏</span> Слова-обманщики</h2>
  <p class="sub">Правило на них не работает — их берут узнаванием. Это самые частые слова языка: пока они не узнаются мгновенно, беглости не будет.</p>
  <div class="dbig en" data-word>—</div>
  <div class="bar" style="justify-content:flex-start">
    <button class="btn" data-d="know" style="background:#22C55E;box-shadow:0 5px 14px #22C55E55">✓ Знает</button>
    <button class="btn soft" data-d="again">↻ Ещё раз</button>
    <button class="btn soft sm" data-d="say">🔊</button>
  </div>
  <div class="bank"><div class="bhead"><span class="t">Колода</span><span class="cnt" data-cnt></span>
    <button class="re" data-d="reset">Сбросить</button></div>
    <div class="bws" data-bank></div></div>
</div>

<div class="card" data-drill="dictation">
  <h2 class="sec"><span class="emo">✍️</span> Диктант</h2>
  <p class="sub">Слово звучит, ребёнок пишет на бумаге, потом сверяем. Обратная операция закрепляет чтение быстрее повторного чтения и сразу показывает, какой звук на самом деле не различается.</p>
  <div class="dbig en hide" data-word>—</div>
  <div class="bar" style="justify-content:flex-start">
    <button class="btn" data-d="play" style="background:#A855F7;box-shadow:0 5px 14px #A855F755">🔊 Сказать слово</button>
    <button class="btn soft" data-d="show">👁 Показать</button>
    <button class="btn soft sm" data-d="next">Дальше</button>
  </div>
  <p class="hint">Кнопку «Показать» нажимает ребёнок сам — после того как написал.</p>
</div>

<div class="card" data-drill="pairs">
  <h2 class="sec"><span class="emo">👂</span> Пары гласных</h2>
  <p class="sub">Звучит одно слово из двух. Ребёнок выбирает, какое услышал. Здесь проверяется слух, а не чтение.</p>
  <div class="pickrow" data-groups></div>
  <div class="dpair" data-pairbox></div>
  <div class="bar" style="justify-content:flex-start">
    <button class="btn" data-d="play" style="background:#FF9F1C;box-shadow:0 5px 14px #FF9F1C55">🔊 Ещё раз</button>
    <button class="btn soft" data-d="next">Новая пара</button>
  </div>
  <p class="hint" data-tip></p>
  <p class="hint" data-score></p>
</div>`;
}

function initDrill(root){
  const rnd = a => a[Math.floor(Math.random()*a.length)];

  /* — повтор вперемешку — */
  (box => {
    const el = box.querySelector('[data-word]');
    const pool = drillWords('me');
    let cur = null;
    const next = () => { let w; do { w = rnd(pool); } while(w===cur && pool.length>1); cur=w; el.textContent=w; };
    box.addEventListener('click', ev => {
      const a = ev.target.closest('[data-d]')?.dataset.d;
      if(a==='next') next();
      if(a==='say' && cur) speak(cur);
      if(a==='blend' && cur) speakBlend(cur);
    });
    next();
  })(root.querySelector('[data-drill="review"]'));

  /* — обманщики — */
  (box => {
    const el = box.querySelector('[data-word]'), bank = box.querySelector('[data-bank]');
    const words = trickyWords();
    let cur = null;
    bank.innerHTML = words.map(w=>`<span class="bw en" data-bw="${esc(w)}">${esc(w)}</span>`).join('');
    const paint = () => {
      const s = got('tricky');
      bank.querySelectorAll('.bw').forEach(e=>{
        e.classList.toggle('seen', s.has(e.dataset.bw));
        e.classList.toggle('now', e.dataset.bw===cur);
      });
      box.querySelector('[data-cnt]').textContent = s.size+' / '+words.length;
    };
    const next = () => {
      const s = got('tricky');
      const fresh = words.filter(w=>!s.has(w) && w!==cur);
      cur = fresh.length ? rnd(fresh) : rnd(words.filter(w=>w!==cur).concat(words));
      el.textContent = cur; paint(); speak(cur);
    };
    box.addEventListener('click', ev => {
      const a = ev.target.closest('[data-d]')?.dataset.d;
      if(a==='know' && cur){ got('tricky').add(cur); saveSeen(); next(); }
      if(a==='again'){ got('tricky').delete(cur); saveSeen(); next(); }
      if(a==='say' && cur) speak(cur);
      if(a==='reset'){ seen['tricky']=new Set(); saveSeen(); paint(); }
    });
    next();
  })(root.querySelector('[data-drill="tricky"]'));

  /* — диктант — */
  (box => {
    const el = box.querySelector('[data-word]');
    const pool = drillWords('me');
    let cur = null;
    const next = () => { cur = rnd(pool); el.textContent=cur; el.classList.add('hide'); speak(cur); };
    box.addEventListener('click', ev => {
      const a = ev.target.closest('[data-d]')?.dataset.d;
      if(a==='play' && cur) speak(cur);
      if(a==='show') el.classList.remove('hide');
      if(a==='next') next();
    });
    next();
  })(root.querySelector('[data-drill="dictation"]'));

  /* — пары гласных — */
  (box => {
    const picks = box.querySelector('[data-groups]'), row = box.querySelector('[data-pairbox]');
    const tip = box.querySelector('[data-tip]'), score = box.querySelector('[data-score]');
    let gi = 0, pair = null, target = null, right = 0, total = 0;
    picks.innerHTML = MIN_PAIRS.map((g,i)=>`<button class="pk${i?'':' on'} en" data-g="${i}">${esc(g.t)}</button>`).join('');
    const next = () => {
      const g = MIN_PAIRS[gi];
      pair = rnd(g.p); target = rnd(pair);
      tip.textContent = g.hint;
      row.innerHTML = pair.map(w=>`<button class="pwbtn en" data-w="${esc(w)}">${esc(w)}</button>`).join('');
      setTimeout(()=>speak(target), 260);
    };
    const mark = () => { score.textContent = total ? `Угадано ${right} из ${total}` : ''; };
    box.addEventListener('click', ev => {
      const g = ev.target.closest('[data-g]');
      if(g){ gi=+g.dataset.g; picks.querySelectorAll('.pk').forEach((b,i)=>b.classList.toggle('on', i===gi));
        right=0; total=0; mark(); next(); return; }
      const w = ev.target.closest('[data-w]');
      if(w && target){
        total++; const ok = w.dataset.w===target;
        if(ok) right++;
        w.classList.add(ok?'ok':'no');
        row.querySelectorAll('.pwbtn').forEach(b=>b.disabled=true);
        if(!ok) row.querySelector(`[data-w="${CSS.escape(target)}"]`)?.classList.add('ok');
        mark();
        setTimeout(next, 1100);
        return;
      }
      const a = ev.target.closest('[data-d]')?.dataset.d;
      if(a==='play' && target) speak(target);
      if(a==='next') next();
    });
    next();
  })(root.querySelector('[data-drill="pairs"]'));
}

/* ==================== НАСТРОЙКИ ==================== */
const $ = id => document.getElementById(id);
const sheet = $('sheet'), scrim = $('scrim');
$('gear').onclick = () => { sheet.classList.add('on'); scrim.classList.add('on'); };
$('close').onclick = closeSheet; scrim.onclick = closeSheet;
function closeSheet(){ sheet.classList.remove('on'); scrim.classList.remove('on'); }
function setStat(t,k){ const s=$('stat'); if(!s) return; s.textContent=t; s.className='stat'+(k?' '+k:''); }

$('mute').onclick = function(){ audioOn=!audioOn; this.classList.toggle('on',audioOn);
  this.textContent = audioOn?'🔊':'🔇'; if(!audioOn) stopAudio(); LS.set('audio',audioOn); };
$('rate').oninput = function(){ rate=this.value/100; LS.set('rate',rate); labelRate(); };
/* Файлы уже записаны медленнее обычной речи, поэтому подписываем не множитель
   ползунка, а то, что получится на выходе — иначе «1,00×» читалось бы как
   «обычный темп», хотя это совсем не он. */
function labelRate(){
  const eff = BAKED * rate;
  $('ratelbl').textContent = eff.toFixed(2) + '× от обычной речи — ' +
    (eff < .6 ? 'очень медленно, буква за буквой'
     : eff < .78 ? 'темп занятия, как записано'
     : eff < .95 ? 'бодрее, для беглого чтения'
     : 'обычная речь');
}
$('test').onclick = () => speak(EXTRA_SAY[0]);

/* ==================== СТАРТ ==================== */
(async () => {
  const s = LS.get('seen',{}); for(const k in s) seen[k]=new Set(s[k]);
  fluent = new Set(LS.get('fluent',[]));
  audioOn = LS.get('audio',true);
  rate    = LS.get('rate',1);
  $('rate').value = Math.round(rate*100);
  $('mute').classList.toggle('on',audioOn); $('mute').textContent = audioOn?'🔊':'🔇';

  // Свой манифест — тот, что уехал с деплоем; копия в бакете спасает, если
  // озвучку пересобрали, а хостинг ещё не выкатили.
  for(const src of ['audio/manifest.json', MANIFEST_FALLBACK]){
    try{
      const r = await fetch(src,{cache:'no-cache'});
      if(!r.ok) continue;
      const j = await r.json();
      MANIFEST = j.files || j;
      BAKED = Number(j.speed) || 1;
      if(MANIFEST && Object.keys(MANIFEST).length) break;
    }catch(e){}
  }

  labelRate();
  document.querySelectorAll('[data-spin]').forEach(initSpin);
  document.querySelectorAll('[data-pair]').forEach(initPair);
  const drillPane = document.getElementById('x-drill');
  if(drillPane) initDrill(drillPane);
  renderCards();
  paintFluent();
  show(GROUPS.some(g=>g.id===LS.get('tab')) ? LS.get('tab') : 'start');

  if(MANIFEST) setStat('Слова читает Sophia. Записей: '+Object.keys(MANIFEST).length+'. После первого прохода набор работает офлайн.','ok');
  else setStat('Файлы озвучки не найдены — работает голос браузера. Соберите её: npm run audio.','err');

  try{ speechSynthesis.getVoices(); }catch(e){}
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))
    navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
