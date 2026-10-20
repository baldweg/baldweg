import { describe, expect, it } from 'vitest';
import {
  STATES, chooseRange, dayCost, holidaysFor, keyOf, monthDays,
  monthsFor, selectable, validRange, vacationBlocks,
} from './planner';

describe('Kalender und Feiertage', () => {
  it('zeigt ausschließlich berührte Monate, auch über Jahresgrenzen', () => {
    expect(monthsFor('2026-11-15', '2027-02-03').map(keyOf))
      .toEqual(['2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01']);
    expect(monthDays(new Date(2028, 1, 1))).toHaveLength(29);
  });

  it('validiert Datumseingaben und Reihenfolge', () => {
    expect(validRange('2026-01-01', '2026-01-01')).toBe(true);
    expect(validRange('', '2026-01-01')).toBe(false);
    expect(validRange('2026-02-30', '2026-03-01')).toBe(false);
    expect(validRange('2027-01-01', '2026-01-01')).toBe(false);
    expect(validRange('1969-01-01', '2026-01-01')).toBe(false);
  });

  it.each(STATES)('berücksichtigt bundesweite Feiertage in %s', state => {
    const holidays = holidaysFor(state, 'state', '2026-01-01', '2026-12-31');
    expect(holidays.get('2026-01-01')).toBe('Neujahr');
    expect(holidays.has('2026-04-03')).toBe(true);
    expect(holidays.has('2026-04-06')).toBe(true);
    expect(holidays.has('2026-12-24')).toBe(false);
  });

  it('unterscheidet landesspezifische und regionale Feiertage', () => {
    const get = (state: string, region: Parameters<typeof holidaysFor>[1] = 'state') =>
      holidaysFor(state, region, '2026-01-01', '2026-12-31');
    expect(get('BE').has('2026-03-08')).toBe(true);
    expect(get('NW').has('2026-03-08')).toBe(false);
    expect(get('SN').has('2026-11-18')).toBe(true);
    expect(get('BY').has('2026-08-15')).toBe(false);
    expect(get('BY', 'catholic').has('2026-08-15')).toBe(true);
    expect(get('BY', 'augsburg').has('2026-08-08')).toBe(true);
    expect(get('SN').has('2026-06-04')).toBe(false);
    expect(get('SN', 'sorbian').has('2026-06-04')).toBe(true);
    expect(get('TH', 'sorbian').has('2026-06-04')).toBe(true);
    expect(get('BB').get('2026-04-05')).toBe('Ostersonntag');
  });
});

describe('Urlaubsberechnung', () => {
  const holidays = holidaysFor('NW', 'state', '2025-01-01', '2028-12-31');

  it('wählt nur Arbeitstage, ohne Wochenenden und Feiertage', () => {
    expect(chooseRange('2026-04-02', '2026-04-07', holidays)).toEqual(['2026-04-02', '2026-04-07']);
    expect(selectable('2026-04-04', holidays)).toBe(false);
    expect(chooseRange('2026-04-03', '2026-04-06', holidays)).toEqual([]);
  });

  it('verbindet Auszeiten über arbeitsfreie Tage, aber nicht über Arbeitstage', () => {
    const result = vacationBlocks(new Set(['2026-04-02', '2026-04-07', '2026-04-09']), holidays, false);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ cost: 2, freeFrom: '2026-04-02', freeTo: '2026-04-07', freeDays: 6 });
  });

  it('rechnet angrenzende Wochenenden und Feiertage ein', () => {
    expect(vacationBlocks(new Set(['2027-05-10', '2027-05-11', '2027-05-12', '2027-05-13', '2027-05-14']), holidays, false)[0])
      .toMatchObject({ cost: 5, freeFrom: '2027-05-08', freeTo: '2027-05-17', freeDays: 10 });
    expect(vacationBlocks(new Set(['2026-12-31']), holidays, false)[0])
      .toMatchObject({ freeTo: '2027-01-03', freeDays: 4 });
  });

  it('berechnet die Halbtagsregel exakt und behauptet keine volle Freizeit', () => {
    const days = new Set(['2026-12-24', '2026-12-31']);
    expect(vacationBlocks(days, holidays, true).reduce((sum, b) => sum + b.cost, 0)).toBe(1);
    expect(vacationBlocks(days, holidays, false).reduce((sum, b) => sum + b.cost, 0)).toBe(2);
    expect(vacationBlocks(days, holidays, true).every(b => b.freeDays === 0)).toBe(true);
    expect(dayCost('2026-12-23', true)).toBe(1);
  });

  it('verarbeitet leere und unsortierte Auswahlen', () => {
    expect(vacationBlocks(new Set(), holidays, false)).toEqual([]);
    expect(vacationBlocks(new Set(['2026-08-04', '2026-08-03']), holidays, false)[0].days)
      .toEqual(['2026-08-03', '2026-08-04']);
  });

  it('wählt bei Wochenendarbeit auch Samstag und Sonntag, aber keine Feiertage', () => {
    expect(selectable('2026-04-04', holidays, true)).toBe(true);
    expect(selectable('2026-04-05', holidays, true)).toBe(true);
    expect(selectable('2026-12-26', holidays, true)).toBe(false);
    expect(chooseRange('2026-04-02', '2026-04-07', holidays, true))
      .toEqual(['2026-04-02', '2026-04-04', '2026-04-05', '2026-04-07']);
  });

  it('verbindet bei Wochenendarbeit nur ausgewählte oder arbeitsfreie Tage', () => {
    const days = new Set(['2026-08-07', '2026-08-10']);
    expect(vacationBlocks(days, holidays, false)).toHaveLength(1);
    const blocks = vacationBlocks(days, holidays, false, true);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ cost: 1, freeFrom: '2026-08-07', freeTo: '2026-08-07', freeDays: 1 });
    expect(vacationBlocks(new Set(['2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10']), holidays, false, true)[0])
      .toMatchObject({ cost: 4, freeDays: 4 });
    expect(vacationBlocks(new Set(['2026-12-31']), holidays, false, true)[0])
      .toMatchObject({ freeTo: '2027-01-01', freeDays: 2 });
  });

  it('wendet die Halbtagsregel auch auf arbeitspflichtige Wochenenden an', () => {
    expect(chooseRange('2028-12-24', '2028-12-24', holidays, true)).toEqual(['2028-12-24']);
    expect(chooseRange('2028-12-24', '2028-12-24', holidays)).toEqual([]);
    expect(vacationBlocks(new Set(['2028-12-24']), holidays, true, true)[0])
      .toMatchObject({ cost: 0.5, freeDays: 0 });
  });
});
