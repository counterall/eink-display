import { Solar } from 'lunar-javascript';

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

let cachedLunar = null;

// Chinese lunar date for the calendar day shown in the header, always in
// Chinese, e.g. 农历九月廿八, 农历闰六月初一, 农历腊月廿三. `localDate` is the
// shifted UTC date used for the primary city's clock, so the lunar date
// changes at the primary city's midnight together with the Gregorian date.
export function lunarDateName(localDate) {
  const time = localDate && localDate.getTime();
  if (!Number.isFinite(time)) return '—';
  const year = localDate.getUTCFullYear(), month = localDate.getUTCMonth() + 1, day = localDate.getUTCDate();
  const key = `${year}-${month}-${day}`;
  if (cachedLunar && cachedLunar.key === key) return cachedLunar.name;
  const lunar = Solar.fromYmd(year, month, day).getLunar();
  cachedLunar = { key, name: `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}` };
  return cachedLunar.name;
}

export function solarTermName(now) {
  const term = currentSolarTerm(now);
  if (!term) return '—';
  return term.name;
}
