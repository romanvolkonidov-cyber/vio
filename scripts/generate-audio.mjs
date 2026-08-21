#!/usr/bin/env node
/**
 * Разовая генерация озвучки: ElevenLabs -> Firebase Storage.
 *
 *   npm run audio:dry     план и стоимость, ничего не тратит
 *   npm run audio         сгенерировать недостающее и залить в бакет
 *   npm run audio -- --force    перегенерировать всё заново
 *   npm run audio -- --limit=3  проверить связку на трёх файлах
 *   npm run audio -- --speed=0.6            темп чтения (1.0 — как говорит модель)
 *   npm run audio -- --voice=<id> --force   сменить голос и перезаписать всё
 *
 * Что происходит:
 *   1. collectPhrases() из data.js даёт список всех озвучиваемых строк;
 *   2. каждая новая строка идёт в ElevenLabs, потом через ffmpeg
 *      выравнивается по громкости (EBU R128) — иначе слова звучат
 *      то тише, то громче, и ребёнок крутит ручку вместо чтения;
 *   3. mp3 кладётся в бакет `audio/<слово>-<хеш>.mp3` и открывается на чтение;
 *   4. public/audio/manifest.json получает {строка: абсолютный URL}.
 *
 * Файлы живут в Cloud Storage, а не в public/ — деплой хостинга их не трогает
 * и не перезаписывает. `firebase deploy` можно гонять сколько угодно.
 *
 * Хеш содержимого в имени: перегенерированный файл обязан получить новый URL,
 * иначе CDN ещё год будет отдавать старые байты.
 *
 * Локальные копии в public/audio/ — просто кэш, чтобы повторный запуск не
 * тратил кредиты. В git они не идут, source of truth — бакет и манифест.
 *
 * Ключи (.env в корне, в git не попадает):
 *   ELEVENLABS_API_KEY=sk_...
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT     = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR  = path.join(ROOT, 'public', 'audio');
const MANIFEST = path.join(OUT_DIR, 'manifest.json');

// .env читаем сами — ради одной строчки тянуть dotenv незачем.
for (const line of (fs.existsSync(path.join(ROOT, '.env'))
  ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n') : [])) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const argv  = process.argv.slice(2);
const flag  = n => argv.includes('--' + n);
const value = (n, d) => (argv.find(a => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');

const API_KEY   = process.env.ELEVENLABS_API_KEY;
const BUCKET    = value('bucket', process.env.FIREBASE_STORAGE_BUCKET || 'violet-3e5a8.firebasestorage.app');
const PROJECT   = value('project', process.env.GOOGLE_CLOUD_PROJECT || 'violet-3e5a8');
const VOICE     = value('voice', 'LM5QaByxyWDmNhcQTYiS');   // Sophia — polished RP
// Язык задаётся явно и не обсуждается. eleven_multilingual_v2 угадывал его сам
// и на коротком слове угадывал неверно: немая e переставала быть немой, cape
// читалось как «капе», note как «нота», robe как «Räuber».
//
// Важно, что на multilingual параметр language_code не спасает — модель его
// молча игнорирует. Нужна модель, которая язык действительно принимает:
// flash_v2_5 его соблюдает, поэтому en проставлен жёстко.
const MODEL     = value('model', 'eleven_flash_v2_5');
const LANG      = value('lang', 'en');
const PREFIX    = 'audio/';
// ElevenLabs принимает speed только от 0.7 до 1.2 — на 0.65 отвечает 400.
// Всё, что медленнее, рендерим на 0.7 и дотягиваем rubberband при сборке:
// он тянет длительность, не трогая высоту голоса. Это заметно чище, чем
// playbackRate в браузере, который растягивает уже на лету, на каждом слове.
const API_SPEED_FLOOR = 0.7;
const SPEED     = Math.min(1.2, Math.max(0.3, Number(value('speed', 0.7)) || 0.7));
const API_SPEED = Math.max(SPEED, API_SPEED_FLOOR);
const STRETCH   = SPEED < API_SPEED_FLOOR ? SPEED / API_SPEED_FLOOR : 1;
const PARALLEL  = Math.max(1, Number(value('parallel', 3)) || 3);
const LIMIT     = Number(value('limit', 0)) || Infinity;   // проверить связку на паре файлов
const DRY       = flag('dry');
const FORCE     = flag('force');

// Замерено по заголовку character-cost, который приходит на каждый ответ:
// 3 символа -> 1 кредит, 15 -> 4, 22 -> 6, 44 -> 12. То есть примерно 0,27
// кредита на символ, а не 1. Точный счёт всё равно печатается по факту внизу.
const CREDITS_PER_CHAR = { eleven_multilingual_v2: 0.27, eleven_v3: 0.27,
  eleven_turbo_v2: 0.14, eleven_flash_v2: 0.14, eleven_flash_v2_5: 0.14, eleven_turbo_v2_5: 0.14 };

// Имя файла — читаемый слаг плюс хвост от хеша: слаг обрезан до 60 символов и
// без хвоста две разные строки рассказа могут дать одно имя. В хеш входят и
// голос с темпом — иначе локальный кэш отдал бы прошлую озвучку той же фразы,
// записанную кем-то другим, и полкурса осталось бы старым голосом.
const sha = (s, n) => crypto.createHash('sha1').update(s).digest('hex').slice(0, n);
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
const nameOf = k => `${slug(k)}-${sha(`${k}@${VOICE}@${MODEL}@${SPEED}@${LANG}`, 6)}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ElevenLabs возвращает списанное на каждый ответ — считаем по факту, а не по оценке.
let spent = 0;

// У fetch в node таймаута нет: один зависший запрос останавливает весь прогон
// молча — процесс жив, файлы не пишутся. Однажды так и вышло на 710-й записи.
const TIMEOUT_MS = 45000;
const withTimeout = (ms) => AbortSignal.timeout(ms);

async function tts(text, attempt = 1){
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    signal: withTimeout(TIMEOUT_MS),
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      language_code: LANG,
      // Учебное чтение хочет ровно и чётко, а не выразительно: низкая
      // стабильность заставляет модель «играть», и на одном коротком слове
      // это выходит как случайное ударение.
      voice_settings: { stability: 0.8, similarity_boost: 0.85, style: 0, use_speaker_boost: false, speed: API_SPEED }
    })
  });
  if (!r.ok) {
    if ((r.status === 429 || r.status >= 500) && attempt < 5) {
      await sleep(900 * attempt);
      return tts(text, attempt + 1);
    }
    throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 140)}`);
  }
  spent += Number(r.headers.get('character-cost') || 0);
  return Buffer.from(await r.arrayBuffer());
}

/**
 * Подрезать паузы по краям и выровнять громкость ОДНИМ статическим усилением.
 *
 * Здесь нельзя брать loudnorm, хотя он напрашивается. Слово «sat» длится 0,7 с
 * и наполовину состоит из тишины, поэтому интегрированная громкость у него
 * выходит −30 LUFS — не потому, что запись тихая, а потому, что короткая.
 * loudnorm верит этой цифре, тянет до −16 LUFS, то есть добавляет +12…+20 дБ
 * динамическим усилением, упирает пик в потолок и по дороге вытаскивает
 * придыхание и шум кодека, а взрывные /p/ /t/ /k/ — расплющивает. Именно их
 * метод и ставит, так что это была не мелочь, а порча материала.
 *
 * Средний уровень у всех фраз одного голоса и так лежит в пределах пары дБ,
 * поэтому достаточно сдвинуть каждую к −24 дБ и проследить, чтобы пик не
 * перевалил −1 дБ. Динамика остаётся нетронутой.
 */
const TARGET_MEAN_DB = -24;
const PEAK_CEILING_DB = -1;

function clean(buffer){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vio-clean-'));
  const at = n => path.join(dir, n);
  try {
    fs.writeFileSync(at('in.mp3'), buffer);
    let src = at('in.mp3');
    if (STRETCH !== 1) {
      execFileSync('ffmpeg', ['-y', '-i', src, '-af',
        `rubberband=tempo=${STRETCH.toFixed(4)}:pitchq=quality`, at('r.wav')], { stdio: 'ignore' });
      src = at('r.wav');
    }
    // ElevenLabs оставляет по полсекунды воздуха с обоих концов: слово по клику
    // должно звучать сразу, а в столбике они идут подряд.
    execFileSync('ffmpeg', ['-y', '-i', src, '-af',
      'silenceremove=start_periods=1:start_silence=0.06:start_threshold=-45dB:detection=peak,' +
      'areverse,silenceremove=start_periods=1:start_silence=0.10:start_threshold=-45dB:detection=peak,areverse',
      at('t.wav')], { stdio: 'ignore' });

    // volumedetect пишет в stderr, поэтому spawnSync.
    const probe = spawnSync('ffmpeg', ['-i', at('t.wav'), '-af', 'volumedetect', '-f', 'null', '-'],
      { encoding: 'utf8' }).stderr;
    const mean = parseFloat(probe.match(/mean_volume:\s*(-?[\d.]+)/)[1]);
    const peak = parseFloat(probe.match(/max_volume:\s*(-?[\d.]+)/)[1]);
    const gain = Math.min(TARGET_MEAN_DB - mean, PEAK_CEILING_DB - peak);

    execFileSync('ffmpeg', ['-y', '-i', at('t.wav'), '-af', `volume=${gain.toFixed(2)}dB`,
      '-c:a', 'libmp3lame', '-q:a', '4', at('out.mp3')], { stdio: 'ignore' });
    return fs.readFileSync(at('out.mp3'));
  } catch {
    return buffer;                      // без ffmpeg лучше неровный звук, чем никакого
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Растянутая копия для слияния. Ребёнок должен услышать, как звуки перетекают
 * друг в друга — «сссаааат», — а не готовое слово: слияние и есть тот навык,
 * ради которого метод называется синтетическим.
 *
 * Тянем уже готовую запись, а не просим синтез ещё раз: во-первых, ElevenLabs
 * ниже 0,7 всё равно не пойдёт, во-вторых, так это ничего не стоит.
 */
const BLEND_TEMPO = 0.5;

function stretchForBlend(buffer){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vio-blend-'));
  const at = n => path.join(dir, n);
  try {
    fs.writeFileSync(at('in.mp3'), buffer);
    execFileSync('ffmpeg', ['-y', '-i', at('in.mp3'), '-af',
      `rubberband=tempo=${BLEND_TEMPO}:pitchq=quality`, at('s.wav')], { stdio: 'ignore' });
    const probe = spawnSync('ffmpeg', ['-i', at('s.wav'), '-af', 'volumedetect', '-f', 'null', '-'],
      { encoding: 'utf8' }).stderr;
    const mean = parseFloat(probe.match(/mean_volume:\s*(-?[\d.]+)/)[1]);
    const peak = parseFloat(probe.match(/max_volume:\s*(-?[\d.]+)/)[1]);
    const gain = Math.min(TARGET_MEAN_DB - mean, PEAK_CEILING_DB - peak);
    execFileSync('ffmpeg', ['-y', '-i', at('s.wav'), '-af', `volume=${gain.toFixed(2)}dB`,
      '-c:a', 'libmp3lame', '-q:a', '4', at('out.mp3')], { stdio: 'ignore' });
    return fs.readFileSync(at('out.mp3'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function openBucket(){
  const { initializeApp, applicationDefault, cert } = await import('firebase-admin/app');
  const { getStorage } = await import('firebase-admin/storage');
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credential = keyFile && fs.existsSync(path.resolve(ROOT, keyFile))
    ? cert(JSON.parse(fs.readFileSync(path.resolve(ROOT, keyFile), 'utf8')))
    : applicationDefault();
  initializeApp({ credential, projectId: PROJECT, storageBucket: BUCKET });
  return getStorage().bucket(BUCKET);
}

/**
 * Файлы отдаются с storage.googleapis.com, то есть с чужого для сайта origin.
 * Плееру CORS не нужен, а предзагрузке набора — нужен, иначе fetch отвалится
 * и первое слово каждого столбика будет ждать сеть.
 */
async function ensureCors(bucket){
  try {
    const [md] = await bucket.getMetadata();
    const ok = (md.cors || []).some(r => (r.origin || []).includes('*') && (r.method || []).includes('GET'));
    if (!ok) await bucket.setCorsConfiguration([
      { origin: ['*'], method: ['GET', 'HEAD'], responseHeader: ['Content-Type'], maxAgeSeconds: 3600 }]);
  } catch (e) {
    console.warn(`CORS настроить не вышло (${e.message.slice(0, 80)}). Звук играть будет, предзагрузка — нет.`);
  }
}

async function main(){
  const { collectAudio } = await import(pathToFileURL(path.join(ROOT, 'public', 'assets', 'data.js')).href);
  // Слияние делается из обычной записи того же слова, поэтому идёт последним.
  const phrases = collectAudio().sort((a, b) => (a.kind === 'blend') - (b.kind === 'blend'));

  await fsp.mkdir(OUT_DIR, { recursive: true });
  let manifest = {};
  let restyled = null;
  if (!FORCE) {
    try {
      const prev = JSON.parse(await fsp.readFile(MANIFEST, 'utf8'));
      // Сменили голос, модель или темп — старые файлы больше не подходят, даже
      // если текст тот же. Без этой проверки --dry честно скажет «всё готово»,
      // и половина курса останется прежним голосом.
      const was = `${prev.voice} ${prev.model} ${prev.speed ?? 1} ${prev.lang ?? 'en'}`;
      const now = `${VOICE} ${MODEL} ${SPEED} ${LANG}`;
      if (was === now) manifest = prev.files || {};
      else restyled = `${prev.voice} @ ${prev.speed ?? 1}× → ${VOICE} @ ${SPEED}×`;
    } catch {}
  }

  const bucket = DRY ? null : await openBucket();
  if (bucket) await ensureCors(bucket);

  // Один листинг вместо 424 проверок: манифест верим только если файл реально лежит.
  let inBucket = new Set();
  if (bucket) {
    const [files] = await bucket.getFiles({ prefix: PREFIX });
    inBucket = new Set(files.map(f => f.name));
  }
  const objectOf = url => { try { return decodeURIComponent(new URL(url).pathname.split(`/${BUCKET}/`)[1] || ''); } catch { return ''; } };

  const plan = phrases.filter(j => {
    const url = manifest[j.key];
    if (!url) return true;
    return bucket ? !inBucket.has(objectOf(url)) : false;
  }).slice(0, LIMIT);

  // Растянутые копии кредитов не стоят — в оценку не идут.
  const chars   = plan.filter(j => j.kind !== 'blend').reduce((s, j) => s + j.text.length, 0);
  const credits = Math.round(chars * (CREDITS_PER_CHAR[MODEL] ?? 1));
  if (restyled) console.log(`Голос или темп изменились: ${restyled}\n  → переозвучиваем всё.\n`);
  const count = k => plan.filter(j => j.kind === k).length;
  console.log(`Записей всего:   ${phrases.length}`);
  console.log(`Нужно сделать:   ${plan.length}  (${chars} символов через API)`);
  console.log(`  из них слов:   ${count('speech')} · звуков: ${count('sound')} · слияний: ${count('blend')} (бесплатно)`);
  console.log(`Модель / голос:  ${MODEL} / ${VOICE}   язык: ${LANG}`);
  console.log(`Темп:            ${SPEED}×` + (STRETCH !== 1
    ? `  (ElevenLabs ${API_SPEED}× + rubberband ${STRETCH.toFixed(3)}×)` : '  (нативно у модели)'));
  console.log(`Бакет:           gs://${BUCKET}/${PREFIX}`);
  console.log(`Оценка:          ~${credits} кредитов\n`);

  if (DRY)          { console.log('--dry: ничего не сгенерировано.'); return; }
  if (!API_KEY && plan.length) { console.error('Нет ELEVENLABS_API_KEY. См. .env.example'); process.exit(1); }

  const failed = [];
  let done = 0;
  const write = () => fsp.writeFile(MANIFEST, JSON.stringify(
    { voice: VOICE, model: MODEL, speed: SPEED, lang: LANG, bucket: BUCKET, generated: new Date().toISOString(), files: manifest }, null, 2) + '\n');

  /** Исходник для слияния: сначала соседний файл, иначе тянем из бакета. */
  async function sourceFor(word){
    const local = path.join(OUT_DIR, nameOf(word) + '.mp3');
    if (fs.existsSync(local)) return fsp.readFile(local);
    const url = manifest[word];
    if (url) {
      const r = await fetch(url, { signal: withTimeout(TIMEOUT_MS) });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    }
    // Слова ещё нет — запишем его сейчас, слияние соберётся из свежей записи.
    const buffer = clean(await tts(word));
    await fsp.writeFile(local, buffer);
    return buffer;
  }

  async function one(job){
    const local = path.join(OUT_DIR, nameOf(job.key) + '.mp3');
    let buffer;
    // Локальная копия — кэш. Файл пропал из бакета, но лежит рядом? Заливаем
    // его же, без нового запроса: кредиты тратим только на реально новое.
    if (!FORCE && fs.existsSync(local)) buffer = await fsp.readFile(local);
    else {
      buffer = job.kind === 'blend'
        ? stretchForBlend(await sourceFor(job.text))
        : clean(await tts(job.text));
      await fsp.writeFile(local, buffer);
    }

    const object = `${PREFIX}${nameOf(job.key)}-${sha(buffer, 8)}.mp3`;
    const f = bucket.file(object);
    if (!inBucket.has(object)) {
      await f.save(buffer, { metadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' } });
      await f.makePublic();
    }
    manifest[job.key] = `https://storage.googleapis.com/${BUCKET}/${object}`;
  }

  // Пишем манифест по ходу: обрыв связи не теряет уже оплаченное.
  const queue = [...plan];
  await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
    while (queue.length) {
      const job = queue.shift();
      try {
        await one(job);
        done++;
        process.stdout.write(`\r  ${done}/${plan.length}  ${job.key.slice(0, 40).padEnd(42)}`);
        await write();
      } catch (e) {
        failed.push({ text: job.key, error: e.message });
      }
      await sleep(job.kind === 'blend' ? 0 : 120);
    }
  }));
  if (plan.length) console.log('\n');

  await write();

  // Манифест в бакет тоже — так у аудио и его оглавления один источник.
  const mf = bucket.file(`${PREFIX}manifest.json`);
  await mf.save(await fsp.readFile(MANIFEST), { metadata: { contentType: 'application/json', cacheControl: 'public, max-age=300' } });
  await mf.makePublic();

  // Чистим осиротевшее: перегенерация даёт новое имя, старое иначе копится.
  // Но только после полного прохода: при --limit манифест заведомо неполный,
  // и уборка по нему снесла бы всё, что в этот раз просто не очередь.
  if (LIMIT === Infinity && !failed.length) {
    const keep = new Set([...Object.values(manifest).map(objectOf), `${PREFIX}manifest.json`]);
    const [now] = await bucket.getFiles({ prefix: PREFIX });
    const stale = now.filter(f => !keep.has(f.name));
    for (const f of stale) await f.delete().catch(() => {});
    if (stale.length) console.log(`Удалено устаревших файлов в бакете: ${stale.length}`);
  }

  if (failed.length) {
    console.warn(`Не получилось: ${failed.length}. Запустите скрипт ещё раз — догенерирует.`);
    failed.slice(0, 5).forEach(f => console.warn(`  · "${f.text}" — ${f.error}`));
  }
  console.log(`Готово. Записей: ${Object.keys(manifest).length} из ${phrases.length}. Списано кредитов: ${spent}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
