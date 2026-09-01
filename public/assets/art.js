// Плоские SVG-иллюстрации. Без внешних файлов, красятся через currentColor и фиксированные цвета.
const s = (vb, body) => `<svg viewBox="${vb}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;

export const ART = {

sun: s('0 0 120 120', `
  <g stroke="#FFB300" stroke-width="7" stroke-linecap="round">
    <path d="M60 8v12M60 100v12M8 60h12M100 60h12M23 23l8 8M89 89l8 8M97 23l-8 8M31 89l-8 8"/>
  </g>
  <circle cx="60" cy="60" r="30" fill="#FFD54F" stroke="#FFB300" stroke-width="6"/>
  <circle cx="50" cy="55" r="4" fill="#5D4037"/><circle cx="70" cy="55" r="4" fill="#5D4037"/>
  <path d="M48 70q12 10 24 0" stroke="#5D4037" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="41" cy="68" r="5" fill="#FF8A80" opacity=".55"/>
  <circle cx="79" cy="68" r="5" fill="#FF8A80" opacity=".55"/>`),

cat: s('0 0 120 120', `
  <path d="M30 44 26 20l22 12M90 44l4-24-22 12" fill="#FFCC80" stroke="#8D6E63" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="60" cy="66" rx="34" ry="30" fill="#FFCC80" stroke="#8D6E63" stroke-width="5"/>
  <circle cx="48" cy="60" r="5.5" fill="#3E2723"/><circle cx="72" cy="60" r="5.5" fill="#3E2723"/>
  <circle cx="50" cy="58" r="2" fill="#fff"/><circle cx="74" cy="58" r="2" fill="#fff"/>
  <path d="M60 72l-5 4h10z" fill="#FF8A80"/>
  <path d="M60 78q-7 6-13 1M60 78q7 6 13 1" stroke="#8D6E63" stroke-width="4" stroke-linecap="round"/>
  <g stroke="#8D6E63" stroke-width="3.5" stroke-linecap="round">
    <path d="M26 66h-14M26 74l-13 5M94 66h14M94 74l13 5"/></g>
  <circle cx="38" cy="72" r="6" fill="#FF8A80" opacity=".45"/>
  <circle cx="82" cy="72" r="6" fill="#FF8A80" opacity=".45"/>`),

dog: s('0 0 120 120', `
  <ellipse cx="28" cy="52" rx="12" ry="22" fill="#A1887F" stroke="#5D4037" stroke-width="5"/>
  <ellipse cx="92" cy="52" rx="12" ry="22" fill="#A1887F" stroke="#5D4037" stroke-width="5"/>
  <ellipse cx="60" cy="62" rx="32" ry="29" fill="#D7CCC8" stroke="#5D4037" stroke-width="5"/>
  <circle cx="49" cy="56" r="5.5" fill="#3E2723"/><circle cx="71" cy="56" r="5.5" fill="#3E2723"/>
  <circle cx="51" cy="54" r="2" fill="#fff"/><circle cx="73" cy="54" r="2" fill="#fff"/>
  <ellipse cx="60" cy="74" rx="14" ry="11" fill="#EFEBE9" stroke="#5D4037" stroke-width="4"/>
  <ellipse cx="60" cy="70" rx="7" ry="5.5" fill="#3E2723"/>
  <path d="M60 76v6M60 82q-6 5-11 1M60 82q6 5 11 1" stroke="#5D4037" stroke-width="3.5" stroke-linecap="round"/>`),

bug: s('0 0 120 120', `
  <path d="M60 22v14M46 20l6 12M74 20l-6 12" stroke="#5D4037" stroke-width="5" stroke-linecap="round"/>
  <circle cx="46" cy="18" r="5" fill="#5D4037"/><circle cx="74" cy="18" r="5" fill="#5D4037"/>
  <ellipse cx="60" cy="68" rx="32" ry="30" fill="#EF5350" stroke="#B71C1C" stroke-width="5"/>
  <path d="M60 38v60" stroke="#B71C1C" stroke-width="5"/>
  <circle cx="44" cy="58" r="6" fill="#3E2723"/><circle cx="76" cy="76" r="6" fill="#3E2723"/>
  <circle cx="46" cy="82" r="5" fill="#3E2723"/><circle cx="74" cy="54" r="5" fill="#3E2723"/>
  <path d="M60 38a30 30 0 0 0-20 8" stroke="#B71C1C" stroke-width="0"/>
  <circle cx="52" cy="44" r="3.5" fill="#fff"/><circle cx="68" cy="44" r="3.5" fill="#fff"/>`),

duck: s('0 0 120 120', `
  <path d="M14 92q24 10 46 0t46 0" stroke="#4FC3F7" stroke-width="6" stroke-linecap="round"/>
  <ellipse cx="58" cy="72" rx="34" ry="22" fill="#FFEB3B" stroke="#F9A825" stroke-width="5"/>
  <circle cx="82" cy="46" r="20" fill="#FFEB3B" stroke="#F9A825" stroke-width="5"/>
  <path d="M100 44h16l-6 8h-10z" fill="#FF9800" stroke="#E65100" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="86" cy="41" r="4.5" fill="#3E2723"/><circle cx="88" cy="39" r="1.8" fill="#fff"/>
  <path d="M40 68q10-10 22-2" stroke="#F9A825" stroke-width="4.5" stroke-linecap="round"/>`),

moth: s('0 0 120 120', `
  <ellipse cx="60" cy="62" rx="7" ry="26" fill="#8D6E63" stroke="#4E342E" stroke-width="4"/>
  <path d="M53 44C34 24 12 34 16 54s28 30 37 18z" fill="#CE93D8" stroke="#6A1B9A" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M67 44c19-20 41-10 37 10s-28 30-37 18z" fill="#CE93D8" stroke="#6A1B9A" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M53 74c-14 12-30 6-27-8M67 74c14 12 30 6 27-8" fill="#F8BBD0" stroke="#6A1B9A" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M56 38l-8-14M64 38l8-14" stroke="#4E342E" stroke-width="4" stroke-linecap="round"/>
  <circle cx="56" cy="46" r="3" fill="#fff"/><circle cx="64" cy="46" r="3" fill="#fff"/>`),

chick: s('0 0 120 120', `
  <ellipse cx="60" cy="70" rx="30" ry="28" fill="#FFEB3B" stroke="#F9A825" stroke-width="5"/>
  <circle cx="60" cy="40" r="21" fill="#FFF176" stroke="#F9A825" stroke-width="5"/>
  <path d="M58 26q2-10 8-12" stroke="#F9A825" stroke-width="5" stroke-linecap="round"/>
  <circle cx="52" cy="38" r="4.5" fill="#3E2723"/><circle cx="68" cy="38" r="4.5" fill="#3E2723"/>
  <circle cx="53.5" cy="36.5" r="1.7" fill="#fff"/><circle cx="69.5" cy="36.5" r="1.7" fill="#fff"/>
  <path d="M60 46l-7 5 7 5 7-5z" fill="#FF9800" stroke="#E65100" stroke-width="3" stroke-linejoin="round"/>
  <path d="M50 96l-6 8M70 96l6 8" stroke="#E65100" stroke-width="5" stroke-linecap="round"/>
  <circle cx="42" cy="50" r="5" fill="#FF8A80" opacity=".5"/>
  <circle cx="78" cy="50" r="5" fill="#FF8A80" opacity=".5"/>`),

fish: s('0 0 120 120', `
  <path d="M96 60L112 40v40z" fill="#4DD0E1" stroke="#00838F" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="56" cy="60" rx="42" ry="28" fill="#4DD0E1" stroke="#00838F" stroke-width="5"/>
  <path d="M56 32q10 14 0 28" stroke="#00838F" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="28" cy="54" r="6" fill="#fff" stroke="#00838F" stroke-width="3"/>
  <circle cx="27" cy="54" r="3" fill="#3E2723"/>
  <path d="M22 70q8 6 16 0" stroke="#00838F" stroke-width="4" stroke-linecap="round"/>
  <circle cx="14" cy="34" r="5" fill="#B2EBF2" stroke="#00838F" stroke-width="3"/>
  <circle cx="26" cy="22" r="3.5" fill="#B2EBF2" stroke="#00838F" stroke-width="3"/>`),

ship: s('0 0 120 120', `
  <path d="M8 86q16 10 32 0t32 0 32 0" stroke="#42A5F5" stroke-width="6" stroke-linecap="round"/>
  <path d="M18 66h84l-12 20H30z" fill="#EF5350" stroke="#B71C1C" stroke-width="5" stroke-linejoin="round"/>
  <path d="M60 66V16" stroke="#8D6E63" stroke-width="6" stroke-linecap="round"/>
  <path d="M64 20h30L64 42z" fill="#FFF176" stroke="#F9A825" stroke-width="4.5" stroke-linejoin="round"/>
  <path d="M56 24H30l26 22z" fill="#FFFFFF" stroke="#90A4AE" stroke-width="4.5" stroke-linejoin="round"/>`),

kite: s('0 0 120 120', `
  <path d="M60 10 96 46 60 82 24 46z" fill="#FF7043" stroke="#BF360C" stroke-width="5" stroke-linejoin="round"/>
  <path d="M60 10v72M24 46h72" stroke="#BF360C" stroke-width="4"/>
  <path d="M60 82q-10 12 0 18t0 12" stroke="#8D6E63" stroke-width="4" stroke-linecap="round"/>
  <path d="M52 96l-12 4 12 4z" fill="#4FC3F7" stroke="#0277BD" stroke-width="3" stroke-linejoin="round"/>
  <path d="M68 108l12 4-12 4z" fill="#AED581" stroke="#33691E" stroke-width="3" stroke-linejoin="round"/>`),

cake: s('0 0 120 120', `
  <g transform="translate(0,-18)">
  <path d="M22 56h76v14q-10 8-19 0t-19 0-19 0-19 0z" fill="#F48FB1" stroke="#AD1457" stroke-width="5" stroke-linejoin="round"/>
  <rect x="22" y="66" width="76" height="34" rx="8" fill="#FFE0B2" stroke="#8D6E63" stroke-width="5"/>
  <circle cx="40" cy="84" r="4" fill="#EF5350"/><circle cx="60" cy="88" r="4" fill="#66BB6A"/>
  <circle cx="80" cy="84" r="4" fill="#42A5F5"/>
  </g>`),

pan: s('0 0 120 120', `
  <ellipse cx="52" cy="66" rx="34" ry="24" fill="#90A4AE" stroke="#37474F" stroke-width="5"/>
  <ellipse cx="52" cy="60" rx="34" ry="22" fill="#CFD8DC" stroke="#37474F" stroke-width="5"/>
  <path d="M86 58h26" stroke="#5D4037" stroke-width="9" stroke-linecap="round"/>
  <circle cx="44" cy="58" r="8" fill="#FFF59D" stroke="#F9A825" stroke-width="3"/>
  <circle cx="44" cy="58" r="3.5" fill="#FFB300"/>
  <path d="M34 34q4-10 0-16M52 32q4-10 0-16M70 34q4-10 0-16" stroke="#B0BEC5" stroke-width="4" stroke-linecap="round"/>`),

cards: s('0 0 120 120', `
  <rect x="16" y="30" width="52" height="66" rx="10" fill="#fff" stroke="#90A4AE" stroke-width="5" transform="rotate(-8 42 63)"/>
  <rect x="46" y="24" width="52" height="66" rx="10" fill="#fff" stroke="#3D7BFF" stroke-width="5" transform="rotate(7 72 57)"/>
  <text x="72" y="70" font-family="Andika,sans-serif" font-size="38" font-weight="700" fill="#3D7BFF" text-anchor="middle" transform="rotate(7 72 57)">a</text>`)
};

export const art = (name, cls='') =>
  ART[name] ? `<div class="art ${cls}">${ART[name]}</div>` : '';
