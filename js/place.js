// Место в мире на плите итогов: «Место 2 из 87 в мире» и похвала по проценту («Лишь 3% игроков в мире набрали столько — молодец!»).
// Фразы собраны целиком на каждом языке (с числами внутри), а не кусками через словарь i18n: так правильный порядок слов.
import { lang } from './i18n.js?v=20261109140352';

const T = {
  ru: ['Место {r} из {t} в мире', 'Лучший результат в мире на этом уровне!', 'Лишь {p}% игроков в мире набрали столько очков — молодец!', 'Ты в лучших {p}% игроков мира на этом уровне', 'Ты обошёл {q}% игроков. Сыграй ещё — поднимись выше!', 'Сыграй ещё — поднимись выше!'],
  en: ['Rank {r} of {t} worldwide', 'Best score in the world on this level!', 'Only {p}% of players worldwide scored this many points — well done!', 'You are in the top {p}% of players on this level', 'You beat {q}% of players. Play again to climb higher!', 'Play again to climb higher!'],
  uk: ['Місце {r} з {t} у світі', 'Найкращий результат у світі на цьому рівні!', 'Лише {p}% гравців у світі набрали стільки очок — молодець!', 'Ти серед найкращих {p}% гравців світу на цьому рівні', 'Ти обійшов {q}% гравців. Зіграй ще — піднімись вище!', 'Зіграй ще — піднімись вище!'],
  es: ['Puesto {r} de {t} en el mundo', '¡El mejor resultado del mundo en este nivel!', '¡Solo el {p}% de los jugadores del mundo sumó tantos puntos! ¡Bien hecho!', 'Estás en el {p}% superior de jugadores en este nivel', 'Superaste al {q}% de los jugadores. ¡Juega otra vez y sube más!', '¡Juega otra vez y sube más!'],
  pt: ['Posição {r} de {t} no mundo', 'Melhor resultado do mundo neste nível!', 'Só {p}% dos jogadores do mundo fizeram tantos pontos — parabéns!', 'Você está entre os {p}% melhores jogadores deste nível', 'Você superou {q}% dos jogadores. Jogue de novo e suba mais!', 'Jogue de novo e suba mais!'],
  de: ['Platz {r} von {t} weltweit', 'Bestes Ergebnis der Welt auf diesem Level!', 'Nur {p}% der Spieler weltweit haben so viele Punkte geholt — stark!', 'Du gehörst zu den besten {p}% auf diesem Level', 'Du hast {q}% der Spieler übertroffen. Spiel nochmal und steig weiter auf!', 'Spiel nochmal und steig weiter auf!'],
  tr: ['Dünyada {t} oyuncu arasında {r}. sıra', 'Bu seviyede dünyanın en iyi sonucu!', 'Dünyadaki oyuncuların yalnızca %{p}’i bu kadar puan topladı — tebrikler!', 'Bu seviyede oyuncuların en iyi %{p}’indesin', 'Oyuncuların %{q}’ini geçtin. Tekrar oyna, daha yükseğe çık!', 'Tekrar oyna, daha yükseğe çık!'],
  fr: ['{r}e sur {t} dans le monde', 'Meilleur score mondial sur ce niveau !', 'Seuls {p} % des joueurs du monde ont marqué autant de points — bravo !', 'Tu es dans les {p} % meilleurs joueurs de ce niveau', 'Tu as battu {q} % des joueurs. Rejoue pour grimper !', 'Rejoue pour grimper !'],
  it: ['{r}° su {t} nel mondo', 'Miglior risultato al mondo in questo livello!', 'Solo il {p}% dei giocatori al mondo ha fatto così tanti punti — bravo!', 'Sei nel {p}% dei migliori giocatori di questo livello', 'Hai superato il {q}% dei giocatori. Rigioca e sali ancora!', 'Rigioca e sali ancora!'],
  pl: ['Miejsce {r} z {t} na świecie', 'Najlepszy wynik na świecie na tym poziomie!', 'Tylko {p}% graczy na świecie zdobyło tyle punktów — brawo!', 'Jesteś w najlepszych {p}% graczy na tym poziomie', 'Wyprzedziłeś {q}% graczy. Zagraj jeszcze i wejdź wyżej!', 'Zagraj jeszcze i wejdź wyżej!'],
  id: ['Peringkat {r} dari {t} di dunia', 'Skor terbaik di dunia di level ini!', 'Hanya {p}% pemain di dunia meraih poin sebanyak ini — hebat!', 'Kamu termasuk {p}% pemain terbaik di level ini', 'Kamu mengalahkan {q}% pemain. Main lagi dan naik lebih tinggi!', 'Main lagi dan naik lebih tinggi!'],
  vi: ['Hạng {r}/{t} thế giới', 'Kết quả tốt nhất thế giới ở màn này!', 'Chỉ {p}% người chơi thế giới đạt nhiều điểm như vậy — giỏi lắm!', 'Bạn nằm trong top {p}% người chơi ở màn này', 'Bạn vượt qua {q}% người chơi. Chơi lại để leo cao hơn!', 'Chơi lại để leo cao hơn!'],
  ar: ['المركز {r} من {t} عالميًا', 'أفضل نتيجة في العالم في هذا المستوى!', 'فقط {p}% من لاعبي العالم جمعوا هذا العدد من النقاط — أحسنت!', 'أنت ضمن أفضل {p}% من اللاعبين في هذا المستوى', 'تفوقت على {q}% من اللاعبين. العب مجددًا لتصعد أعلى!', 'العب مجددًا لتصعد أعلى!'],
  fa: ['رتبه {r} از {t} در جهان', 'بهترین نتیجه جهان در این مرحله!', 'فقط {p}٪ بازیکنان جهان این‌قدر امتیاز گرفتند — آفرین!', 'تو جزو {p}٪ برتر بازیکنان این مرحله هستی', 'از {q}٪ بازیکنان جلو زدی. دوباره بازی کن و بالاتر برو!', 'دوباره بازی کن و بالاتر برو!'],
  hi: ['दुनिया में {t} में से {r}वाँ स्थान', 'इस लेवल पर दुनिया का सबसे अच्छा स्कोर!', 'दुनिया के सिर्फ़ {p}% खिलाड़ी इतने अंक बना पाए — शाबाश!', 'तुम इस लेवल के शीर्ष {p}% खिलाड़ियों में हो', 'तुमने {q}% खिलाड़ियों को पीछे छोड़ा। फिर खेलो और ऊपर जाओ!', 'फिर खेलो और ऊपर जाओ!'],
  uz: ['Dunyoda {t} tadan {r}-oʻrin', 'Bu darajada dunyodagi eng yaxshi natija!', 'Dunyodagi oʻyinchilarning atigi {p}% shuncha ball toʻpladi — barakalla!', 'Sen bu darajadagi eng yaxshi {p}% oʻyinchilar qatoridasan', 'Sen oʻyinchilarning {q}% dan oʻzib ketding. Yana oʻyna — yuqoriroq chiq!', 'Yana oʻyna — yuqoriroq chiq!'],
  kk: ['Әлемде {t} ішінен {r}-орын', 'Бұл деңгейдегі әлемдегі ең үздік нәтиже!', 'Әлемдегі ойыншылардың тек {p}% осынша ұпай жинады — жарайсың!', 'Сен бұл деңгейдегі үздік {p}% ойыншының қатарындасың', 'Сен ойыншылардың {q}% озып кеттің. Тағы ойна — жоғары көтеріл!', 'Тағы ойна — жоғары көтеріл!'],
  zh: ['全球第 {r} 名（共 {t} 人）', '本关全球最佳成绩！', '全球只有 {p}% 的玩家拿到这么多分——太棒了！', '你是本关前 {p}% 的玩家', '你超过了 {q}% 的玩家。再玩一次，冲得更高！', '再玩一次，冲得更高！'],
  ja: ['世界 {t} 人中 {r} 位', 'このステージで世界最高スコア！', '世界のプレイヤーのうちこれだけのポイントを取れたのはわずか {p}%——すごい！', 'このステージの上位 {p}% のプレイヤーです', 'プレイヤーの {q}% を上回りました。もう一度プレイして上を目指そう！', 'もう一度プレイして上を目指そう！'],
};

// { place: «Место 2 из 87 в мире», praise: похвала }; rank — место (1 — лучший), total — сколько игроков на уровне
export function placeText(rank, total) {
  const L = T[lang] || T.en, fill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k]);
  const raw = (rank / Math.max(total, 1)) * 100, p = Math.max(0.1, Math.round(raw * 10) / 10), q = Math.max(0, Math.round((100 - raw) * 10) / 10);      // доли процента: «2,7%»
  let nf; try { nf = new Intl.NumberFormat(lang + '-u-nu-latn', { maximumFractionDigits: 1 }); } catch (e) { nf = new Intl.NumberFormat('en', { maximumFractionDigits: 1 }); }
  const f1 = (v) => nf.format(v);
  const em = (v) => `<em class="pc">${v}</em>`;                                // процент в похвале выделен (вместе со знаком %, где бы он ни стоял в языке)
  const hi = (txt) => txt.replace(/(%|٪)?<em class="pc">([\d.,٫]+)<\/em>(\s?(?:%|٪))?/g, (m, a, n, b) => em((a || '') + n + (b || '')));
  const praise = hi(rank === 1 ? L[1] : p <= 10 ? fill(L[2], { p: em(f1(p)) }) : p <= 50 ? fill(L[3], { p: em(f1(p)) }) : q > 0 ? fill(L[4], { q: em(f1(q)) }) : L[5]);
  return { place: fill(L[0], { r: rank, t: total }), praise, pct: rank === 1 ? 0 : p };
}

// Пирамида редкости (как у трофеев PlayStation): 4 яруса, подсвечен тот, в который попал игрок — вершина у лучших 5%, затем 15%, 50% и остальные
export function pyramidSvg(pct) {
  const tier = pct <= 5 ? 0 : pct <= 15 ? 1 : pct <= 50 ? 2 : 3;
  // ярусы сверху вниз: трапеции между уровнями y (вершина — треугольник), ширина растёт к основанию
  const ys = [4, 16, 27, 38, 49], half = (y) => (y - 4) * 0.62;
  const band = (i) => {
    const y0 = ys[i] + (i ? 1.4 : 0), y1 = ys[i + 1], a = half(y0), b = half(y1);
    const pts = i === 0 ? `30,${y0} ${30 + b},${y1} ${30 - b},${y1}` : `${30 - a},${y0} ${30 + a},${y0} ${30 + b},${y1} ${30 - b},${y1}`;
    const on = i === tier;
    return `<polygon points="${pts}" fill="${on ? 'url(#pyg)' : 'url(#pys)'}" stroke="${on ? '#fff6d0' : '#b8a578'}" stroke-width="${on ? 1.6 : 1.1}" stroke-linejoin="round"/>`;
  };
  return `<svg class="er-pyr" viewBox="0 0 60 52" width="56" height="49" aria-hidden="true"><defs><linearGradient id="pys" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a7d60"/><stop offset="1" stop-color="#5a5040"/></linearGradient><linearGradient id="pyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".55" stop-color="#f2b830"/><stop offset="1" stop-color="#a86a10"/></linearGradient><filter id="pyf" filterUnits="userSpaceOnUse" x="-10" y="-10" width="80" height="72"><feGaussianBlur stdDeviation="3"/></filter></defs>`
    + `<g opacity=".9" filter="url(#pyf)">${band(tier).replace('url(#pyg)', '#ffcf55')}</g>${[0, 1, 2, 3].map(band).join('')}</svg>`;
}
