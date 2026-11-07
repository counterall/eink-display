// All user-visible strings. Each table must have identical keys for zh and en
// (enforced by src/i18n.test.js). Repository descriptions are never translated.

export const pick = (table, language) => table[language === 'zh' ? 'zh' : 'en'];

export const APP_TEXT = {
  zh: {
    primary: '主城市', secondary: '第二城市', today: '今天', swap: '交换城市', settings: '设置',
    sunrise: '日出', sunset: '日落', polarDay: '极昼 · 全天日照', polarNight: '极夜 · 今日无日出',
    forecast: '今日预报', empty: '暂无天气数据',
    current: '当前气温（最近更新时）',
    failed: '更新失败，请检查网络', stale: '缓存数据 · 可能已过期',
    updated: '更新于', close: '完成', language: '语言', format: '时间格式',
    hour12: '12 小时', hour24: '24 小时', rotation: '页面方向', auto: '自动横向', none: '不旋转', cw: '顺时针 90°', ccw: '逆时针 90°',
    note: '天气按赫尔辛基时间每 2 小时更新（00:00、02:00、04:00…）。休眠时暂停，恢复后补查。',
    lofoten: '罗弗敦群岛以斯沃尔韦尔坐标为代表。', source: '天气数据：Open-Meteo',
    fetching: '更新中…', solarTerm: '当前节气（北京时间）', lunarDate: '农历日期', feedsArea: '资讯区域',
    partialFailed: '部分更新失败', partial: '部分天气未更新', updateNote: '两地天气均至少更新至此时（主城市时间）',
    displayReference: '适配参考：Kindle 1072 × 1448（横向 1448 × 1072）',
    viewport: '浏览器视口', layout: '页面布局', pixelRatio: '像素比',
    rightColumn: '右侧资讯栏', show: '显示', hide: '隐藏（全屏时间）',
  },
  en: {
    primary: 'PRIMARY CITY', secondary: 'SECOND CITY', today: 'Today', swap: 'Swap cities', settings: 'Settings',
    sunrise: 'Sunrise', sunset: 'Sunset', polarDay: 'Polar day · sun stays up', polarNight: 'Polar night · no sunrise',
    forecast: 'TODAY’S FORECAST', empty: 'No weather data yet',
    current: 'Current temperature at last update',
    failed: 'Update failed. Check connection.', stale: 'Cached forecast · may be outdated',
    updated: 'Updated', close: 'Done', language: 'Language', format: 'Time format',
    hour12: '12 hour', hour24: '24 hour', rotation: 'Page orientation', auto: 'Auto landscape', none: 'No rotation', cw: 'Clockwise 90°', ccw: 'Counterclockwise 90°',
    note: 'Weather updates every 2 hours in Helsinki time (00:00, 02:00, 04:00…). It catches up when the page resumes.',
    lofoten: 'Lofoten uses the coordinates of Svolvær.', source: 'Weather data: Open-Meteo',
    fetching: 'Updating…', solarTerm: 'Current solar term (China Standard Time)', lunarDate: 'Chinese lunar date', feedsArea: 'Feeds',
    partialFailed: 'Some updates failed', partial: 'Some weather is unavailable', updateNote: 'Older of the two weather updates, in the primary city’s time',
    displayReference: 'Reference: Kindle 1072 × 1448 (landscape 1448 × 1072)',
    viewport: 'Browser viewport', layout: 'Page layout', pixelRatio: 'Pixel ratio',
    rightColumn: 'Right-hand feeds', show: 'Show', hide: 'Hide (fullscreen time)',
  },
};

export const TRENDING_TEXT = {
  zh: { title: 'GitHub · 本周热门', updated: '榜单更新', week: '本周', source: '查看官方周榜', note: '官方榜单顺序 · 每日更新', loading: '正在读取榜单…', failed: '暂时无法读取榜单', cached: '读取失败 · 保留上次榜单', stale: '榜单更新可能已延迟', description: '暂无项目简介', language: '未标注语言' },
  en: { title: 'GitHub · Weekly trending', updated: 'Updated', week: 'this week', source: 'View official list', note: 'Official ranking · updated daily', loading: 'Loading repositories…', failed: 'Trending is unavailable', cached: 'Offline · keeping the last snapshot', stale: 'Snapshot may be outdated', description: 'No description provided', language: 'Not specified' },
};

export const WORKDAY_TEXT = {
  zh: { title: '工作时间', until: '离下班还有', rest: '下班啦 好好休息！', weekend: '周末啦 不用上班！' },
  en: { title: 'Work hours', until: 'Off work in', rest: 'Work is over. Enjoy your rest!', weekend: 'It’s the weekend. No work today!' },
};

export const THEME_TEXT = {
  zh: { label: '深色模式', dark: '切换为深色模式', light: '切换为浅色模式' },
  en: { label: 'Dark mode', dark: 'Switch to dark mode', light: 'Switch to light mode' },
};
