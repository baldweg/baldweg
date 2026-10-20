import Holidays from 'date-holidays';
import {
  addDays, eachDayOfInterval, eachMonthOfInterval, endOfMonth,
  format, isValid, parseISO, startOfMonth,
} from 'date-fns';

export const STATES = [
  ['BW', 'Baden-Württemberg'], ['BY', 'Bayern'], ['BE', 'Berlin'],
  ['BB', 'Brandenburg'], ['HB', 'Bremen'], ['HH', 'Hamburg'],
  ['HE', 'Hessen'], ['MV', 'Mecklenburg-Vorpommern'], ['NI', 'Niedersachsen'],
  ['NW', 'Nordrhein-Westfalen'], ['RP', 'Rheinland-Pfalz'], ['SL', 'Saarland'],
  ['SN', 'Sachsen'], ['ST', 'Sachsen-Anhalt'], ['SH', 'Schleswig-Holstein'],
  ['TH', 'Thüringen'],
] as const;

export type HolidayMap = Map<string, string>;
export type Region = 'state' | 'catholic' | 'augsburg' | 'sorbian';
export const keyOf = (date: Date) => format(date, 'yyyy-MM-dd');
export const displayDate = (key: string) => format(parseISO(key), 'dd.MM.yyyy');
export const numberOf = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: 1 });
export const weekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;
export function validRange(from: string, to: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)
    && isValid(parseISO(from)) && isValid(parseISO(to))
    && from >= '1970-01-01' && to <= '2099-12-31' && from <= to;
}

export function holidaysFor(state: string, region: Region, from: string, to: string): HolidayMap {
  const result: HolidayMap = new Map();
  const calendar = new Holidays('DE', state, { languages: ['de'] });
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
    for (const holiday of calendar.getHolidays(year)) {
      if (holiday.type === 'public') result.set(holiday.date.slice(0, 10), holiday.name);
    }
    if (state === 'BY' && (region === 'catholic' || region === 'augsburg')) {
      result.set(`${year}-08-15`, 'Mariä Himmelfahrt');
    }
    if (state === 'BY' && region === 'augsburg') {
      result.set(`${year}-08-08`, 'Augsburger Friedensfest');
    }
    if ((state === 'SN' || state === 'TH') && region === 'sorbian') {
      // Fronleichnam is 60 days after Easter Sunday.
      const easter = calendar.getHolidays(year).find(h => h.rule === 'easter');
      if (!easter) throw new Error(`Ostersonntag für ${year} konnte nicht ermittelt werden.`);
      result.set(keyOf(addDays(parseISO(easter.date.slice(0, 10)), 60)), 'Fronleichnam');
    }
  }
  return result;
}

export function selectable(key: string, holidays: HolidayMap, workWeekends = false) {
  return (workWeekends || !weekend(parseISO(key))) && !holidays.has(key);
}

export function dayCost(key: string, halfDays: boolean) {
  return halfDays && (key.endsWith('-12-24') || key.endsWith('-12-31')) ? 0.5 : 1;
}

export function monthsFor(from: string, to: string) {
  return eachMonthOfInterval({ start: parseISO(from), end: parseISO(to) });
}

export function monthDays(month: Date) {
  return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
}

export function chooseRange(from: string, to: string, holidays: HolidayMap, workWeekends = false) {
  return eachDayOfInterval({ start: parseISO(from), end: parseISO(to) })
    .map(keyOf).filter(key => selectable(key, holidays, workWeekends));
}

export interface VacationBlock {
  days: string[];
  cost: number;
  freeFrom: string;
  freeTo: string;
  freeDays: number;
}

export function vacationBlocks(selected: Set<string>, holidays: HolidayMap, halfDays: boolean, workWeekends = false): VacationBlock[] {
  const groups: string[][] = [];
  for (const key of [...selected].sort()) {
    const group = groups.at(-1);
    const previous = group?.at(-1);
    const connected = previous && eachDayOfInterval({
      start: addDays(parseISO(previous), 1), end: parseISO(key),
    }).every(date => keyOf(date) === key || !selectable(keyOf(date), holidays, workWeekends));
    if (group && connected) group.push(key);
    else groups.push([key]);
  }
  return groups.map(days => {
    let start = parseISO(days[0]);
    let end = parseISO(days[days.length - 1]);
    // Half-day leave still contains work, so it cannot connect full days off.
    if (dayCost(days[0], halfDays) === 1) {
      while (!selectable(keyOf(addDays(start, -1)), holidays, workWeekends)) start = addDays(start, -1);
    }
    if (dayCost(days[days.length - 1], halfDays) === 1) {
      while (!selectable(keyOf(addDays(end, 1)), holidays, workWeekends)) end = addDays(end, 1);
    }
    return {
      days, cost: days.reduce((sum, key) => sum + dayCost(key, halfDays), 0),
      freeFrom: keyOf(start), freeTo: keyOf(end),
      freeDays: days.some(key => dayCost(key, halfDays) < 1)
        ? 0 : eachDayOfInterval({ start, end }).length,
    };
  });
}
