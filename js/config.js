// Настройки подключения к Supabase (проект HellTD, регион ap-southeast-2).
// Publishable-ключ ПУБЛИЧНЫЙ: его безопасно хранить в клиенте (права ограничены функциями из supabase/schema.sql).
// Secret-ключ (sb_secret_…) сюда класть НЕЛЬЗЯ.
export const SUPABASE_URL = 'https://sqhbrxjefabzybwtcvkt.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_DsExdZ4Wa0nJST1N_iRMMQ_9DXMWG_Q';
// Ссылка на мини-приложение в Telegram (https://t.me/<бот>/<короткое имя приложения>): по ней друзья приглашаются как «?startapp=f<твой id>». Пока пусто — кнопка приглашения подскажет заполнить.
// Реклама за награду: номера блоков AdsGram (partner.adsgram.ai → площадка Baalgor). Пусто — место без рекламы (кнопка не показывается).
// gems — кристаллы в магазине (у этого блока в кабинете задан Reward URL на функцию ad-reward), chest — сундук сверх бесплатного,
// revive — жизни при поражении, souls — двойные души за победу.
export const ADS = { gems: '58246', chest: '58247', revive: '58248', souls: '58249' };      // площадка Baalgor, PlatformID 55058
export const APP_LINK = 'https://t.me/baalgor_bot';      // если у приложения есть короткое имя из /newapp, впиши полную ссылку: https://t.me/BloodKeepTD_bot/<имя>
