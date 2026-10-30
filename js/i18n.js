// Языки интерфейса. Тексты в коде написаны по-русски; для других языков словарь js/lang/<код>.js (ключ — русская строка) подменяет текст
// в уже построенной странице и во всём, что добавляется позже (MutationObserver). Длинные фразы подменяются целиком, а куски фраз с числами
// («Забрать +», «душ», «волны») — по отдельности, самые длинные первыми. Выбор языка хранится в localStorage; смена языка перезагружает страницу.
// [код, название на своём языке, флаг, название по-английски (для поиска)]
export const LANGS = [
  ['ru', 'Русский', '🇷🇺', 'Russian'], ['en', 'English', '🇬🇧', 'English'], ['uk', 'Українська', '🇺🇦', 'Ukrainian'], ['es', 'Español', '🇪🇸', 'Spanish'], ['pt', 'Português', '🇧🇷', 'Portuguese'],
  ['de', 'Deutsch', '🇩🇪', 'German'], ['tr', 'Türkçe', '🇹🇷', 'Turkish'], ['fr', 'Français', '🇫🇷', 'French'], ['it', 'Italiano', '🇮🇹', 'Italian'], ['pl', 'Polski', '🇵🇱', 'Polish'],
  ['id', 'Bahasa Indonesia', '🇮🇩', 'Indonesian'], ['vi', 'Tiếng Việt', '🇻🇳', 'Vietnamese'], ['ar', 'العربية', '🇸🇦', 'Arabic'], ['fa', 'فارسی', '🇮🇷', 'Persian'], ['hi', 'हिन्दी', '🇮🇳', 'Hindi'],
  ['uz', 'Oʻzbekcha', '🇺🇿', 'Uzbek'], ['kk', 'Қазақша', '🇰🇿', 'Kazakh'], ['zh', '简体中文', '🇨🇳', 'Chinese'], ['ja', '日本語', '🇯🇵', 'Japanese'],
];
// как писать числа: разделитель тысяч и десятичный знак (в тексте игры числа в русском виде: «1 300», «1,5»)
const NUMFMT = { en: [',', '.'], zh: [',', '.'], ja: [',', '.'], hi: [',', '.'], ar: [',', '.'], fa: [',', '.'], uk: ['\u00a0', ','], kk: ['\u00a0', ','], uz: ['\u00a0', ','], pl: ['\u00a0', ','], fr: ['\u202f', ','], es: ['.', ','], pt: ['.', ','], de: ['.', ','], tr: ['.', ','], it: ['.', ','], id: ['.', ','], vi: ['.', ','] };
const KEY = 'baalgor_lang';
export let lang = 'ru';

const CYR = /[А-Яа-яЁё]/;
const NUMS = /\d[  ]\d{3}|\d,\d/;                    // числа в русском виде: «1 300», «1,5»
let exact = new Map(), regs = [], grp = '', decSep = ',';

// Язык из настроек игрока, иначе из языка Telegram, иначе из браузера; незнакомые языки — английский.
export function pickLang() {
  let c = ''; try { c = localStorage.getItem(KEY) || ''; } catch (e) { /* */ }
  if (!c) {
    let tgc = ''; try { tgc = (window.Telegram.WebApp.initDataUnsafe.user.language_code || ''); } catch (e) { /* */ }
    c = (tgc || navigator.language || 'en').toLowerCase().slice(0, 2);
    if (['be', 'ky', 'tg', 'tt', 'ba', 'hy', 'mo'].includes(c)) c = 'ru'; else if (c === 'ms') c = 'id'; else if (c === 'az') c = 'tr';
  }
  return LANGS.some((l) => l[0] === c) ? c : 'en';
}
export function setLang(code) { try { localStorage.setItem(KEY, code); } catch (e) { /* */ } location.reload(); }

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export async function initLang(code) {
  lang = code; document.documentElement.lang = code;
  if (code === 'ru') return;
  let dict; try { dict = (await import(`./lang/${code}.js?v=20261030160142`)).default; } catch (e) { return; }
  exact = new Map(Object.entries(dict));
  // самые длинные куски первыми; границы слова учитываем только там, где ключ начинается/кончается буквой (чтобы не задеть части других слов)
  regs = Object.keys(dict).sort((a, b) => b.length - a.length).map((k) => {
    const a = /^\p{L}/u.test(k) ? '(?<!\\p{L})' : '', b = /\p{L}$/u.test(k) ? '(?!\\p{L})' : '';
    return [new RegExp(a + esc(k) + b, 'gu'), dict[k]];
  });
  [grp, decSep] = NUMFMT[code] || [',', '.'];
  translateTree(document.body); document.title = tr(document.title);
  new MutationObserver(onMut).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder'] });
}

// перевод одной строки (для текста, который рисуется на холсте или собирается кодом)
export function tr(s) {
  if (lang === 'ru' || !s) return s;
  if (CYR.test(s)) {
    const trimmed = s.trim(), hit = exact.get(trimmed);
    if (hit !== undefined) s = s.replace(trimmed, hit);
    else for (const [re, to] of regs) { s = s.replace(re, to); if (!CYR.test(s)) break; }
  }
  if (NUMS.test(s)) {                                          // 1 300 → 1,300 / 1.300; 1,5 → 1.5
    s = s.replace(/(\d)[\u00a0 ](\d{3})/g, `$1${grp}$2`);
    if (decSep !== ',') s = s.replace(/(\d),(\d)(?!\d{2})/g, `$1${decSep}$2`);
  }
  return s;
}
export const t = tr;

const done = new WeakMap();
function doText(n) {
  const v = n.nodeValue; if (!v || done.get(n) === v) return;
  const nv = (CYR.test(v) || NUMS.test(v)) ? tr(v) : v; done.set(n, nv);
  if (nv !== v) n.nodeValue = nv;
}
function doEl(e) {
  for (const a of ['aria-label', 'title', 'placeholder']) { const v = e.getAttribute && e.getAttribute(a); if (v && CYR.test(v)) { const nv = tr(v); if (nv !== v) e.setAttribute(a, nv); } }
}
function translateTree(root) {
  if (root.nodeType === 3) { doText(root); return; }
  if (root.nodeType !== 1) return;
  doEl(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n;
  while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else doEl(n); }
}
function onMut(list) {
  for (const m of list) {
    if (m.type === 'childList') m.addedNodes.forEach(translateTree);
    else if (m.type === 'characterData') doText(m.target);
    else if (m.type === 'attributes') doEl(m.target);
  }
}
