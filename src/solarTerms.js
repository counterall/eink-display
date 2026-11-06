import { Solar } from 'lunar-javascript';

const ENGLISH_NAMES = {
  立春: 'Start of Spring', 雨水: 'Rain Water', 惊蛰: 'Waking of Insects', 春分: 'Spring Equinox',
  清明: 'Pure Brightness', 谷雨: 'Grain Rain', 立夏: 'Start of Summer', 小满: 'Grain Buds',
  芒种: 'Grain in Ear', 夏至: 'Summer Solstice', 小暑: 'Minor Heat', 大暑: 'Major Heat',
  立秋: 'Start of Autumn', 处暑: 'End of Heat', 白露: 'White Dew', 秋分: 'Autumn Equinox',
  寒露: 'Cold Dew', 霜降: 'Frost’s Descent', 立冬: 'Start of Winter', 小雪: 'Minor Snow',
  大雪: 'Major Snow', 冬至: 'Winter Solstice', 小寒: 'Minor Cold', 大寒: 'Major Cold',
};

let cachedTerm = null;

// The calendar library returns solar-term instants in China Standard Time.
// Convert explicitly, without relying on the device's locale or system timezone.
function utcTimestamp(solar) {
  return Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour() - 8, solar.getMinute(), solar.getSecond());
}

export function currentSolarTerm(now = new Date()) {
  const time = now.getTime();
  if (!Number.isFinite(time)) return null;
  if (cachedTerm && time >= cachedTerm.start && time < cachedTerm.end) return cachedTerm;

  const china = new Date(time + 8 * 3600000);
  const solar = Solar.fromYmdHms(china.getUTCFullYear(), china.getUTCMonth() + 1, china.getUTCDate(), china.getUTCHours(), china.getUTCMinutes(), china.getUTCSeconds());
  const lunar = solar.getLunar();
  const previous = lunar.getPrevJieQi(false);
  const next = lunar.getNextJieQi(false);
  if (!previous || !next) return null;
  cachedTerm = {
    name: previous.getName(),
    start: utcTimestamp(previous.getSolar()),
    end: utcTimestamp(next.getSolar()),
  };
  return cachedTerm;
}

export function solarTermName(now, language) {
  const term = currentSolarTerm(now);
  if (!term) return '—';
  return language === 'en' ? ENGLISH_NAMES[term.name] || term.name : term.name;
}
