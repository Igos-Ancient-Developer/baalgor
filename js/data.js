// Все игровые данные: карты, башни, экономика, враги, волны.
// Файл не зависит ни от DOM, ни от canvas — его использует и симуляция в Node (баланс-бот).

import { COLS, ROWS } from './layouts.js?v=20261029183609';
export const CELL = 48;
export { COLS, ROWS };
export const WORLD_W = CELL * COLS, WORLD_H = CELL * ROWS;
export const PAD = { l: 26, r: 26, t: 76, b: 118 };           // фон карты шире поля: портал и ворота не прячутся за краем, а нижние ряды можно поднять над панелью здания
export const VIEW_COLS = 6.8;                                  // сколько клеток в ширину видно на экране: карта больше экрана и двигается пальцем
export const TICK = 10;          // «такт» дохода для подсчёта «золота за 10 секунд» в интерфейсе
export const COIN_PERIOD = 12;   // каждое здание добычи выбрасывает монету раз в столько секунд
export const COIN_FIRST = 6;     // первая монета — через столько секунд после постройки
export const COIN_LIFE = 12;     // секунд, пока монету можно подобрать
export const START_LIVES = 5;      // докупаются: перк «Крепость» в Кузнице и усилитель за кристаллы
export const START_GOLD = 120;       // хватает на одно здание добычи (рудник 60) и одно боевое (арбалет 50)
export const BASE_INCOME = 0;    // золота «просто так» нет: только монеты зданий добычи и награды за убийства
export const SELL_RATE = 0.7;
// Сундук-сюрприз: может появиться на карте один раз за уровень; три касания — взрывается, высыпает монеты и даёт фиксированную сумму
export const CHEST_CHANCE = 0.6, CHEST_HITS = 3, CHEST_GOLD_MIN = 15, CHEST_GOLD_MAX = 35;      // из сундука-сюрприза падает случайное число монет

// ───────────────────────── Карты ─────────────────────────
// Уровни кампании описаны в levels.js (раскладки дорог — в layouts.js). Индекс в MAPS = номер уровня.
import { LEVELS, SECTORS, CAMPAIGN } from './levels.js?v=20261029183609';
export const MAPS = LEVELS;
export { CAMPAIGN };
export { SECTORS };

// ───────────────────────── Сложности ─────────────────────────
// Здоровье и скорость обычных врагов от сложности НЕ зависят (hp и spd всегда 1): они определяются видом врага и рубежом.
// Сложность меняет только численность орд (horde), долю «элитных» врагов (elite) и их силу (eliteHp, eliteSpd), число жизней крепости,
// а также награды: score — очки, gold — прибавка ко всему золоту, souls — множитель душ. lives: null = обычно.
export const DIFFS = [
  { id: 'squire', name: 'Страх', hp: 1, spd: 1, tier: 0, score: 0.8, gold: 0, lives: null, horde: 0.8, elite: 0, eliteHp: 1.6, eliteSpd: 1.15, souls: 0.7, demon: 'imp', color: '#8fd86a' },
  { id: 'warrior', name: 'Ужас', hp: 1, spd: 1, tier: 0, score: 1, gold: 0, lives: null, horde: 1, elite: 0.05, eliteHp: 2, eliteSpd: 1.2, souls: 1, demon: 'brute', color: '#ffd24a' },
  { id: 'nightmare', name: 'Пекло', hp: 1.3, spd: 1, tier: 6, score: 1.6, gold: 0, lives: null, horde: 1.2, elite: 0.1, eliteHp: 2.6, eliteSpd: 1.25, souls: 1.5, demon: 'succubus', color: '#ff9a3a' },
  { id: 'hell', name: 'Ад', hp: 2.0, spd: 1, tier: 12, score: 2.4, gold: 0, lives: null, horde: 1.4, elite: 0.16, eliteHp: 3.4, eliteSpd: 1.3, souls: 2.2, demon: 'pitlord', color: '#ff4a3a' },
  { id: 'hardcore', name: 'Ночной кошмар', hp: 1.6, spd: 1, tier: 16, score: 4, gold: 0.25, lives: 1, horde: 1.65, elite: 0.24, eliteHp: 4.4, eliteSpd: 1.35, souls: 3.5, demon: 'archdemon', color: '#c01a2a' },
];

// ───────────────────────── Башни ─────────────────────────
// lv[0..2] — уровни 1..3 (cost у lv[0] — цена постройки, дальше — цена улучшения).
// branches.A/B.lv[0..1] — уровни 4 и 5 выбранной ветки.
// range в клетках, rate — выстрелов/сек.
export const TOWERS = {
  bolt: {
    name: 'Арбалет', cost: 50, air: true, ground: true,
    short: 'Быстрые болты. Бьёт по земле и воздуху.',
    lv: [
      { dmg: 14, rate: 1.5, range: 3.0 },
      { cost: 60, dmg: 22, rate: 1.6, range: 3.2 },
      { cost: 110, dmg: 34, rate: 1.8, range: 3.4 },
    ],
    branches: {
      A: { name: 'Пронзатель', desc: 'Болты пробивают до 7 врагов в ряд и игнорируют броню.', lv: [
        { cost: 200, dmg: 42, rate: 1.7, range: 3.6, pierce: 4, armorPierce: 0.5 },
        { cost: 330, dmg: 64, rate: 1.8, range: 3.9, pierce: 7, armorPierce: 0.8 } ] },
      B: { name: 'Палач', desc: 'Критические удары сильнее обычных и мгновенная казнь раненых врагов.', lv: [
        { cost: 190, dmg: 44, rate: 2.2, range: 3.8, execute: 0.15 },
        { cost: 320, dmg: 62, rate: 2.7, range: 4.2, execute: 0.25 } ] },
    },
  },
  mortar: {
    name: 'Мортира', cost: 90, air: false, ground: true,
    short: 'Взрывные бомбы по площади. Только по земле.',
    lv: [
      { dmg: 55, rate: 0.55, range: 3.6, splash: 1.0 },
      { cost: 100, dmg: 78, rate: 0.55, range: 3.8, splash: 1.1 },
      { cost: 170, dmg: 120, rate: 0.6, range: 4.0, splash: 1.25 },
    ],
    branches: {
      A: { name: 'Кассета', desc: 'Снаряд раскрывается россыпью бомб, каждая взрывается отдельно.', lv: [
        { cost: 280, dmg: 55, rate: 0.6, range: 4.2, splash: 0.75, cluster: 5 },
        { cost: 440, dmg: 82, rate: 0.65, range: 4.4, splash: 0.8, cluster: 8 } ] },
      B: { name: 'Напалм', desc: 'Взрыв оставляет море огня, которое жжёт всех, кто идёт по нему.', lv: [
        { cost: 270, dmg: 130, rate: 0.55, range: 4.0, splash: 1.35, fire: 30, fireT: 4 },
        { cost: 420, dmg: 185, rate: 0.6, range: 4.2, splash: 1.5, fire: 55, fireT: 5.5 } ] },
    },
  },
  tesla: {
    name: 'Тесла', cost: 110, air: true, ground: true,
    short: 'Цепная молния перескакивает между врагами. Игнорирует броню.',
    lv: [
      { dmg: 14.5, rate: 1.1, range: 2.7, chains: 3, falloff: 0.85 },
      { cost: 90, dmg: 25, rate: 1.1, range: 2.8, chains: 4, falloff: 0.85 },
      { cost: 150, dmg: 35, rate: 1.2, range: 2.9, chains: 5, falloff: 0.88 },
    ],
    branches: {
      A: { name: 'Перегрузка', desc: 'Молнии оглушают врагов: оглушённые замирают на месте.', lv: [
        { cost: 260, dmg: 58, rate: 1.2, range: 3.0, chains: 5, falloff: 0.9, stun: 0.35, stunT: 0.8 },
        { cost: 400, dmg: 82, rate: 1.3, range: 3.2, chains: 6, falloff: 0.9, stun: 0.5, stunT: 1.1 } ] },
      B: { name: 'Буря', desc: 'Цепь прыгает по 8–11 врагам почти без потери урона. Чистка толп.', lv: [
        { cost: 250, dmg: 44, rate: 1.2, range: 3.2, chains: 8, falloff: 0.94 },
        { cost: 390, dmg: 60, rate: 1.4, range: 3.5, chains: 11, falloff: 0.94 } ] },
    },
  },
  frost: {
    name: 'Ледяной шпиль', cost: 80, air: true, ground: true,
    short: 'Замедляет и замораживает. Лёд делает врагов хрупкими.',
    lv: [
      { dmg: 8, rate: 1.3, range: 2.8, slow: 0.35, slowT: 1.6 },
      { cost: 70, dmg: 14, rate: 1.3, range: 3.0, slow: 0.45, slowT: 1.8 },
      { cost: 120, dmg: 22, rate: 1.4, range: 3.1, slow: 0.55, slowT: 2.0, freeze: 0.12, freezeT: 1.0 },
    ],
    branches: {
      A: { name: 'Вечная мерзлота', desc: 'Постоянная аура: все враги в радиусе сильно замедлены.', lv: [
        { cost: 230, dmg: 30, rate: 1.4, range: 3.3, slow: 0.62, slowT: 2.2, aura: 0.62, freeze: 0.12, freezeT: 1.0 },
        { cost: 350, dmg: 48, rate: 1.5, range: 3.6, slow: 0.72, slowT: 2.4, aura: 0.72, freeze: 0.15, freezeT: 1.2 } ] },
      B: { name: 'Раскол', desc: 'Частая заморозка. Замёрзшие получают +доп. урона и взрываются осколками.', lv: [
        { cost: 240, dmg: 24, rate: 1.4, range: 3.2, slow: 0.55, slowT: 2.0, freeze: 0.3, freezeT: 1.4, brittle: 0.5, shatter: 0.25 },
        { cost: 380, dmg: 36, rate: 1.5, range: 3.4, slow: 0.55, slowT: 2.0, freeze: 0.45, freezeT: 1.8, brittle: 0.8, shatter: 0.4 } ] },
    },
  },
  toxic: {
    name: 'Дом алхимика', cost: 95, air: false, ground: true,
    short: 'Склянки с ядом. Яд копится и игнорирует броню. Только земля.',
    lv: [
      { dmg: 12, rate: 0.8, range: 3.2, splash: 0.9, poison: 11, poisonT: 4, stacks: 3 },
      { cost: 90, dmg: 14, rate: 0.85, range: 3.3, splash: 0.95, poison: 16, poisonT: 4, stacks: 3 },
      { cost: 150, dmg: 20, rate: 0.9, range: 3.4, splash: 1.0, poison: 28, poisonT: 5, stacks: 4 },
    ],
    branches: {
      A: { name: 'Чума', desc: 'Заражённые умирая выпускают облако чумы на соседей.', lv: [
        { cost: 250, dmg: 24, rate: 0.9, range: 3.5, splash: 1.05, poison: 32, poisonT: 5, stacks: 5, plague: 1.5 },
        { cost: 380, dmg: 34, rate: 1.0, range: 3.7, splash: 1.1, poison: 48, poisonT: 6, stacks: 6, plague: 2.2 } ] },
      B: { name: 'Кислота', desc: 'Едкая кислота разъедает броню врагов — все физические башни бьют сильнее.', lv: [
        { cost: 240, dmg: 28, rate: 0.95, range: 3.5, splash: 1.1, poison: 38, poisonT: 5, stacks: 4, shred: 0.35 },
        { cost: 370, dmg: 40, rate: 1.05, range: 3.7, splash: 1.25, poison: 60, poisonT: 6, stacks: 5, shred: 0.6 } ] },
    },
  },
  saw: {
    name: 'Пилорама', cost: 130, air: false, ground: true,
    short: 'Пила-бумеранг режет всех на пути туда и обратно. Только земля.',
    lv: [
      { dmg: 37, rate: 0.75, range: 3.2 },
      { cost: 110, dmg: 50, rate: 0.75, range: 3.4 },
      { cost: 190, dmg: 72, rate: 0.9, range: 3.6 },
    ],
    branches: {
      A: { name: 'Вихрь', desc: 'Лезвия вечно вращаются вокруг башни и шинкуют всё, что подошло.', lv: [
        { cost: 300, dmg: 46, rate: 1, range: 2.0, orbit: 3 },
        { cost: 450, dmg: 68, rate: 1, range: 2.4, orbit: 5 } ] },
      B: { name: 'Рикошет', desc: 'Пила отскакивает от цели к цели, оставляя за собой месиво.', lv: [
        { cost: 300, dmg: 100, rate: 0.8, range: 3.8, bounce: 5 },
        { cost: 450, dmg: 140, rate: 0.9, range: 4.2, bounce: 8 } ] },
    },
  },
  banner: {
    name: 'Знамя крови', cost: 120, air: false, ground: false, support: true,
    short: 'Не атакует, но усиливает соседние башни.',
    lv: [
      { range: 2.6, rateBuff: 0.15, dmgBuff: 0 },
      { cost: 100, range: 2.7, rateBuff: 0.25, dmgBuff: 0 },
      { cost: 160, range: 2.8, rateBuff: 0.35, dmgBuff: 0.1 },
    ],
    branches: {
      A: { name: 'Кровожадность', desc: 'Огромная скорость атаки и периодическое неистовство (×2 скорость).', lv: [
        { cost: 280, range: 3.0, rateBuff: 0.5, dmgBuff: 0.15, frenzy: 4, frenzyEvery: 14 },
        { cost: 420, range: 3.2, rateBuff: 0.7, dmgBuff: 0.25, frenzy: 5, frenzyEvery: 12 } ] },
      B: { name: 'Знамя смерти', desc: 'Помечает врагов: они получают от всех башен на 20–35% больше урона.', lv: [
        { cost: 270, range: 3.0, rateBuff: 0.3, dmgBuff: 0.3, mark: 0.2 },
        { cost: 410, range: 3.2, rateBuff: 0.35, dmgBuff: 0.45, mark: 0.35 } ] },
    },
  },
};
TOWERS.flame = {
  name: 'Драконья пасть', cost: 120, air: false, ground: true,
  short: 'Конус пламени жжёт всех впереди. Огонь игнорирует броню. Только земля.',
  lv: [
    { dmg: 10.5, rate: 4, range: 2.2, burn: 12, burnT: 2, cone: 0.6 },
    { cost: 90, dmg: 13, rate: 4, range: 2.3, burn: 16, burnT: 2.2, cone: 0.62 },
    { cost: 150, dmg: 18, rate: 4.5, range: 2.5, burn: 25, burnT: 2.5, cone: 0.65 },
  ],
  branches: {
    A: { name: 'Дыхание дракона', desc: 'Длинный огненный язык и пылающая земля за целью.', lv: [
      { cost: 260, dmg: 26, rate: 4.5, range: 3.3, burn: 34, burnT: 3, trail: 25, cone: 0.5 },
      { cost: 400, dmg: 38, rate: 5, range: 3.8, burn: 50, burnT: 3.5, trail: 40, cone: 0.5 } ] },
    B: { name: 'Греческий огонь', desc: 'Горящие враги поджигают соседей: пламя бежит по толпе.', lv: [
      { cost: 250, dmg: 22, rate: 4.5, range: 2.6, burn: 40, burnT: 3, spread: 36, cone: 0.7 },
      { cost: 390, dmg: 30, rate: 5, range: 2.8, burn: 65, burnT: 3.5, spread: 46, cone: 0.75 } ] },
  },
};
TOWERS.voidwell = {
  name: 'Пустотный колодец', cost: 140, air: true, ground: true,
  short: 'Отбрасывает врагов назад по дороге: все башни получают больше времени на стрельбу.',
  lv: [
    { dmg: 11, rate: 0.2, range: 2.6, pull: 26, slow: 0.25, slowT: 1.5 },
    { cost: 100, dmg: 22, rate: 0.26, range: 2.8, pull: 42, slow: 0.35, slowT: 1.8 },
    { cost: 160, dmg: 36, rate: 0.28, range: 3.0, pull: 54, slow: 0.4, slowT: 2.0 },
  ],
  branches: {
    A: { name: 'Сингулярность', desc: 'Каждый 3-й импульс схлопывается: огромный урон всем в радиусе.', lv: [
      { cost: 270, dmg: 60, rate: 0.33, range: 3.2, pull: 56, collapse: 3, collapseMult: 4, slow: 0.4, slowT: 2 },
      { cost: 420, dmg: 90, rate: 0.36, range: 3.5, pull: 64, collapse: 3, collapseMult: 6, slow: 0.45, slowT: 2.2 } ] },
    B: { name: 'Петля времени', desc: 'Враги отлетают далеко назад и на мгновение замирают.', lv: [
      { cost: 260, dmg: 30, rate: 0.3, range: 3.0, pull: 105, stun: 0.6, slow: 0.4, slowT: 2 },
      { cost: 400, dmg: 50, rate: 0.34, range: 3.2, pull: 150, stun: 0.8, slow: 0.45, slowT: 2.2 } ] },
  },
};
TOWERS.harpoon = {
  name: 'Гарпунная баллиста', cost: 150, air: true, ground: true, defaultMode: 2,
  short: 'Дальнобойный снайпер: редкие мощные выстрелы по самому крепкому врагу. Тяжёлым врагам — больше урона.',
  lv: [
    { dmg: 80, rate: 0.4, range: 5.2, armorPierce: 0.6, heavyMult: 1.5 },
    { cost: 110, dmg: 155, rate: 0.42, range: 5.4, armorPierce: 0.6, heavyMult: 1.5 },
    { cost: 180, dmg: 240, rate: 0.45, range: 5.6, armorPierce: 0.7, heavyMult: 1.5 },
  ],
  branches: {
    A: { name: 'Цепной гарпун', desc: 'Пригвождает цель к земле на 2–3 секунды.', lv: [
      { cost: 300, dmg: 330, rate: 0.45, range: 5.8, anchor: 2.0, armorPierce: 0.8, heavyMult: 1.6 },
      { cost: 460, dmg: 470, rate: 0.5, range: 6.2, anchor: 3.0, armorPierce: 0.9, heavyMult: 1.8 } ] },
    B: { name: 'Взрывной гарпун', desc: 'Взрывается при попадании и разъедает броню всех рядом.', lv: [
      { cost: 290, dmg: 300, rate: 0.45, range: 5.8, splash: 1.2, shred: 0.4, heavyMult: 1.5 },
      { cost: 440, dmg: 440, rate: 0.5, range: 6.2, splash: 1.5, shred: 0.6, heavyMult: 1.6 } ] },
  },
};

// ───── Новые здания: Магнетто (притягивает врагов по дороге к себе), Гриндер (затягивает слабых в двери и перемалывает), Гигант (кидает валуны) ─────
TOWERS.magnet = {
  name: 'Магнетто', cost: 130, air: true, ground: true, utility: true,
  short: 'Не бьёт сам: мощный магнит стягивает врагов по дороге к башне, и они сбиваются в кучу.',
  lv: [
    { rate: 0.2, range: 2.8, pull: 70 },
    { cost: 110, rate: 0.22, range: 3.0, pull: 100 },
    { cost: 170, rate: 0.25, range: 3.2, pull: 130 },
  ],
  branches: {
    A: { name: 'Гравитация', desc: 'Огромный радиус и сила: стягивает толпу с половины карты.', lv: [
      { cost: 270, rate: 0.26, range: 3.7, pull: 190 },
      { cost: 410, rate: 0.3, range: 4.2, pull: 260 } ] },
    B: { name: 'Электромагнит', desc: 'Притягивает и оглушает: враги замирают в куче и получают разряд.', lv: [
      { cost: 260, rate: 0.26, range: 3.3, pull: 150, stun: 0.8, dmg: 30 },
      { cost: 400, rate: 0.3, range: 3.6, pull: 190, stun: 1.2, dmg: 60 } ] },
  },
};
TOWERS.grinder = {
  name: 'Гриндер', cost: 160, air: false, ground: true, grinder: true,
  short: 'Двери распахиваются, затягивают слабых врагов пачками и перемалывают в труху.',
  lv: [
    { rate: 0.33, range: 1.7, grind: 2, weak: 135, medium: 330 },
    { cost: 110, rate: 0.38, range: 1.85, grind: 3, weak: 135, medium: 330 },
    { cost: 180, rate: 0.42, range: 2.0, grind: 4, weak: 135, medium: 330 },
  ],
  branches: {
    A: { name: 'Мясорубка', desc: 'Огромная пасть: до 7 врагов за раз и быстрый цикл.', lv: [
      { cost: 300, rate: 0.5, range: 2.2, grind: 6, weak: 135, medium: 330 },
      { cost: 460, rate: 0.6, range: 2.5, grind: 8, weak: 135, medium: 330 } ] },
    B: { name: 'Дробилка', desc: 'Перемалывает и средних врагов даже без Магнетто; рядом с ним — тяжёлых.', lv: [
      { cost: 290, rate: 0.4, range: 2.1, grind: 4, weak: 260, medium: 480 },
      { cost: 450, rate: 0.45, range: 2.3, grind: 5, weak: 360, medium: 700 } ] },
  },
};
TOWERS.giant = {
  name: 'Гигант', cost: 220, air: false, ground: true, stages3: true, defaultMode: 2,
  short: 'Прикованный титан швыряет валуны: тяжёлый взрывной удар по площади. Три облика: камень, мрамор, огонь.',
  lv: [
    { dmg: 95, rate: 0.36, range: 4.0, splash: 1.0 },
    { cost: 150, dmg: 150, rate: 0.38, range: 4.2, splash: 1.1 },
    { cost: 240, dmg: 240, rate: 0.4, range: 4.4, splash: 1.2 },
  ],
  branches: {
    A: { name: 'Белый титан', desc: 'Валуны ледяного мрамора оглушают всех в зоне падения.', lv: [
      { cost: 330, dmg: 300, rate: 0.42, range: 4.6, splash: 1.3, quake: 0.8 },
      { cost: 500, dmg: 420, rate: 0.45, range: 4.9, splash: 1.45, quake: 1.2 } ] },
    B: { name: 'Огненный титан', desc: 'Раскалённые валуны: пылающая земля жжёт всех, кто идёт по ней.', lv: [
      { cost: 320, dmg: 330, rate: 0.42, range: 4.6, splash: 1.3, fire: 40, fireT: 4 },
      { cost: 490, dmg: 460, rate: 0.45, range: 4.9, splash: 1.45, fire: 70, fireT: 5.5 } ] },
  },
};
TOWERS.miner = {
    name: 'Минёр', cost: 100, air: false, ground: true, mines: true,
    short: 'Кладёт на дорогу мины: взрываются под первым врагом. Только земля.',
    lv: [
      { dmg: 70, rate: 0.18, range: 3.0, splash: 0.85, mines: 3 },
      { cost: 90, dmg: 100, rate: 0.2, range: 3.2, splash: 0.95, mines: 3 },
      { cost: 150, dmg: 145, rate: 0.22, range: 3.4, splash: 1.05, mines: 4 },
    ],
    branches: {
      A: { name: 'Липкие мины', desc: 'Взрыв замедляет всех в зоне на 40–50% на несколько секунд.', lv: [
        { cost: 260, dmg: 180, rate: 0.24, range: 3.6, splash: 1.15, mines: 4, slow: 0.4, slowT: 3 },
        { cost: 400, dmg: 250, rate: 0.27, range: 3.8, splash: 1.25, mines: 5, slow: 0.5, slowT: 3.5 } ] },
      B: { name: 'Кластер', desc: 'Мина разбрасывает вокруг мелкие бомбы, каждая взрывается отдельно.', lv: [
        { cost: 250, dmg: 140, rate: 0.24, range: 3.6, splash: 0.9, mines: 4, cluster: 4 },
        { cost: 390, dmg: 200, rate: 0.27, range: 3.8, splash: 0.95, mines: 6, cluster: 6 } ] },
    },
};
TOWERS.bell = {
    name: 'Колокольня', cost: 110, air: true, ground: true, pulse: true,
    short: 'Волна звона по большой площади. Летающих бьёт сильнее и оглушает, призраков не щадит.',
    lv: [
      { dmg: 30, rate: 0.29, range: 3.4, airMul: 1.5, gMul: 0.5, stunT: 0.8 },
      { cost: 100, dmg: 44, rate: 0.3, range: 3.6, airMul: 1.5, gMul: 0.5, stunT: 0.9 },
      { cost: 160, dmg: 64, rate: 0.32, range: 3.8, airMul: 1.5, gMul: 0.5, stunT: 1.0 },
    ],
    branches: {
      A: { name: 'Набат', desc: 'Враги в зоне звона получают от всех башен на 15–25% больше урона.', lv: [
        { cost: 270, dmg: 80, rate: 0.34, range: 4.0, airMul: 1.5, gMul: 0.5, stunT: 1.0, mark: 0.15, markT: 3 },
        { cost: 410, dmg: 110, rate: 0.36, range: 4.3, airMul: 1.5, gMul: 0.5, stunT: 1.1, mark: 0.25, markT: 3.5 } ] },
      B: { name: 'Соборный звон', desc: 'Огромный радиус и тяжёлый удар по всем врагам, не только по воздуху.', lv: [
        { cost: 280, dmg: 120, rate: 0.3, range: 4.4, airMul: 1.5, gMul: 0.8, stunT: 1.0 },
        { cost: 420, dmg: 170, rate: 0.32, range: 4.9, airMul: 1.5, gMul: 1.0, stunT: 1.2 } ] },
    },
};
TOWERS.pendulum = {
    name: 'Маятник', cost: 125, air: false, ground: true, swing: true,
    short: 'Топор-маятник бьёт всех в линии и отбрасывает назад. Только земля.',
    lv: [
      { dmg: 46, rate: 0.62, range: 2.6, push: 0.5 },
      { cost: 100, dmg: 68, rate: 0.64, range: 2.8, push: 0.55 },
      { cost: 165, dmg: 98, rate: 0.68, range: 3.0, push: 0.6 },
    ],
    branches: {
      A: { name: 'Кровавый замах', desc: 'Раны кровоточат и жгут врагов ещё несколько секунд.', lv: [
        { cost: 270, dmg: 120, rate: 0.7, range: 3.2, push: 0.6, bleed: 30, bleedT: 4 },
        { cost: 410, dmg: 165, rate: 0.74, range: 3.4, push: 0.65, bleed: 52, bleedT: 5 } ] },
      B: { name: 'Двойной замах', desc: 'Маятник бьёт дважды за один взмах. Длиннее линия удара.', lv: [
        { cost: 260, dmg: 100, rate: 0.7, range: 3.4, push: 0.6, twice: 1 },
        { cost: 400, dmg: 150, rate: 0.74, range: 3.7, push: 0.7, twice: 1 } ] },
    },
};
export const TOWER_ORDER = ['bolt', 'frost', 'mortar', 'tesla', 'toxic', 'saw', 'banner', 'flame', 'voidwell', 'harpoon', 'magnet', 'grinder', 'miner', 'bell', 'pendulum'];      // Гигант пока убран из игры (данные и картинки остались: вернуть — дописать 'giant' сюда и в UNLOCKS)

// ───────────────────────── Премиум-башни ─────────────────────────
// Продаются только за донат-кристаллы. Это усиленные версии обычных башен (та же механика и дерево улучшений, сильнее характеристики,
// свечение и значок короны). mult — множители характеристик, add — прибавки. В рейтинговом забеге премиум недоступен: условия равные.
export const PREMIUM_ORDER = ['gold_bolt', 'storm_tesla', 'hell_flame', 'thunder', 'winter', 'bloodstorm', 'plague'];
export const PREMIUM = {
  gold_bolt:   { base: 'bolt',  name: 'Золотой арбалет', gems: 150, costMul: 1.4, mult: { dmg: 1.7, rate: 1.25, range: 1.1 }, tint: '#ffd24a', short: 'Позолоченные болты: на 70% сильнее и быстрее обычного арбалета, бьёт дальше.' },
  storm_tesla: { base: 'tesla', name: 'Грозовой шпиль',  gems: 220, costMul: 1.4, mult: { dmg: 1.6, range: 1.15 }, add: { chains: 2 }, tint: '#7ad0ff', short: 'Молния перескакивает ещё на двух врагов и бьёт на 60% сильнее.' },
  thunder:     { base: 'mortar', name: 'Громобой', gems: 220, costMul: 1.4, mult: { dmg: 1.6, range: 1.2 }, add: { cluster: 3 }, tint: '#4ab0ff', short: 'Снаряд делится на три малые бомбы: бьёт на 60% сильнее и дальше обычной мортиры.' },
  winter:      { base: 'frost', name: 'Вечная зима', gems: 200, costMul: 1.4, mult: { dmg: 1.6, range: 1.15 }, add: { aura: 0.3 }, tint: '#8ae4ff', short: 'Постоянная аура: все враги вокруг замедлены. Ледяной шар разбрасывает осколки.' },
  bloodstorm:  { base: 'saw', name: 'Кровавый вихрь', gems: 240, costMul: 1.4, mult: { dmg: 1.5, rate: 1.15 }, add: { bounce: 3 }, tint: '#ff4a3a', short: 'Три окровавленные пилы: лезвие рикошетит между врагами и бьёт на 50% сильнее.' },
  plague:      { base: 'toxic', name: 'Чумной алхимик', gems: 230, costMul: 1.4, mult: { dmg: 1.5, poison: 1.5, splash: 1.3 }, add: { plague: 1.5 }, tint: '#8aff3a', short: 'Яд переходит на соседей при гибели цели, склянки и облако намного сильнее.' },
  hell_flame:  { base: 'flame', name: 'Адское пламя',    gems: 300, costMul: 1.4, mult: { dmg: 1.8, burn: 1.8, range: 1.15 }, tint: '#ff5a2a', short: 'Огненный конус почти вдвое мощнее: жжёт всех впереди и добивает ожогом.' },
};
// с какими башнями каждая работает лучше всего (строка-сноска в карточке); 'all' — со всеми боевыми башнями; у премиум-башен то же, что у базовой
const COMBO = { bolt: ['banner', 'frost'], frost: 'all', mortar: ['magnet', 'voidwell', 'frost'], tesla: ['frost', 'banner', 'toxic'], toxic: ['banner', 'magnet', 'voidwell'], saw: ['magnet', 'voidwell', 'frost'], banner: 'all',
  flame: ['voidwell', 'magnet', 'frost'], voidwell: ['mortar', 'flame', 'saw', 'toxic'], harpoon: ['frost', 'voidwell', 'banner'], magnet: ['grinder', 'mortar', 'saw'], grinder: ['magnet', 'voidwell'], miner: ['magnet', 'voidwell', 'frost'], bell: ['bolt', 'tesla', 'harpoon'], pendulum: ['grinder', 'magnet', 'frost'] };
for (const [id, c] of Object.entries(COMBO)) TOWERS[id].combo = c;
for (const id of PREMIUM_ORDER) { const p = PREMIUM[id], b = TOWERS[p.base]; TOWERS[id] = { ...b, name: p.name, short: p.short, cost: Math.round(b.cost * p.costMul), premium: true, base: p.base, tint: p.tint, mult: p.mult, add: p.add }; }
export const isPremium = (t) => !!(TOWERS[t] && TOWERS[t].premium);

// ───────────────────────── Экономика ─────────────────────────
// Цена здания добычи фиксирована: второй и следующие рудники стоят столько же, сколько первый (grow: 1)
export const ECON = {
  mine: {
    name: 'Золотой рудник', cost: 60, grow: 1, max: 8,
    short: 'Выбрасывает монеты золота. Тапни, чтобы забрать.',
    lv: [{ income: 8 }, { cost: 70, income: 18 }, { cost: 120, income: 30 }, { cost: 190, income: 46 }, { cost: 300, income: 68 }],
  },
  bank: {
    name: 'Банк', cost: 140, grow: 1, max: 2,
    short: 'Над банком появляется крупная монета: тапни, чтобы забрать. Здания добычи рядом приносят больше.',
    lv: [{ coin: 16, buff: 0.05, range: 2.3 }, { cost: 120, coin: 34, buff: 0.10, range: 2.3 }, { cost: 200, coin: 56, buff: 0.15, range: 2.3 }],
  },
  altar: {
    name: 'Алтарь крови', cost: 90, grow: 1, max: 4,
    short: 'Единственный источник золота с врагов: каждый враг, убитый рядом, приносит золото.',
    lv: [{ bonus: 2, range: 2.2 }, { cost: 80, bonus: 3, range: 2.3 }, { cost: 130, bonus: 5, range: 2.4 }, { cost: 200, bonus: 8, range: 2.5 }, { cost: 320, bonus: 12, range: 2.7 }],
  },
};
export const ECON_ORDER = ['mine', 'bank', 'altar'];

// Глобальные «безместные» вложения
export const WORKERS = { cost: 40, grow: 1.16, inc: 2, max: 14, name: 'Рабочие', short: 'Нанимай рабов: +2 золота за тик навсегда. Каждый следующий дороже.' };
export const HORDE = [
  { id: 'h1', name: 'Падальщики', cost: 30, grow: 1.12, inc: 2, spawn: ['hound', 3], short: '+2/тик · в след. волну +3 гончие' },
  { id: 'h2', name: 'Костяной отряд', cost: 90, grow: 1.12, inc: 6, spawn: ['skeleton', 3], short: '+6/тик · в след. волну +3 скелета' },
  { id: 'h3', name: 'Ходячие мертвецы', cost: 240, grow: 1.12, inc: 17, spawn: ['zombie', 3], short: '+17/тик · в след. волну +3 зомби' },
];
export const HORDE_MAX_PER_WAVE = 3;

// ───────────────────────── Заклинания ─────────────────────────
export const SPELLS = {
  meteor: { name: 'Метеор', cd: 40, dmg: 260, radius: 1.9, burn: 22, burnT: 4, short: 'Огненный удар по площади. Тапни по полю.', target: true },
  stasis: { name: 'Стазис', cd: 55, time: 3.5, short: 'Замораживает всех врагов на 3.5 с (тяжёлых лишь замедляет).', target: false },
  rush: { name: 'Золотая лихорадка', cd: 75, time: 15, short: 'Монеты и награды алтарей ×2 на 15 секунд.', target: false },
};
export const SPELL_ORDER = ['meteor', 'stasis', 'rush'];

// ───────────────────────── Враги ─────────────────────────
// blood: палитра крови/кусков. speed в px/сек (клетка = 48 px).
// pts — очки за убийство: только сильные и уникальные враги (слабая мелочь очков не даёт); у элитных +0.02
// строка-сноска под описанием башни: с какими башнями она работает вместе
export const comboText = (d) => (!d || !d.combo ? '' : d.combo === 'all' ? 'Отлично комбинируется со всеми боевыми башнями' : 'Комбинируется с: ' + d.combo.map((t) => TOWERS[t].name).join(', '));
export const ENEMIES = {
  // обычные: быстрые и средние (speed px/с, у гончей и мыши высокая, у зомби низкая)
  skeleton: { name: 'Скелет',         hp: 70,  spd: 42, gold: 0, lives: 1, size: 0.95, atk: 6,  immune: ['poison'], blood: 'bone' },
  zombie:   { name: 'Зомби',          hp: 130, spd: 30, gold: 0, lives: 1, size: 1.0,  atk: 6,  blood: 'dark' },
  goblin:   { name: 'Гоблин',         hp: 48,  spd: 62, gold: 0, lives: 1, size: 0.85, atk: 4,  blood: 'ooze' },
  mummy:    { name: 'Песчаная мумия', hp: 160, spd: 26, gold: 0, lives: 1, size: 1.05, atk: 8,  blood: 'sand', sector: 'desert' },
  hound:    { name: 'Адская гончая',  hp: 50,  spd: 82, gold: 0, lives: 1, size: 0.95, atk: 6,  blood: 'dark', sector: ['forest', 'hell'] },
  bat:      { name: 'Летучая мышь',   hp: 34,  spd: 80, gold: 0, lives: 1, size: 0.85, atk: 0,  air: true, blood: 'red' },
  slime:    { name: 'Слизень',        hp: 90,  spd: 34, gold: 0, lives: 1, size: 1.0,  atk: 5,  split: 'slimelet', immune: ['poison'], blood: 'ooze' },
  slimelet: { name: 'Слизнёныш',      hp: 28,  spd: 50, gold: 0, lives: 1, size: 0.6,  atk: 3,  immune: ['poison'], blood: 'ooze' },
  reaper:   { name: 'Жнец',           hp: 220, spd: 60, gold: 0, lives: 2, size: 1.0,  atk: 10, ghost: true, blink: 7, blood: 'ichor', pts: 0.03 },
  berserker: { name: 'Берсерк',       hp: 170, spd: 50, gold: 0, lives: 2, size: 1.05, atk: 14, enrage: true, blood: 'red', pts: 0.02 },
  gargoyle: { name: 'Горгулья',       hp: 140, spd: 58, gold: 0, lives: 1, size: 1.0,  atk: 0,  air: true, armor: 0.2, blood: 'bone', pts: 0.015 },
  // тяжёлые и уникальные: очень медленные, много здоровья, выходят по одному-два и нечасто (как в Kingdom Rush)
  knight:   { name: 'Чёрный рыцарь',  hp: 320, spd: 21, gold: 0, lives: 3, size: 1.05, atk: 12, armor: 0.2, heavy: true, blood: 'dark', pts: 0.03 },
  butcher:  { name: 'Мясник',         hp: 560, spd: 17, gold: 0, lives: 3, size: 1.3,  atk: 16, armor: 0.1, heavy: true, blood: 'red', pts: 0.04, sector: 'hell' },
  lich:     { name: 'Лич',            hp: 760, spd: 15, gold: 0, lives: 4, size: 1.4,  atk: 20, armor: 0.2, summon: 10, heavy: true, blood: 'bone', pts: 0.05 },
  yeti:     { name: 'Ледяной йети',   hp: 480, spd: 19, gold: 0, lives: 3, size: 1.3,  atk: 18, armor: 0.15, heavy: true, blood: 'ice', pts: 0.04, sector: 'ice' },
  ogre:     { name: 'Огр',            hp: 900, spd: 14, gold: 0, lives: 4, size: 1.45, atk: 22, armor: 0.2, stomp: 9, heavy: true, blood: 'red', pts: 0.06 },
  // ───── новые монстры по секторам (sector: появляются только на картах своего сектора) ─────
  anubis:    { name: 'Анубис',           hp: 300,  spd: 34, gold: 0, lives: 2, size: 1.1,  atk: 12, armor: 0.15, blood: 'dark', pts: 0.03, sector: 'desert' },
  djinn:     { name: 'Злой джинн',       hp: 240,  spd: 46, gold: 0, lives: 1, size: 1.05, atk: 10, ghost: true, blink: 7, blood: 'ichor', pts: 0.03, sector: 'desert' },
  sandgolem: { name: 'Песчаный голем',   hp: 640,  spd: 16, gold: 0, lives: 3, size: 1.35, atk: 18, armor: 0.25, heavy: true, blood: 'sand', pts: 0.045, sector: 'desert' },
  pharaoh:   { name: 'Мумия фараона',    hp: 1000, spd: 15, gold: 0, lives: 4, size: 1.5,  atk: 22, armor: 0.2, summon: 12, heavy: true, blood: 'sand', pts: 0.06, sector: 'desert' },
  wolf:      { name: 'Снежный волк',    hp: 85,   spd: 86, gold: 0, lives: 1, size: 0.95, atk: 7,  blood: 'red', sector: 'ice' },
  iceskel:   { name: 'Ледяной скелет',   hp: 120,  spd: 40, gold: 0, lives: 1, size: 1.0,  atk: 8,  immune: ['poison'], blood: 'ice', sector: 'ice' },
  snowgolem: { name: 'Снежный голем',    hp: 600,  spd: 17, gold: 0, lives: 3, size: 1.3,  atk: 18, armor: 0.1, heavy: true, blood: 'ice', pts: 0.04, sector: 'ice' },
  ultrayeti: { name: 'Ультра-йети',      hp: 1300, spd: 18, gold: 0, lives: 4, size: 1.55, atk: 26, armor: 0.25, heavy: true, blood: 'ice', pts: 0.07, sector: 'ice' },
  imp:       { name: 'Бес',              hp: 60,   spd: 72, gold: 0, lives: 1, size: 0.85, atk: 6,  blood: 'red', sector: 'hell' },
  pinky:     { name: 'Бычий демон',      hp: 230,  spd: 56, gold: 0, lives: 2, size: 1.15, atk: 14, armor: 0.1, enrage: true, blood: 'red', pts: 0.02, sector: 'hell' },
  lavagolem: { name: 'Лавовый голем',    hp: 820,  spd: 15, gold: 0, lives: 3, size: 1.35, atk: 20, armor: 0.25, heavy: true, blood: 'dark', pts: 0.05, sector: 'hell' },
  baron:     { name: 'Барон ада',        hp: 1500, spd: 14, gold: 0, lives: 5, size: 1.6,  atk: 28, armor: 0.2, stomp: 8, heavy: true, blood: 'red', pts: 0.08, sector: 'hell' },
};
export const HEAVY_CAP = { yeti: 2, knight: 3, butcher: 2, lich: 1, ogre: 2, sandgolem: 2, pharaoh: 1, snowgolem: 2, ultrayeti: 1, lavagolem: 2, baron: 1 };      // не больше стольких за волну

// Масштаб здоровья/награды по номеру волны
export const TUNE = { hp1: 0.10, hp2: 0.0075, gold1: 0.035, bud1: 0.075, bud2: 0.25 };      // bud1/bud2 — рост «бюджета» волны (числа врагов) с номером рубежа
export const hpScale = (n) => 1 + TUNE.hp1 * (n - 1) + TUNE.hp2 * (n - 1) * (n - 1);
export const goldScale = (n) => 1 + TUNE.gold1 * (n - 1);

// Волны: [тип, кол-во, интервал между юнитами сек]; группы идут последовательно.
const G = (t, c, i = 1) => [t, c, i];
// Бонус за ранний вызов волны платится только за вторую половину паузы: пока осталось больше половины времени, считается лишь превышение над половиной.
export const EARLY_FROM = 0;
export const waveGap = (n) => 26 + Math.min(8, n * 0.25);   // пауза после того, как волна целиком вышла на дорогу: время подумать или вызвать следующую волну раньше

// ───── Волны кампании ─────
// Чем дальше уровень, тем больше волн, врагов и видов врагов. Кладбище и лес (первые два сектора): только простая нежить.
// Враги открываются по номеру уровня; боссы — только в последней волне трёх поздних уровней.
const UNLOCK_LV = { skeleton: 1, zombie: 2, goblin: 3, hound: 5, bat: 8, mummy: 9, slime: 10, knight: 11, butcher: 12, gargoyle: 13, yeti: 14, berserker: 14, ogre: 16, reaper: 17, lich: 18,
  anubis: 10, djinn: 11, sandgolem: 11, pharaoh: 12, wolf: 13, iceskel: 14, snowgolem: 15, ultrayeti: 16, imp: 17, pinky: 18, lavagolem: 18, baron: 19 };
const COST = { skeleton: 1.2, zombie: 1.8, goblin: 1.4, mummy: 2.4, hound: 2.0, bat: 1.2, slime: 2.8, knight: 8, butcher: 11, gargoyle: 4.8, yeti: 14, berserker: 6, ogre: 20, reaper: 9.5, lich: 18, anubis: 6.5, djinn: 5.5, sandgolem: 13, pharaoh: 21, wolf: 1.8, iceskel: 2.6, snowgolem: 12.5, ultrayeti: 26, imp: 1.6, pinky: 5, lavagolem: 17, baron: 29 };
const IVAL = { skeleton: 1.0, zombie: 1.4, goblin: 0.9, mummy: 1.5, hound: 0.8, bat: 0.9, slime: 1.3, knight: 3, butcher: 4, gargoyle: 1.4, yeti: 4.5, berserker: 1.4, ogre: 5, reaper: 1.8, lich: 5, anubis: 2.2, djinn: 1.6, sandgolem: 4.5, pharaoh: 5, wolf: 0.7, iceskel: 1.2, snowgolem: 4.5, ultrayeti: 5, imp: 0.8, pinky: 1.5, lavagolem: 4.5, baron: 5 };
// «эквивалентный» номер волны на кривой 1..30: нужен для роста здоровья врагов
export const eqWave = (L, n, T) => { const s = 1 + (L - 1) * 0.25, e = 7 + (L - 1) * 2.4; return Math.max(1, Math.round(T > 1 ? s + ((e - s) * (n - 1)) / (T - 1) : s)); };
// своя локация у монстра (sector: строка или список); у общих (скелет, зомби, гоблин, мышь, слизень, рыцарь, жнец, берсерк, горгулья, лич, огр) поля нет: они везде
const inSector = (t, sec) => { const x = ENEMIES[t].sector; return !x || (Array.isArray(x) ? x.includes(sec) : x === sec); };
export function genWave(L, n, T, tier = 0) {        // tier — сдвиг сложности: на высоких сложностях виды врагов и размер волн берутся как с более поздних уровней
  let a = (L * 1009 + n * 7919) | 0; const R = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const W0 = (LEVELS[L - 1] && LEVELS[L - 1].wavesFull) || T, nv = T > 1 ? 1 + ((n - 1) * (1 + 0.35 * (W0 - T) / (T - 1))) : n;      // при сжатии уровня до 15 волн каждая волна чуть сильнее (экономика копится по времени, поэтому сжимаем лишь на треть)
  const Le = L + tier;                                      // «эффективный» уровень: от него зависят виды врагов, бюджет волны и частота новых видов
  const budget = 3 + (nv - 1) * (1.0 + TUNE.bud1 * Le) + TUNE.bud2 * Le;
  const STRONG = ['knight', 'butcher', 'yeti', 'ogre', 'reaper', 'berserker', 'lich', 'sandgolem', 'pharaoh', 'snowgolem', 'ultrayeti', 'lavagolem', 'baron', 'anubis', 'pinky'], SIDE = ['bat', 'gargoyle'];     // сильные — не в первых волнах уровня; лекарь и летуны — не основа волны
  const sec = LEVELS[L - 1] && LEVELS[L - 1].sector;       // монстры сектора выходят только на его картах
  const avail = Object.keys(UNLOCK_LV).filter((t) => UNLOCK_LV[t] <= Le && inSector(t, sec) && !(L === 2 && t === 'zombie' && n < 2) && !(n < Math.max(5, T * 0.45) && STRONG.includes(t)) && !(Le === UNLOCK_LV[t] && Le > 2 && n < T * 0.4));        // новый вид выходит в середине своего уровня, а сильные — не в первых волнах
  const w = (t) => (1 + R()) * (UNLOCK_LV[t] <= 2 ? 1.3 : Math.min(1, 0.25 + (Le - UNLOCK_LV[t] + n / T) / 2.5)) / (1 + Math.max(0, Le - UNLOCK_LV[t] - 6) * 0.12) * (HEAVY_CAP[t] ? 0.45 : 1);          // новые виды сначала редки, потом становятся обычными; совсем старые — реже
  const picks = [], pool = [...avail], k = Math.min(pool.length, 1 + (n >= 3 ? 1 : 0) + (n >= T * 0.6 && Le >= 5 ? 1 : 0));
  while (picks.length < k) {
    const ok = picks.length ? pool : pool.filter((t) => !SIDE.includes(t)), src = ok.length ? ok : pool;
    const ws = src.map(w), sum = ws.reduce((x, y) => x + y, 0); let r = R() * sum, i = 0; while (i < src.length - 1 && (r -= ws[i]) > 0) i++;
    const t = src[i]; picks.push(t); pool.splice(pool.indexOf(t), 1);
    if (HEAVY_CAP[t]) for (let q = pool.length - 1; q >= 0; q--) if (HEAVY_CAP[pool[q]]) pool.splice(q, 1);      // второго тяжёлого в этой волне не будет
  }
  const shares = [0.55, 0.3, 0.15].slice(0, k), tot = shares.reduce((x, y) => x + y, 0);
  const out = picks.map((t, i) => [t, Math.max(1, Math.round((budget * (shares[i] / tot)) / COST[t])), Math.max(0.5, IVAL[t] * (1 - 0.008 * L))]);
  let spare = 0;
  for (const g of out) { const cap = HEAVY_CAP[g[0]]; if (cap && g[1] > cap) { spare += (g[1] - cap) * COST[g[0]]; g[1] = cap; } }
  const main = out.find((g) => !HEAVY_CAP[g[0]]); if (main && spare) main[1] += Math.round(spare / COST[main[0]]);      // сэкономленное на тяжёлых уходит в обычных
  return out;
}
export const FIRST_WAVE_DELAY = 30;
// какие виды врагов появятся на уровне (для загрузки только нужных листов): все из волн, их порождения и вызванные; гоблин, скелет и зомби нужны для орд
export function levelTypes(map, tier = 0) {
  const s = new Set(['skeleton', 'zombie']);
  if (map.waveList) for (const w of map.waveList) for (const g of w) s.add(g[0]);
  else for (let n = 1; n <= map.waves; n++) for (const g of genWave(map.lvl, n, map.waves, tier)) s.add(g[0]);
  for (const t of [...s]) { const d = ENEMIES[t]; if (d && d.split) s.add(d.split); }
  return [...s];
}

// Утилиты данных
export function legacyStats(type, level, branch) {
  const d = TOWERS[type];
  const base = {};
  const lv = d.lv;
  for (let i = 0; i < Math.min(level, 3); i++) Object.assign(base, lv[i]);
  if (level > 3 && branch) {
    const bl = d.branches[branch].lv;
    Object.assign(base, bl[0]);
    if (level > 4) Object.assign(base, bl[1]);
  }
  delete base.cost;
  return base;
}
// ───────────────────────── Дерево улучшений ─────────────────────────
// Ур.1 → [выбор из 3] → ур.2 → [выбор из 3] → ур.3 → [ветка A/B] → ур.4 → ур.5 (вершина ветки).
// Стили выбора: power (красный), speed (жёлтый), special (зелёный).
export const PICK_STYLE = { power: { color: '#ff5a4a', icon: 'dmg' }, speed: { color: '#ffd24a', icon: 'rate' }, special: { color: '#6aff7a', icon: 'range' } };
const P = (id, name, o) => ({ id, name, ...o });
export const TIERS = {
  bolt: [
    [P('power', 'Тяжёлые болты', { mul: { dmg: 1.55 } }), P('speed', 'Лёгкий взвод', { mul: { rate: 1.6 } }), P('special', 'Зоркий глаз', { mul: { range: 1.2, dmg: 1.3 } })],
    [P('power', 'Стальные наконечники', { mul: { dmg: 1.65 }, add: { armorPierce: 0.2 } }), P('speed', 'Двойная тетива', { mul: { rate: 1.55 } }), P('special', 'Длинный лук', { mul: { range: 1.15, dmg: 1.35 } })],
  ],
  mortar: [
    [P('power', 'Крупный калибр', { mul: { dmg: 1.5 } }), P('speed', 'Скорый затвор', { mul: { rate: 1.6 } }), P('special', 'Широкий разрыв', { mul: { splash: 1.3, dmg: 1.2 } })],
    [P('power', 'Фугасные', { mul: { dmg: 1.6 } }), P('speed', 'Автозарядка', { mul: { rate: 1.5 } }), P('special', 'Осколочные', { mul: { splash: 1.25, dmg: 1.3 } })],
  ],
  tesla: [
    [P('power', 'Мощный разряд', { mul: { dmg: 1.5 } }), P('speed', 'Быстрая катушка', { mul: { rate: 1.55 } }), P('special', 'Длинная цепь', { mul: { dmg: 1.2 }, add: { chains: 1 } })],
    [P('power', 'Перегрузка', { mul: { dmg: 1.6 } }), P('speed', 'Резонанс', { mul: { rate: 1.5 } }), P('special', 'Разветвление', { mul: { dmg: 1.2, falloff: 1.03 }, add: { chains: 2 } })],
  ],
  frost: [
    [P('power', 'Ледяные копья', { mul: { dmg: 2.2 }, add: { slow: 0.05 } }), P('speed', 'Стужа', { mul: { rate: 1.4, slowT: 1.2 } }), P('special', 'Вечный холод', { add: { slow: 0.1 }, mul: { slowT: 1.2 } })],
    [P('power', 'Алмазные шипы', { mul: { dmg: 2 }, set: { freeze: 0.1, freezeT: 1.0 } }), P('speed', 'Метель', { mul: { rate: 1.35 }, add: { slow: 0.05 } }), P('special', 'Глубокая заморозка', { add: { slow: 0.1 }, set: { freeze: 0.14, freezeT: 1.2 } })],
  ],
  toxic: [
    [P('power', 'Концентрат', { mul: { poison: 1.55, dmg: 1.4 } }), P('speed', 'Быстрый перегон', { mul: { rate: 1.6 } }), P('special', 'Липкий яд', { add: { stacks: 1 }, mul: { poisonT: 1.3, splash: 1.15 } })],
    [P('power', 'Нейротоксин', { mul: { poison: 1.6 } }), P('speed', 'Конвейер склянок', { mul: { rate: 1.5 } }), P('special', 'Ядовитое облако', { add: { stacks: 1 }, mul: { splash: 1.15, poison: 1.25 } })],
  ],
  saw: [
    [P('power', 'Крупные зубья', { mul: { dmg: 1.55 } }), P('speed', 'Раскрутка', { mul: { rate: 1.6 } }), P('special', 'Длинный рычаг', { mul: { range: 1.2, dmg: 1.3 } })],
    [P('power', 'Закалённая сталь', { mul: { dmg: 1.65 } }), P('speed', 'Турбина', { mul: { rate: 1.55 } }), P('special', 'Широкий замах', { mul: { range: 1.15, dmg: 1.35 } })],
  ],
  banner: [
    [P('power', 'Боевой клич', { mul: { rateBuff: 1.6 } }), P('speed', 'Ярость', { add: { dmgBuff: 0.12 } }), P('special', 'Дальний горн', { add: { range: 0.4 }, mul: { rateBuff: 1.2 } })],
    [P('power', 'Барабаны войны', { mul: { rateBuff: 1.5 } }), P('speed', 'Кровавая песнь', { add: { dmgBuff: 0.12 } }), P('special', 'Горн тревоги', { add: { range: 0.4 }, mul: { rateBuff: 1.2 } })],
  ],
  flame: [
    [P('power', 'Густая смесь', { mul: { dmg: 1.5, burn: 1.4 } }), P('speed', 'Форсунка', { mul: { rate: 1.45 } }), P('special', 'Длинное сопло', { add: { range: 0.3, cone: 0.05 } })],
    [P('power', 'Напалм', { mul: { dmg: 1.5, burn: 1.5 } }), P('speed', 'Турбонаддув', { mul: { rate: 1.4 } }), P('special', 'Раструб', { add: { range: 0.3 }, mul: { burn: 1.3 } })],
  ],
  voidwell: [
    [P('power', 'Давление', { mul: { dmg: 1.8 } }), P('speed', 'Частые импульсы', { mul: { rate: 1.45 } }), P('special', 'Притяжение', { mul: { pull: 1.5 }, add: { range: 0.2 } })],
    [P('power', 'Разрыв ткани', { mul: { dmg: 1.7 } }), P('speed', 'Резонанс бездны', { mul: { rate: 1.4 } }), P('special', 'Горизонт событий', { mul: { pull: 1.35 }, add: { range: 0.2, slow: 0.1 } })],
  ],
  magnet: [
    [P('power', 'Сильное поле', { mul: { pull: 1.5 } }), P('speed', 'Частые импульсы', { mul: { rate: 1.45 } }), P('special', 'Широкое поле', { add: { range: 0.4 }, mul: { pull: 1.2 } })],
    [P('power', 'Сверхпроводник', { mul: { pull: 1.5 } }), P('speed', 'Разгон катушек', { mul: { rate: 1.4 } }), P('special', 'Дальний полюс', { add: { range: 0.4 }, mul: { pull: 1.2 } })],
  ],
  grinder: [
    [P('power', 'Широкая пасть', { add: { grind: 1 } }), P('speed', 'Быстрые валы', { mul: { rate: 1.5 } }), P('special', 'Крепкие зубья', { add: { range: 0.25 }, mul: { weak: 1.35 } })],
    [P('power', 'Ненасытность', { add: { grind: 2 } }), P('speed', 'Турбина', { mul: { rate: 1.45 } }), P('special', 'Стальные катки', { add: { range: 0.25 }, mul: { weak: 1.35, medium: 1.25 } })],
  ],
  giant: [
    [P('power', 'Тяжёлые глыбы', { mul: { dmg: 1.6 } }), P('speed', 'Крепкая хватка', { mul: { rate: 1.45 } }), P('special', 'Дробящий удар', { mul: { splash: 1.3, dmg: 1.25 } })],
    [P('power', 'Скальные валуны', { mul: { dmg: 1.7 } }), P('speed', 'Не знает усталости', { mul: { rate: 1.4 } }), P('special', 'Землетрясение', { mul: { splash: 1.25, dmg: 1.3 }, add: { range: 0.3 } })],
  ],
  harpoon: [
    [P('power', 'Тяжёлый гарпун', { mul: { dmg: 1.65 } }), P('speed', 'Лебёдка', { mul: { rate: 1.35 } }), P('special', 'Оптика', { add: { range: 0.4, armorPierce: 0.1 } })],
    [P('power', 'Зазубрины', { mul: { dmg: 1.75 } }), P('speed', 'Скоростной ворот', { mul: { rate: 1.3 } }), P('special', 'Дальний прицел', { add: { range: 0.4, armorPierce: 0.1 } })],
  ],
  miner: [
    [P('power', 'Тяжёлый заряд', { mul: { dmg: 1.5 } }), P('speed', 'Быстрая закладка', { mul: { rate: 1.6 } }), P('special', 'Широкий взрыв', { mul: { splash: 1.3, dmg: 1.2 } })],
    [P('power', 'Фугас', { mul: { dmg: 1.6 } }), P('speed', 'Запас мин', { mul: { rate: 1.3 }, add: { mines: 1 } }), P('special', 'Дальний бросок', { add: { range: 0.4 }, mul: { splash: 1.2, dmg: 1.2 } })],
  ],
  bell: [
    [P('power', 'Тяжёлый язык', { mul: { dmg: 1.6 } }), P('speed', 'Частый звон', { mul: { rate: 1.45 } }), P('special', 'Гулкая медь', { add: { range: 0.4 }, mul: { dmg: 1.2 } })],
    [P('power', 'Литая бронза', { mul: { dmg: 1.6 } }), P('speed', 'Двойной канат', { mul: { rate: 1.4 } }), P('special', 'Раскат', { add: { range: 0.4 }, mul: { dmg: 1.25 } })],
  ],
  pendulum: [
    [P('power', 'Тяжёлое лезвие', { mul: { dmg: 1.55 } }), P('speed', 'Лёгкий ход', { mul: { rate: 1.5 } }), P('special', 'Длинная цепь', { add: { range: 0.4 }, mul: { dmg: 1.25 } })],
    [P('power', 'Закалённая сталь', { mul: { dmg: 1.6 } }), P('speed', 'Смазанная ось', { mul: { rate: 1.45 } }), P('special', 'Удлинённый замах', { add: { range: 0.4, push: 0.15 }, mul: { dmg: 1.2 } })],
  ],
};
const RATIO_KEYS = ['dmg', 'rate', 'range', 'splash', 'rateBuff', 'dmgBuff', 'poison', 'burn', 'pull'];
const LOWER_KEYS = ['frenzyEvery', 'collapse'];
function applyOpt(s, o) {
  if (o.mul) for (const k of Object.keys(o.mul)) if (s[k] !== undefined) s[k] *= o.mul[k];
  if (o.add) for (const k of Object.keys(o.add)) s[k] = (s[k] || 0) + o.add[k];
  if (o.set) Object.assign(s, o.set);
}
// Критический удар: шанс даёт только перк «Меткость» в Кузнице (0…50%), у самих башен шанса нет.
// Сила крита появляется с 3-го уровня башни и растёт с каждым следующим; крит бывает у башен с физическими снарядами.
export const CRIT_TOWERS = ['bolt', 'mortar', 'harpoon'];
export const CRIT_FROM_LEVEL = 3;
export const critMultOf = (type, level, branch) => (CRIT_TOWERS.includes(type) && level >= CRIT_FROM_LEVEL ? 1.5 + 0.5 * (level - CRIT_FROM_LEVEL) + (type === 'bolt' && branch === 'B' && level >= 4 ? 0.5 : 0) : 0);
export function towerStats(type, level, branch, picks = [0, 0]) {
  if (isPremium(type)) {                                   // премиум = характеристики базовой башни × множители
    const d0 = TOWERS[type], s0 = towerStats(d0.base, level, branch, picks);
    for (const k of Object.keys(d0.mult || {})) if (s0[k] !== undefined) s0[k] *= d0.mult[k];
    for (const k of Object.keys(d0.add || {})) s0[k] = (s0[k] || 0) + d0.add[k];
    return s0;
  }
  const d = TOWERS[type];
  const s = { ...d.lv[0] }; delete s.cost;
  for (let t = 0; t < 2; t++) if (level >= t + 2 && picks[t]) applyOpt(s, TIERS[type][t][picks[t] - 1]);
  if (level >= 4 && branch) {
    const base3 = legacyStats(type, 3, null), tgt = legacyStats(type, level, branch);
    for (const k of Object.keys(tgt)) {
      const tv = tgt[k];
      if (typeof tv !== 'number') { s[k] = tv; continue; }
      if (RATIO_KEYS.includes(k) && base3[k]) s[k] = (s[k] ?? base3[k]) * (tv / base3[k]);
      else if (LOWER_KEYS.includes(k)) s[k] = s[k] === undefined ? tv : Math.min(s[k], tv);
      else s[k] = Math.max(s[k] ?? 0, tv);
    }
  }
  const cm = critMultOf(type, level, branch); if (cm) s.critMult = cm;
  return s;
}
// Варианты следующего улучшения для UI
export const maxLevelOf = (type) => (TOWERS[type] && TOWERS[type].premium ? 3 : 5);      // у премиум-башен три уровня (три картинки), у остальных пять
export function upgradeOptions(type, level, branch, picks, maxLv = 5) {
  if (level >= maxLv) return [];
  const cost = towerUpgradeCost(type, level, branch), d = TOWERS[type], cur = towerStats(type, level, branch, picks);
  const diff = (n) => { const out = []; for (const k of Object.keys(n)) if (typeof n[k] === 'number' && Math.abs((cur[k] ?? 0) - n[k]) > 1e-6) out.push({ k, from: cur[k] ?? 0, to: n[k] }); return out; };
  if (level <= 2) {
    const t = level - 1;
    return TIERS[type][t].map((o, i) => { const np = picks.slice(); np[t] = i + 1; return { kind: 'pick', choice: i + 1, id: o.id, name: o.name, cost, level: level + 1, branch: null, picks: np, delta: diff(towerStats(type, level + 1, null, np)) }; });
  }
  if (level === 3) return ['A', 'B'].map((br) => ({ kind: 'branch', choice: br, id: br, name: d.branches[br].name, desc: d.branches[br].desc, cost: d.branches[br].lv[0].cost, level: 4, branch: br, picks, delta: diff(towerStats(type, 4, br, picks)) }));
  return [{ kind: 'final', choice: 'F', id: branch, name: d.branches[branch].name + ' II', cost, level: 5, branch, picks, delta: diff(towerStats(type, 5, branch, picks)) }];
}
export function towerUpgradeCost(type, level, branch) {
  const d = TOWERS[type];
  if (level >= 5) return null;
  if (level < 3) return d.lv[level].cost;
  if (!branch) return null;
  return d.branches[branch].lv[level - 3].cost;
}
export function econStats(type, level) {
  const d = ECON[type]; const s = {};
  for (let i = 0; i < level; i++) Object.assign(s, d.lv[i]);
  delete s.cost; return s;
}
export function econUpgradeCost(type, level) {
  const d = ECON[type]; return level >= d.lv.length ? null : d.lv[level].cost;
}

// Закрытые вещи: открываются в Кузнице за души или за донат-кристаллы. Свободны с начала только арбалет и рудник.
export const UNLOCKS = {
  magnet: { souls: 350, gems: 47 }, grinder: { souls: 425, gems: 57 },
  frost: { souls: 40, gems: 5 }, toxic: { souls: 55, gems: 8 }, mortar: { souls: 75, gems: 10 },
  flame: { souls: 125, gems: 17 }, banner: { souls: 150, gems: 20 }, saw: { souls: 190, gems: 25 }, harpoon: { souls: 240, gems: 32 }, tesla: { souls: 290, gems: 38 },
  bank: { souls: 260, gems: 43 }, voidwell: { souls: 400, gems: 53 }, altar: { souls: 380, gems: 63 },
  bell: { souls: 210, gems: 29 }, miner: { souls: 250, gems: 34 }, pendulum: { souls: 300, gems: 40 },
};
export const unlockOf = (type) => UNLOCKS[type] || (isPremium(type) ? { gems: PREMIUM[type].gems, premium: true } : undefined);

// Слоты: сколько зданий можно взять в бой. В начале 2, максимум 5; следующий слот покупается в Кузнице (индекс = число слотов, который у тебя уже есть).
export const SLOT_START = 2, SLOT_MAX = 5;
export const SLOT_COST = { 2: { souls: 250, gems: 40 }, 3: { souls: 700, gems: 110 }, 4: { souls: 1600, gems: 260 } };
export const RUN_SLOTS = 5;       // в рейтинговом забеге у всех максимум слотов

// ───────────────────────── Очки ─────────────────────────
// Очки дают только: пройденные волны, сильные/уникальные враги и скорость прохождения уровня (бонус за время — при победе); пропущенные в ворота враги снимают очки.
// Чем дальше уровень, тем больше множитель (LEVEL_STEP), сверху множитель сложности (DIFFS[].score).
export const LEVEL_STEP = 0.15;
export const WAVE_PTS = (idx) => 0.12 + 0.012 * idx;           // за полностью побеждённую волну (idx — «сила» волны 1..30)
export const TIME_PTS = 0.23;                                     // максимум бонуса за время = TIME_PTS × число волн
export const LEAK_FRAC = 0.06;                                   // штраф за каждую потерянную жизнь: доля от возможных очков за волны и время уровня
export const levelMult = (index) => 1 + LEVEL_STEP * Math.max(0, index - 1);


// ───────────────────────── Магазин: кристаллы за Telegram Stars ─────────────────────────
// Один кристалл дёшев (≈0,2 ⭐), но тратить их есть на что постоянно: слоты, закрытые здания, премиум-башни и одноразовые усилители,
// цена которых растёт с глубиной уровня. Цены продублированы на сервере (supabase/schema.sql, private.gem_price) — клиенту верить нельзя.
export const PACKS = [
  { id: 'p1', stars: 15,   gems: 60,   tag: '' },
  { id: 'p2', stars: 50,   gems: 220,  tag: '' },
  { id: 'p3', stars: 100,  gems: 480,  tag: 'hit' },
  { id: 'p4', stars: 250,  gems: 1300, tag: '' },
  { id: 'p5', stars: 500,  gems: 2800, tag: '' },
  { id: 'p6', stars: 1000, gems: 6000, tag: 'best' },
];
export const STARTER = { stars: 25, gems: 300, souls: 300, tower: 'gold_bolt' };      // один раз на аккаунт
export const FIRST_BONUS = 2;                                                           // первая покупка каждого пакета: кристаллов ×2
export const DAILY = [25, 25, 40, 30, 50, 60, 120];                                            // ежедневный подарок — ДУШИ (не кристаллы), серия 7 дней
export const BOOSTS = {
  gold:  { name: 'Золотой старт', short: '+100 золота на старте уровня', base: 3 },
  lives: { name: 'Запас жизней',  short: '+5 жизней (не действует на «Ночном кошмаре»)', base: 5 },
  souls: { name: 'Свиток душ',    short: 'Души за уровень ×1,5', base: 6 },
};
export const REVIVE = { lives: 5 };                                                       // возрождение у ворот: столько жизней за цену усилителя «Запас жизней» (цену считает сервер)
export const BOOST_ORDER = ['gold', 'lives', 'souls'];
export const boostPrice = (id, lvl) => Math.ceil(BOOSTS[id].base * (1 + 0.1 * Math.max(0, lvl - 1)));      // чем дальше уровень, тем дороже
