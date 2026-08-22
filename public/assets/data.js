// Учебные данные. Правится вручную — всё остальное строится отсюда.
const W = s => s.trim().split(/\s+/);

export const VOICE_DEFAULT = 'Xb7hH8MSUJpSbSDYk0k2'; // Alice — clear, engaging educator, en-GB

export const GROUPS = [
{ id:'today', nav:'⭐ Сегодня', c:'#3D7BFF', kind:'today', art:'sun' },

{ id:'set1', nav:'Неделя 1', sub:'s a t p i n', c:'#3D7BFF', soft:'#E7F0FF', kind:'g', art:'cat',
  num:'Набор 1', title:'s · a · t · p · i · n',
  lead:'Шесть звуков — и уже читаются настоящие слова. Названия букв не трогаем.',
  sounds:[['s','/s/','змея: ssss'],['a','/æ/','рот широко'],['t','/t/','язык на бугорке за зубами'],
    ['p','/p/','с придыханием'],['i','/ɪ/','короткий, расслабленный'],['n','/n/','на бугорке']],
  cols:[['a','/æ/',W('sat pat pan tap tan nap sap')],['i','/ɪ/',W('sit sip pit pin tip tin nip')]],
  spin:W('sat pat pan tap tan nap sap sit sip pit pin tip tin nip'),
  story:{ t:'Text 1 · Nan and Pip', art:'pan',
    l:['Nan sat.','Pip sat.','','Nan taps a pan.','Pip taps a tin.','Tap, tap, tap!','','Nan naps.','Pip naps.'],
    k:W('a'), q:['Who taps a pan?','Who taps a tin?','What do Nan and Pip do at the end?'], qRu:['Кто стучит по кастрюле?','Кто стучит по банке?','Что Нэн и Пип делают в конце?'] } },

{ id:'set2', nav:'Неделя 2', sub:'m d g o c k', c:'#22C55E', soft:'#E6F9ED', kind:'g', art:'dog',
  num:'Набор 2', title:'m · d · g · o · c · k',
  lead:'Появляется третья гласная. В таблице теперь три столбика.',
  sounds:[['m','/m/','губы вместе: mmm'],['d','/d/','язык на бугорке'],['g','/g/','коротко, из горла'],
    ['o','/ɒ/','губы кружком'],['c','/k/','коротко'],['k','/k/','тот же звук, что c']],
  cols:[['a','/æ/',W('mad map man mat dad gap gas cat can cap tag sad')],
    ['i','/ɪ/',W('did dig dip dim pig kid kit tin pin sit tip nip')],
    ['o','/ɒ/',W('dot dog cod cot got top pot pop mop nod cop cog')]],
  spin:W('mad map man mat dad dam gap gas cat can cap tag nag sad sag did dig dip dim pig kid kit tin pin sit tip sip pit nip dot dog cod cot got top pot pop mop nod cop cog'),
  story:{ t:'Text 2 · Tom the Cat', art:'cat',
    l:['Tom is a cat.','Tom sat on a mat.','','Dad got a map.','Dad got a cap.','','Tom naps on the map!','"Tom! It is not a mat!"','Tom is mad.'],
    k:W('is a the'), q:['Who is Tom?','What did Dad get?','Where does Tom nap?','Is Tom glad or mad?'], qRu:['Кто такой Том?','Что взял папа?','Где Том засыпает?','Том рад или сердит?'] } },

{ id:'set3', nav:'Неделя 3–4', sub:'ck e u r h b f l', c:'#FF9F1C', soft:'#FFF3E0', kind:'g', art:'bug',
  num:'Набор 3', title:'ck · e · u · r · h · b · f · l',
  lead:'Столбики e и u — самые трудные для русскоязычных детей. Им нужно больше проходов.',
  sounds:[['ck','/k/','две буквы — один звук'],['e','/e/','короткий «э»'],['u','/ʌ/','похож на «а», не «у»'],
    ['r','/r/','язык назад, не дрожит'],['h','/h/','лёгкий выдох'],['b','/b/','коротко'],
    ['f','/f/','зубы на губу: fff'],['l','/l/','светлый, на бугорке']],
  cols:[['a','/æ/',W('bad bag bat cab lad had ham hat fan fat ran back pack sack')],
    ['e','/e/',W('bed red leg ten net pet get hen beg den fed let peg neck')],
    ['i','/ɪ/',W('big bit dig fig fit hid him hip hit lid lip rib rid kick')],
    ['o','/ɒ/',W('cod cop cot dog fog hop hot log lot rob rod rock lock sock')],
    ['u','/ʌ/',W('bug bun bus but cub cup cut fun hug mud mug run sun duck')]],
  spin:W('bad bag bat cab lad had ham hat fan fat ran rag rat back pack sack rack bed red leg ten net pet get hen beg den fed led met set let peg neck peck deck big bit dig fig fit hid him hip hit lid lip lit rib rid rip kick pick lick sick tick cod cop cot dog fog hog hop hot log lot rob rod rock lock sock dock bug bun bus but cub cup cut dug fun gum hug hum hut mud mug nut rub rug run sun tub duck luck tuck'),
  story:{ t:'Text 3 · The Bug in the Mug', art:'bug',
    l:['Ben has a red mug.','A bug is in the mug!','','"Get up, bug!"','The bug is not sad.','The bug sits in the mug.','','Ben gets a big cup.','The bug hops in the cup.','Ben and the bug run and run.'],
    k:W('a the is has and'), q:['What is in the mug?','Is the bug sad?','What does Ben get?'], qRu:['Кто сидит в кружке?','Жучку грустно?','Что берёт Бен?'] } },

{ id:'set4', nav:'Неделя 5', sub:'j v w x y z qu', c:'#A855F7', soft:'#F4EAFE', kind:'g', art:'duck',
  num:'Набор 4', title:'j · v · w · x · y · z · qu  +  FLOSS',
  lead:'Главная развилка — v и w. Палец перед губами: /v/ чувствует зубы, /w/ получает поцелуй.',
  sounds:[['j','/dʒ/','«дж» одним движением'],['v','/v/','зубы на губу + голос'],['w','/w/','губы трубочкой'],
    ['x','/ks/','два звука сразу'],['y','/j/','как «й»'],['z','/z/','zzzz'],['qu','/kw/','всегда вдвоём']],
  cols:[['a','/æ/',W('jam jab jag wag yam yak zap zag van wax')],
    ['e','/e/',W('jet vet web wed yes yet vex bell well tell')],
    ['i','/ɪ/',W('zip zig wig win wit fix six mix jig fill')],
    ['o','/ɒ/',W('job jog jot box fox doll')],
    ['u','/ʌ/',W('jug jut yum buzz fuzz')]],
  extra:{ t:'FLOSS · в конце слова после краткой гласной удваиваются ff · ll · ss · zz',
    cols:[['-ff','',W('off puff cuff')],['-ll','',W('bell fill hill well tell doll')],
      ['-ss','',W('miss kiss less mess boss fuss')],['-zz','',W('buzz fizz jazz fuzz')]] },
  spin:W('jam jab jag wag yam yak zap zag van wax jet vet web wed yes yet vex zip zig wig win wit fix six mix jig job jog jot box fox jug jut yum quiz quit quack buzz fizz jazz bell well tell fill hill doll miss kiss less mess off puff cuff'),
  story:{ t:'Text 4 · Fun in the Sun', art:'duck',
    l:['It is hot. The sun is up.','Jack and Jill run up a hill.','','Jack has a stick.','Jill has a red box.','','A duck sits on a log.','Quack! Quack!','The duck runs off.','','Jack and Jill run back.','It was fun!'],
    k:W('the a was has and'), q:['Where do Jack and Jill run?','What has Jill got?','Who says "Quack"?'], qRu:['Куда бегут Джек и Джилл?','Что у Джилл в руках?','Кто говорит «кря»?'] } },

{ id:'drill', nav:'Неделя 6', sub:'повтор', c:'#0EA5E9', soft:'#E0F4FE', kind:'drill', art:'bug' },

{ id:'th', nav:'Неделя 7–8', sub:'th', c:'#FF4D6D', soft:'#FFEBEF', kind:'g', art:'moth',
  num:'Диграф 1', title:'th  =  /θ/ и /ð/',
  lead:'Этих звуков нет в русском. Ставим первым — ему нужно больше всего времени. Закладывайте две недели.',
  sounds:[['th','/θ/','язык между зубами, горло молчит'],['th','/ð/','язык между зубами, горло дрожит']],
  cols:[['i','/ɪ/',W('thin thick think thrill')],['a','/æ/',W('thank bath math path')],
    ['o','/ɒ/',W('moth cloth broth froth')],['e','/e/',W('tenth them then')]],
  extra:{ t:'th звонкий /ð/ · слова-помощники, учим узнаванием',
    cols:[['/ð/','',W('this that then them they the than')]] },
  spin:W('thin thick think thank thud thug this that them then than bath math path moth with cloth froth'),
  story:{ t:'Text 5 · Beth and Seth', art:'moth',
    l:['Beth and Seth run on a path.','The path is thin.','','"This is fun!" said Beth.','"That moth is big!" said Seth.','','The moth sits on a cloth.','Beth and Seth think.','Then... the moth is off!'],
    k:W('the a said then'), q:['Where do Beth and Seth run?','What is on the cloth?','Is the moth still there?'], qRu:['Где бегут Бет и Сет?','Кто сидит на тряпке?','Мотылёк всё ещё там?'] } },

{ id:'ch', nav:'Неделя 9', sub:'ch', c:'#06B6D4', soft:'#E4F8FC', kind:'g', art:'chick',
  num:'Диграф 2', title:'ch  =  /tʃ/',
  lead:'После th это отдых: звук в русском есть. Только твёрже — губы вперёд, как у поезда.',
  sounds:[['ch','/tʃ/','поезд: ch-ch-choo'],['tch','/tʃ/','после краткой гласной в конце']],
  cols:[['a','/æ/',W('chat chap catch match')],['e','/e/',W('check chess chest fetch bench')],
    ['i','/ɪ/',W('chip chin chick chill ditch rich')],['o','/ɒ/',W('chop chock')],
    ['u','/ʌ/',W('chum chug much such lunch munch')]],
  spin:W('chat chap chin chip chop chug chum chick check chess chill much such rich lunch munch bench catch match fetch ditch'),
  story:{ t:'Text 6 · Lunch', art:'chick',
    l:['It is lunch.','Chad sits on a bench.','','Chad has chips.','Munch, munch, munch!','','A chick runs up.','"Chip! Chip!"','"Catch it!" said Josh.','','Chad gets the chick a chip.','Such fun!'],
    k:W('it a the said'), q:['Where does Chad sit?','What has Chad got?','Who runs up?'], qRu:['Где сидит Чад?','Что у Чада с собой?','Кто прибегает?'] } },

{ id:'sh', nav:'Неделя 10', sub:'sh', c:'#FF6FB5', soft:'#FFEBF5', kind:'g', art:'fish',
  num:'Диграф 3', title:'sh  =  /ʃ/',
  lead:'Самый лёгкий диграф. Губы вытянуты трубочкой — между русским «ш» и «щ».',
  sounds:[['sh','/ʃ/','тише: shhhh']],
  cols:[['a','/æ/',W('shall cash dash rash mash')],['e','/e/',W('shed shell mesh')],
    ['i','/ɪ/',W('ship shin dish fish wish')],['o','/ɒ/',W('shop shot shock posh')],
    ['u','/ʌ/',W('shut rush hush gush shrug')]],
  spin:W('ship shin shed shop shot shut shell shall shock shrug fish dish wish cash dash rash mash mesh posh rush hush gush'),
  story:{ t:'Text 7 · The Shop', art:'fish',
    l:['Josh has a shop.','The shop has fish and ham.','','Nan runs in.','"I wish for a fish!"','','Josh got a big dish.','The fish is in the dish.','"Cash!" said Josh.','','Nan is not sad. Nan is glad!'],
    k:W('the a I for said'), q:['What has the shop got?','What does Nan wish for?','Is Nan sad or glad?'], qRu:['Что продаётся в лавке?','Чего хочет Нэн?','Нэн расстроена или рада?'] } },

{ id:'ph', nav:'Неделя 11', sub:'ph', c:'#84CC16', soft:'#F0FADF', kind:'ph', art:'ship',
  num:'Диграф 4', title:'ph  =  /f/',
  lead:'p и h поссорились, и теперь за них говорит /f/. Слова длиннее CVC, поэтому берём их целиком.',
  sounds:[['ph','/f/','фотоаппарат: щёлк']],
  wall:W('Phil phone photo graph phonics dolphin elephant alphabet phrase'),
  story:{ t:'Text 8 · Phil and the Photo', art:'ship',
    l:['Phil has a photo.','The photo is of a big ship.','','"Is this Dad?" said Phil.','"Yes! That is Dad on the ship," said Mum.','','Phil is glad.','Phil puts the photo on his desk.'],
    k:W('a the of is this said his puts'), q:['What is on the photo?','Who is on the ship?','Where does Phil put it?'], qRu:['Что на фотографии?','Кто на корабле?','Куда Фил ставит фото?'] },
  story2:{ t:'Text 9 · Fish and Chips — все диграфы вместе', art:'fish',
    l:['Josh has a big fish.','The fish is on a dish.','Chad has hot chips.','Munch, munch, munch!','','"This fish is thick," said Josh.','"That chip is hot!" said Chad.','','Then a cat ran in.','The cat got the fish!','Dash! The cat is off.','','Josh and Chad had chips for lunch.'],
    k:W('the a said then for had'), q:['What has Josh got?','Who got the fish?','What did they have for lunch?'], qRu:['Что поймал Джош?','Кто утащил рыбу?','Что они ели на обед?'] } },

{ id:'me', nav:'Неделя 12', sub:'немая e', c:'#FF8A4C', soft:'#FFF0E6', kind:'me', art:'kite',
  num:'Финал', title:'Немая e',
  lead:'В конце слова стоит немая e. Сама она молчит, но командует гласной — и та называет своё имя.',
  sounds:[['a_e','/eɪ/','cake'],['i_e','/aɪ/','kite'],['o_e','/əʊ/','bone'],['u_e','/juː/','cube'],['e_e','/iː/','Pete']],
  pairs:[['cap','cape'],['tap','tape'],['mad','made'],['can','cane'],['hat','hate'],['at','ate'],['plan','plane'],
    ['man','mane'],['kit','kite'],['bit','bite'],['pin','pine'],['rid','ride'],['hid','hide'],['fin','fine'],
    ['dim','dime'],['Tim','time'],['hop','hope'],['not','note'],['rob','robe'],['rod','rode'],['con','cone'],
    ['cub','cube'],['cut','cute'],['tub','tube'],['hug','huge'],['us','use']],
  cols:[['a_e','/eɪ/',W('cape tape made cane hate plane ate same gate lake')],
    ['i_e','/aɪ/',W('kite bite pine ride hide fine dime time slide shine')],
    ['o_e','/əʊ/',W('hope note code robe rode cone nose home bone stone')],
    ['u_e','/juː/',W('cube cute huge tube use June rule flute mute')],
    ['e_e','/iː/',W('Pete these Steve eve theme')]],
  extra:{ t:'Слова-обманщики · e есть, а правило не работает. Учим наизусть.',
    cols:[['✗','',W('have give live come some love done gone none one')]] },
  story:{ t:'Text 10 · Mike and the Kite', art:'kite',
    l:['Mike has a red bike.','Kate has a big kite.','','"Ride with me!" said Mike.','The kite is up. Up, up, up!','','Mike rides. Kate runs.','Then it is time to go home.','','Kate ate a cake.','Mike ate a cake.','What a fine time!'],
    k:W('said the to go what a'), q:['Who has a bike?','Who has a kite?','What do they eat?'], qRu:['У кого велосипед?','У кого воздушный змей?','Что они едят?'] },
  story2:{ t:'Text 12 · A Fine Trip — финал курса', art:'cake',
    l:['Beth and Phil made a plan.','"Let us take the bike to the lake!"','','Beth got a big bag.','In the bag: a cake, chips and a dish.','','At the lake, Beth and Phil ate the cake.','Phil got a shell. The shell is thin and white.','Beth got a fish in a net.','','"This is a fine fish!" said Beth.','"That is a thin shell!" said Phil.','','Then it was time to go home.','Beth and Phil rode back.','"What a fine time!"'],
    k:W('the a and said was to go what'), q:['Where did they go?','What was in the bag?','Who got a shell?','Was it a fine trip?'], qRu:['Куда они поехали?','Что было в сумке?','Кто нашёл ракушку?','Хорошая вышла поездка?'] } },


{ id:'cards', nav:'🖨 Карточки', c:'#6E7691', kind:'cards', art:'cards' },

{ id:'start', nav:'📖 Как это работает', c:'#F59E0B', kind:'start', art:'sun' }
];

export const CARDS = [
 ['Набор 1','s','sun','☀️'],['Набор 1','a','apple','🍎',1],['Набор 1','t','tap','🚰'],
 ['Набор 1','p','pig','🐷'],['Набор 1','i','ink','🖋️',1],['Набор 1','n','net','🥅'],
 ['Набор 2','m','man','🧍'],['Набор 2','d','dog','🐶'],['Набор 2','g','gas','⛽'],
 ['Набор 2','o','octopus','🐙',1],['Набор 2','c','cat','🐱'],['Набор 2','k','kid','🧒'],
 ['Набор 3','ck','duck','🦆'],['Набор 3','e','egg','🥚',1],['Набор 3','u','umbrella','☂️',1],
 ['Набор 3','r','run','🏃'],['Набор 3','h','hat','🎩'],['Набор 3','b','bed','🛏️'],
 ['Набор 3','f','fan','🪭'],['Набор 3','l','leg','🦵'],
 ['Набор 4','j','jam','🍓'],['Набор 4','v','van','🚐'],['Набор 4','w','web','🕸️'],
 ['Набор 4','x','box','📦'],['Набор 4','y','yes','👍'],['Набор 4','z','zip','🧷'],['Набор 4','qu','queen','👑'],
 ['Диграфы','th','thin','🪡'],['Диграфы','th','this','👉'],['Диграфы','ch','chip','🍟'],
 ['Диграфы','sh','ship','🚢'],['Диграфы','ph','photo','📷'],
 ['Немая e','a_e','cake','🎂',1],['Немая e','i_e','kite','🪁',1],['Немая e','o_e','bone','🦴',1],
 ['Немая e','u_e','cube','🧊',1],['Немая e','e_e','Pete','🧑',1]
];

/* ==================== ПОЧЕМУ ЗВУКИ НЕ ОЗВУЧЕНЫ ====================
   Отдельные звуки синтезом не получаются. Проверено четырьмя способами,
   все провалились — записано, чтобы больше не пробовать:

   1. Написать звук строкой: 'sssss', 'mmmmm', 'ohhhh'. Это не слова, модель
      читает их как придётся: /m/ вышло «мим», /ɒ/ пропетым «о-о-о», /iː/ не
      отличить от названия буквы u.

   2. Вырезать звук из настоящего слова по посимвольным таймингам
      (/v1/text-to-speech/{id}/with-timestamps). Тайминги посимвольные, а не
      пофонемные: модель размазывает время по буквам, и в отрезок буквы t в
      слове tap попадает гласная. На слух выходит «тап», в /d/ из dog — «до».

   3. Словарь произношений с транскрипцией (add-from-rules, type: phoneme).
      Создаётся, но flash и turbo фонемные правила не поддерживают: слова
      выходят пустыми или превращаются в «Ruby», «Beep».

   4. Объяснить задачу словами. У ElevenLabs нет канала инструкций — на
      «Say only the sound of the letter s: sss» он произносит саму инструкцию
      вслух. Теги eleven_v3 — фиксированный набор эффектов подачи, а не указания.

   5. Одна буква вместо повтора: 's' вместо 'sssss'. Выходит название буквы
      или случайное слово — p как «Pete», l как «Like».

   6. Gemini 2.5 TTS с инструкцией, на платном ключе. Инструкции он принимает,
      но на просьбу дать чистую фонему отвечает названием буквы или «Hmm».

   7. Kokoro-82M локально — единственный движок, которому транскрипцию можно
      подставить напрямую: [x](/θ/). Все 32 звука сгенерировались с первого
      раза, и на слух это тоже не звуки. Обучен он всё равно на речи.

   Фонемный тег <phoneme alphabet="cmu-arpabet"> у ElevenLabs, к слову, рабочий
   — но только на eleven_flash_v2 и eleven_turbo_v2, на flash_v2_5 и
   multilingual_v2 он молча срезается. Звуки от этого лучше не стали.

   Взрывные /p/ /b/ /t/ /d/ /k/ /g/ вдобавок невозможны и физически: без
   гласной они не произносятся, любая попытка даёт «пэ», «кэ» — ровно ту
   ошибку, против которой построен курс.

   Поэтому звуки произносит взрослый, по подсказке в карточке набора. Так
   было задумано с самого начала, и это было верно. */

/* ==================== ПРОИЗНОШЕНИЕ ВРУЧНУЮ ====================
   Обычно модель сама решает, как читать буквы, и на коротких словах иногда
   промахивается: cub звучало не как /kʌb/, rid не как /rɪd/. Здесь для таких
   слов транскрипция задаётся явно, в CMU Arpabet, и модель обязана её
   исполнить.

   Тег <phoneme> поддерживают только eleven_flash_v2 и eleven_turbo_v2 — на
   flash_v2_5 и multilingual_v2 он молча срезается. Скрипт генерации сам
   переключает модель для слов из этого списка.

   Нашли слово, которое читается неверно? Добавьте строку сюда и запустите
   npm run audio — переозвучится только оно и то, что из него собрано. */
export const PRONUNCIATION = {
  cub:  'K AH B',
  lid:  'L IH D',
  rip:  'R IH P',
  ride: 'R AY D',
  cube: 'K Y UW B',
};

/* Не всякое слово чинится транскрипцией. У rid любая заданная вручную запись
   давала лишний слог — слышалось «ready», — а простой eleven_flash_v2 без
   всякого тега читает его верно. Тут дело не в транскрипции, а в модели:
   курс по умолчанию озвучен flash_v2_5, и на этом слове она промахивается.

   Такие слова просто просим у flash_v2 как есть, ничего не оборачивая. */
export const PLAIN_V2 = ['rid'];

/* ==================== ПАРЫ ГЛАСНЫХ ====================
   У русскоязычных детей /æ/, /e/ и /ʌ/ схлопываются в один звук — это прямо
   названо трудностью в наборе 3 и до сих пор нигде не отрабатывалось.
   Слышит ребёнок разницу или нет, видно только на минимальных парах: два
   слова, отличающиеся ровно одной гласной. */
export const MIN_PAIRS = [
  { t:'/æ/ — /e/', a:'/æ/', b:'/e/', hint:'Рот шире для /æ/. «bad» — челюсть вниз, «bed» — уже.',
    p:[['bad','bed'],['bat','bet'],['pat','pet'],['sat','set'],['tan','ten'],['lad','led']] },
  { t:'/æ/ — /ʌ/', a:'/æ/', b:'/ʌ/', hint:'/æ/ — рот широко и вперёд, /ʌ/ — коротко и глубже.',
    p:[['cat','cut'],['bat','but'],['hat','hut'],['cap','cup'],['ran','run'],['bad','bud']] },
  { t:'/e/ — /ɪ/', a:'/e/', b:'/ɪ/', hint:'/e/ — как русское «э», /ɪ/ — короткий, расслабленный.',
    p:[['bed','bid'],['pen','pin'],['bet','bit'],['led','lid'],['ten','tin'],['beg','big']] },
  { t:'/ɒ/ — /ʌ/', a:'/ɒ/', b:'/ʌ/', hint:'/ɒ/ — губы кружком, /ʌ/ — губы расслаблены.',
    p:[['cot','cut'],['hot','hut'],['lock','luck'],['not','nut'],['dog','dug'],['pot','put']] },
];

/** Слова-обманщики: правило на них не работает, их берут узнаванием. */
export function trickyWords(){
  const out = new Set();
  for (const g of GROUPS){
    [g.story, g.story2].forEach(st => (st?.k || []).forEach(w => out.add(w)));
    if (g.id === 'me') (g.extra?.cols || []).forEach(c => c[2].forEach(w => out.add(w)));
  }
  return [...out];
}

/** Слова для диктанта и повтора: всё, что читается по столбикам и барабанам. */
export function drillWords(gid){
  const out = new Set();
  for (const g of GROUPS){
    (g.spin || []).forEach(w => out.add(w));
    (g.cols || []).forEach(c => c[2].forEach(w => out.add(w)));
    if (g.id === gid) break;
  }
  return [...out];
}

// Всё, что должно быть озвучено. Используется и приложением, и скриптом генерации.
/** Всё, что озвучивается внутри одного набора. */
export function phrasesOf(g){
  const out = new Set();
  (g.cols||[]).forEach(c => c[2].forEach(w => out.add(w)));
  (g.extra?.cols||[]).forEach(c => c[2].forEach(w => out.add(w)));
  (g.spin||[]).forEach(w => out.add(w));
  (g.wall||[]).forEach(w => out.add(w));
  // Пара звучит и по отдельности, и целиком — "cap, cape" произносится одной
  // кнопкой, и это отдельная запись: склеенного текста в манифесте иначе нет.
  (g.pairs||[]).forEach(([a,b]) => { out.add(a); out.add(b); out.add(`${a}, ${b}`); });
  [g.story, g.story2].forEach(s => {
    if (!s) return;
    s.l.filter(Boolean).forEach(l => out.add(l.replace(/"/g,'')));
  });
  return [...out];
}

/** Кнопка «Проверить» в настройках — вне наборов, но озвучивается так же. */
export const EXTRA_SAY = ['cat. ship. this. cake.'];

/** Список для генератора озвучки: все наборы, без повторов. */
export function collectPhrases(){
  const out = new Set(EXTRA_SAY);
  for (const g of GROUPS) for (const t of phrasesOf(g)) out.add(t);
  return [...out];
}

/**
 * Полный наряд для скрипта генерации. Ключ — то, чем запись зовётся в
 * манифесте, text — то, что уходит в синтез.
 *
 *   speech — обычная запись;
 *   blend  — то же слово, растянутое вдвое для слияния. Делается из готовой
 *            записи через rubberband, к API не обращается и кредитов не стоит;
 */
export function collectAudio(){
  const jobs = new Map();
  const add = (key, text, kind) => { if (!jobs.has(key)) jobs.set(key, { key, text, kind }); };

  for (const t of collectPhrases()) add(t, t, 'speech');
  for (const w of trickyWords()) add(w, w, 'speech');
  for (const grp of MIN_PAIRS) for (const [a, b] of grp.p) {
    add(a, a, 'speech'); add(b, b, 'speech'); add(`${a}, ${b}`, `${a}, ${b}`, 'speech');
  }
  for (const g of GROUPS) for (const st of [g.story, g.story2])
    (st?.q || []).forEach(q => add(q, q, 'speech'));

  // Слияние тренируют на односложных словах из барабанов — их и растягиваем.
  for (const g of GROUPS) (g.spin || []).forEach(w => add('blend:' + w, w, 'blend'));

  return [...jobs.values()];
}
