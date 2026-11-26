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
    hour12: '12 小时', hour24: '24 小时',
    note: '天气按赫尔辛基时间每 2 小时更新（00:00、02:00、04:00…）。休眠时暂停，恢复后补查。',
    lofoten: '罗弗敦群岛以斯沃尔韦尔坐标为代表。', source: '天气数据：Open-Meteo',
    fetching: '更新中…', solarTerm: '当前节气（北京时间）', lunarDate: '农历日期', feedsArea: '资讯区域',
    partialFailed: '部分更新失败', partial: '部分天气未更新', updateNote: '两地天气均至少更新至此时（主城市时间）',
    viewport: '浏览器视口', pixelRatio: '像素比',
    rightColumn: '右侧资讯栏', show: '显示', hide: '隐藏（全屏时间）',
    zoomIn: '放大', zoomOut: '缩小',
    breakReminder: '休息提醒', on: '开', off: '关', breakNow: '立即',
    breakNotification: '休息通知', notificationBlocked: '通知已被浏览器屏蔽，请在浏览器设置中允许本站通知。',
    theme: '主题', theme_light: '浅色', theme_dark: '深色', theme_sky: '天蓝', theme_sage: '鼠尾草绿', theme_lavender: '薰衣草紫', theme_mint: '薄荷绿',
    clockStyle: '时钟样式', clock_classic: '经典', clock_flip: '翻页',
    carouselInterval: '轮播间隔', interval_10: '10 分钟', interval_30: '30 分钟', interval_60: '1 小时',
  },
  en: {
    primary: 'PRIMARY CITY', secondary: 'SECOND CITY', today: 'Today', swap: 'Swap cities', settings: 'Settings',
    sunrise: 'Sunrise', sunset: 'Sunset', polarDay: 'Polar day · sun stays up', polarNight: 'Polar night · no sunrise',
    forecast: 'TODAY’S FORECAST', empty: 'No weather data yet',
    current: 'Current temperature at last update',
    failed: 'Update failed. Check connection.', stale: 'Cached forecast · may be outdated',
    updated: 'Updated', close: 'Done', language: 'Language', format: 'Time format',
    hour12: '12 hour', hour24: '24 hour',
    note: 'Weather updates every 2 hours in Helsinki time (00:00, 02:00, 04:00…). It catches up when the page resumes.',
    lofoten: 'Lofoten uses the coordinates of Svolvær.', source: 'Weather data: Open-Meteo',
    fetching: 'Updating…', solarTerm: 'Current solar term (China Standard Time)', lunarDate: 'Chinese lunar date', feedsArea: 'Feeds',
    partialFailed: 'Some updates failed', partial: 'Some weather is unavailable', updateNote: 'Older of the two weather updates, in the primary city’s time',
    viewport: 'Browser viewport', pixelRatio: 'Pixel ratio',
    rightColumn: 'Right-hand feeds', show: 'Show', hide: 'Hide (fullscreen time)',
    zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    breakReminder: 'Break reminder', on: 'On', off: 'Off', breakNow: 'Now',
    breakNotification: 'Break notification', notificationBlocked: 'Notifications are blocked. Allow them for this site in the browser settings.',
    theme: 'Theme', theme_light: 'Light', theme_dark: 'Dark', theme_sky: 'Sky', theme_sage: 'Sage', theme_lavender: 'Lavender', theme_mint: 'Mint',
    clockStyle: 'Clock style', clock_classic: 'Classic', clock_flip: 'Flip',
    carouselInterval: 'Carousel interval', interval_10: '10 min', interval_30: '30 min', interval_60: '1 hour',
  },
};

export const TRENDING_TEXT = {
  zh: { title_weekly: 'GitHub · 本周热门', title_daily: 'GitHub · 今日热门', updated: '榜单更新', stars_weekly: '本周', stars_daily: '今日', source_weekly: '查看官方周榜', source_daily: '查看官方日榜', note: '官方榜单顺序 · 每日更新', loading: '正在读取榜单…', failed: '暂时无法读取榜单', cached: '读取失败 · 保留上次榜单', stale: '榜单更新可能已延迟', description: '暂无项目简介', language: '未标注语言' },
  en: { title_weekly: 'GitHub · Weekly trending', title_daily: 'GitHub · Daily trending', updated: 'Updated', stars_weekly: 'this week', stars_daily: 'today', source_weekly: 'View official list', source_daily: 'View official list', note: 'Official ranking · updated daily', loading: 'Loading repositories…', failed: 'Trending is unavailable', cached: 'Offline · keeping the last snapshot', stale: 'Snapshot may be outdated', description: 'No description provided', language: 'Not specified' },
};

// Right-column carousel (issue #23). {n}, {total} and {name} are filled in by TrendingCarousel.
export const CAROUSEL_TEXT = {
  zh: { label: 'GitHub 热门轮播', previous: '上一张', next: '下一张', slide: '第 {n} 张，共 {total} 张：{name}', slideGroup: '第 {n} 张，共 {total} 张', name_weekly: '本周热门', name_daily: '今日热门' },
  en: { label: 'GitHub trending carousel', previous: 'Previous slide', next: 'Next slide', slide: 'Slide {n} of {total}: {name}', slideGroup: 'Slide {n} of {total}', name_weekly: 'weekly trending', name_daily: 'daily trending' },
};

export const WORKDAY_TEXT = {
  zh: { title: '工作时间', until: '离下班还有', toGo: '后下班', worked: '已工作', rest: '下班啦 好好休息！', weekend: '周末啦 不用上班！', start: '开始工作' },
  en: { title: 'Work hours', until: 'Off work in', toGo: 'to go', worked: 'worked', rest: 'Work is over. Enjoy your rest!', weekend: 'It’s the weekend. No work today!', start: 'Start work' },
};

export const THEME_TEXT = {
  zh: { label: '深色模式', dark: '切换为深色模式', light: '切换为浅色模式' },
  en: { label: 'Dark mode', dark: 'Switch to dark mode', light: 'Switch to light mode' },
};

export const BREAK_TEXT = {
  zh: { title: 'Take a break', notification: 'Take a break ☕', duration: '休息时间', minutesSuffix: '分钟', later: '下次吧', start: '开始吧', resting: '继续休息', close: '关闭', progress: '已休息时间', welcome: '新的一天开始啦 注意休息呀' },
  en: { title: 'Take a break', notification: 'Take a break ☕', duration: 'Break length', minutesSuffix: ' min', later: 'Maybe later', start: 'Let’s go', resting: 'Keep resting', close: 'Close', progress: 'Break elapsed', welcome: 'A new day begins. Remember to take breaks!' },
};
