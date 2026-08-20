import { GROUPS, CARDS, phrasesOf, EXTRA_SAY } from './data.js';
import { art } from './art.js';

/* ==================== СОСТОЯНИЕ ==================== */
const LS = {
  get(k, d){ try{ const v = localStorage.getItem('vio.'+k); return v===null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('vio.'+k, JSON.stringify(v)); }catch(e){} }
};
let seen = {}, audioOn = true, rate = 1;
let MANIFEST = null;                       // {текст: URL в Cloud Storage} из audio/manifest.json
let BAKED = 1;                             // темп, с которым записаны файлы — из манифеста
let player = null, timer = null, actx = null;
const got = id => (seen[id] ||= new Set());
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

function saveSeen(){ const o={}; for(const k in seen) o[k]=[...seen[k]]; LS.set('seen',o); }

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

function speak(text){
  if(!audioOn || !text) return;
  const key = text.trim();
  const url = MANIFEST && MANIFEST[key];
  if(url) playUrl(url); else browserSay(key);
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
function split(w){
  let i=1; while(i<w.length && V.indexOf(w[i].toLowerCase())<0) i++;
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
  p.innerHTML = g.kind==='start' ? startHTML() : g.kind==='cards' ? cardsHTML() : groupHTML(g);
  panes.appendChild(p);
});

function show(id){
  document.querySelectorAll('.pane').forEach(p=>p.classList.toggle('on',p.id==='x-'+id));
  document.querySelectorAll('.seg').forEach(s=>s.classList.toggle('on',s.dataset.go===id));
  const s=document.querySelector('.seg.on'); if(s) s.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});
  window.scrollTo({top:0,behavior:'smooth'}); stopAudio(); clearInterval(timer);
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
    ${[['1','Набор 1','Text 1'],['2','Набор 2','Text 2'],['3–4','Набор 3','Text 3'],['5','Набор 4','Text 4'],
       ['6','Повтор 1–4','проверка'],['7–8','th','Text 5'],['9','ch','Text 6'],['10','sh','Text 7'],
       ['11','ph','Text 8–9'],['12','Немая e','Text 10–12']]
      .map(([n,t,x])=>`<div class="wk"><div class="n">${n} нед.</div><div class="t">${t}</div><div class="x">${x}</div></div>`).join('')}
  </div>
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
    <p class="sub" style="margin-bottom:11px">Три прохода по каждому столбику, и только потом — строками.</p>${colsHTML(g.cols)}</div>`;
  if(g.extra) h += `<div class="card"><h2 class="sec">${esc(g.extra.t)}</h2>${colsHTML(g.extra.cols)}</div>`;
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
function colsHTML(cols){ return `<div class="cols">${cols.map(([head,ipa,ws])=>`<div class="col">
  <div class="chead"><span class="en">${esc(head)}</span>${ipa?`<i>${esc(ipa)}</i>`:''}</div>
  ${ws.map(w=>`<button class="word en" data-say="${esc(w)}">${esc(w)}</button>`).join('')}
  <button class="walk" data-walk>▶ Пройти</button></div>`).join('')}</div>`; }

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
  <ol class="qs">${s.q.map(q=>`<li>${esc(q)}</li>`).join('')}</ol>
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
  function blend(w){
    const parts=split(w); let i=0;
    const step=()=>{
      pips.forEach(p=>p.classList.remove('a')); tiles.forEach(t=>t.style.transform='');
      if(i<3){ pips[i].classList.add('a'); tiles[i].style.transform='translateY(-7px) scale(1.06)'; i++; setTimeout(step,700); }
      else { bigEl.classList.remove('bump'); void bigEl.offsetWidth; bigEl.classList.add('bump'); speak(w); }
    }; step();
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
  const s = ev.target.closest('[data-say]');
  if(s){ speak(s.dataset.say);
    if(s.classList.contains('word')) s.classList.add('done');
    if(s.classList.contains('ln')){ document.querySelectorAll('.ln.lit').forEach(l=>l.classList.remove('lit')); s.classList.add('lit'); } }

  const wb = ev.target.closest('[data-walk]');
  if(wb){ const col=wb.closest('.col'), ws=[...col.querySelectorAll('.word')];
    clearInterval(timer); ws.forEach(w=>w.classList.remove('lit'));
    if(wb.dataset.on){ wb.dataset.on=''; wb.textContent='▶ Пройти'; return; }
    document.querySelectorAll('[data-walk]').forEach(b=>{b.dataset.on='';b.textContent='▶ Пройти';});
    wb.dataset.on='1'; wb.textContent='⏸ Стоп'; let i=0;
    const t=()=>{ ws.forEach(w=>w.classList.remove('lit'));
      if(i>=ws.length){ clearInterval(timer); wb.dataset.on=''; wb.textContent='▶ Пройти'; return; }
      ws[i].classList.add('lit'); speak(ws[i].textContent); i++; };
    t(); timer=setInterval(t,2600); }

  const rd = ev.target.closest('[data-read]');
  if(rd){ const ls=[...rd.closest('.story').querySelectorAll('.ln')]; clearInterval(timer); let i=0;
    const t=()=>{ ls.forEach(l=>l.classList.remove('lit'));
      if(i>=ls.length){ clearInterval(timer); return; }
      ls[i].classList.add('lit'); speak(ls[i].dataset.say); i++; };
    t(); timer=setInterval(t,3300); }

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
  renderCards();
  show(GROUPS.some(g=>g.id===LS.get('tab')) ? LS.get('tab') : 'start');

  if(MANIFEST) setStat('Слова читает Sophia. Записей: '+Object.keys(MANIFEST).length+'. После первого прохода набор работает офлайн.','ok');
  else setStat('Файлы озвучки не найдены — работает голос браузера. Соберите её: npm run audio.','err');

  try{ speechSynthesis.getVoices(); }catch(e){}
  if('serviceWorker' in navigator && location.protocol.startsWith('http'))
    navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
