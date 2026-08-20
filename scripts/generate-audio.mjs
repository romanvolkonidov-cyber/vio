#!/usr/bin/env node
/**
 * Разовая генерация озвучки: ElevenLabs -> Firebase Storage.
 *
 *   npm run audio:dry     план и стоимость, ничего не тратит
 *   npm run audio         сгенерировать недостающее и залить в бакет
 *   npm run audio -- --force    перегенерировать всё заново
 *   npm run audio -- --limit=3  проверить связку на трёх файлах
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
import { execFileSync } from 'node:child_process';
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
const VOICE     = value('voice', 'qQbLjdSnI72C56rrOF87');   // Joana
const MODEL     = value('model', 'eleven_multilingual_v2');
const PREFIX    = 'audio/';
const PARALLEL  = Math.max(1, Number(value('parallel', 3)) || 3);
const LIMIT     = Number(value('limit', 0)) || Infinity;   // проверить связку на паре файлов
const DRY       = flag('dry');
const FORCE     = flag('force');

const CREDITS_PER_CHAR = { eleven_multilingual_v2: 1, eleven_v3: 1, eleven_flash_v2_5: 0.5, eleven_turbo_v2_5: 0.5 };
const USD_PER_CREDIT   = 0.000364;   // по замеру: 58 кредитов ≈ $0.021

// Имя файла — читаемый слаг плюс хвост от хеша текста: слаг обрезан до 60
// символов и без хвоста две разные строки рассказа могут дать одно имя.
const sha = (s, n) => crypto.createHash('sha1').update(s).digest('hex').slice(0, n);
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
const nameOf = t => `${slug(t)}-${sha(t, 6)}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function tts(text, attempt = 1){
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      // Учебное чтение хочет ровно и чётко, а не выразительно: низкая
      // стабильность заставляет модель «играть», и на одном коротком слове
      // это выходит как случайное ударение.
      voice_settings: { stability: 0.8, similarity_boost: 0.85, style: 0, use_speaker_boost: true }
    })
  });
  if (!r.ok) {
    if ((r.status === 429 || r.status >= 500) && attempt < 5) {
      await sleep(900 * attempt);
      return tts(text, attempt + 1);
    }
    throw new Error(`HTTP ${r.status} ${(await r.text()).slice(0, 140)}`);
  }
  return Buffer.from(await r.arrayBuffer());
}

/** Одна громкость на всю озвучку: разные фразы иначе звучат по-разному. */
function normalize(buffer){
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vio-norm-'));
  try {
    const raw = path.join(dir, 'in.mp3'), out = path.join(dir, 'out.mp3');
    fs.writeFileSync(raw, buffer);
    execFileSync('ffmpeg', ['-y', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-c:a', 'libmp3lame', '-q:a', '4', out], { stdio: 'ignore' });
    return fs.readFileSync(out);
  } catch {
    return buffer;                      // без ffmpeg лучше неровный звук, чем никакого
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
  const { collectPhrases } = await import(pathToFileURL(path.join(ROOT, 'public', 'assets', 'data.js')).href);
  const phrases = collectPhrases();

  await fsp.mkdir(OUT_DIR, { recursive: true });
  let manifest = {};
  if (!FORCE) { try { manifest = JSON.parse(await fsp.readFile(MANIFEST, 'utf8')).files || {}; } catch {} }

  const bucket = DRY ? null : await openBucket();
  if (bucket) await ensureCors(bucket);

  // Один листинг вместо 424 проверок: манифест верим только если файл реально лежит.
  let inBucket = new Set();
  if (bucket) {
    const [files] = await bucket.getFiles({ prefix: PREFIX });
    inBucket = new Set(files.map(f => f.name));
  }
  const objectOf = url => { try { return decodeURIComponent(new URL(url).pathname.split(`/${BUCKET}/`)[1] || ''); } catch { return ''; } };

  const plan = phrases.filter(t => {
    const url = manifest[t];
    if (!url) return true;
    return bucket ? !inBucket.has(objectOf(url)) : false;
  }).slice(0, LIMIT);

  const chars   = plan.reduce((s, t) => s + t.length, 0);
  const credits = Math.round(chars * (CREDITS_PER_CHAR[MODEL] ?? 1));
  console.log(`Фраз всего:      ${phrases.length}`);
  console.log(`Нужно озвучить:  ${plan.length}  (${chars} символов)`);
  console.log(`Модель / голос:  ${MODEL} / ${VOICE}`);
  console.log(`Бакет:           gs://${BUCKET}/${PREFIX}`);
  console.log(`Оценка:          ~${credits} кредитов ≈ $${(credits * USD_PER_CREDIT).toFixed(2)}\n`);

  if (DRY)          { console.log('--dry: ничего не сгенерировано.'); return; }
  if (!API_KEY && plan.length) { console.error('Нет ELEVENLABS_API_KEY. См. .env.example'); process.exit(1); }

  const failed = [];
  let done = 0;
  const write = () => fsp.writeFile(MANIFEST, JSON.stringify(
    { voice: VOICE, model: MODEL, bucket: BUCKET, generated: new Date().toISOString(), files: manifest }, null, 2) + '\n');

  async function one(text){
    const local = path.join(OUT_DIR, nameOf(text) + '.mp3');
    let buffer;
    // Локальная копия — кэш. Файл пропал из бакета, но лежит рядом? Заливаем
    // его же, без нового запроса: кредиты тратим только на реально новое.
    if (!FORCE && fs.existsSync(local)) buffer = await fsp.readFile(local);
    else { buffer = normalize(await tts(text)); await fsp.writeFile(local, buffer); }

    const object = `${PREFIX}${nameOf(text)}-${sha(buffer, 8)}.mp3`;
    const f = bucket.file(object);
    if (!inBucket.has(object)) {
      await f.save(buffer, { metadata: { contentType: 'audio/mpeg', cacheControl: 'public, max-age=31536000, immutable' } });
      await f.makePublic();
    }
    manifest[text] = `https://storage.googleapis.com/${BUCKET}/${object}`;
  }

  // Пишем манифест по ходу: обрыв связи не теряет уже оплаченное.
  const queue = [...plan];
  await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
    while (queue.length) {
      const text = queue.shift();
      try {
        await one(text);
        done++;
        process.stdout.write(`\r  ${done}/${plan.length}  ${text.slice(0, 40).padEnd(42)}`);
        await write();
      } catch (e) {
        failed.push({ text, error: e.message });
      }
      await sleep(120);
    }
  }));
  if (plan.length) console.log('\n');

  await write();

  // Манифест в бакет тоже — так у аудио и его оглавления один источник.
  const mf = bucket.file(`${PREFIX}manifest.json`);
  await mf.save(await fsp.readFile(MANIFEST), { metadata: { contentType: 'application/json', cacheControl: 'public, max-age=300' } });
  await mf.makePublic();

  // Чистим осиротевшее: перегенерация даёт новое имя, старое иначе копится.
  const keep = new Set([...Object.values(manifest).map(objectOf), `${PREFIX}manifest.json`]);
  const [now] = await bucket.getFiles({ prefix: PREFIX });
  const stale = now.filter(f => !keep.has(f.name));
  for (const f of stale) await f.delete().catch(() => {});
  if (stale.length) console.log(`Удалено устаревших файлов в бакете: ${stale.length}`);

  if (failed.length) {
    console.warn(`Не получилось: ${failed.length}. Запустите скрипт ещё раз — догенерирует.`);
    failed.slice(0, 5).forEach(f => console.warn(`  · "${f.text}" — ${f.error}`));
  }
  console.log(`Готово. Озвучено фраз: ${Object.keys(manifest).length} из ${phrases.length}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
