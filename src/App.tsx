import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  STATES, chooseRange, dayCost, displayDate, holidaysFor, keyOf, monthDays,
  monthsFor, numberOf, selectable, validRange, vacationBlocks, weekend,
  type Region,
} from './planner';

const initialYear = new Date().getFullYear();
const initialFrom = `${initialYear}-01-01`;
const initialTo = `${initialYear}-12-31`;
const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function Icon({ name }: { name: 'sun' | 'moon' | 'leaf' | 'arrow' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'sun' && <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
    {name === 'moon' && <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" />}
    {name === 'leaf' && <><path d="M20 3C9 2 3 7 5 14c2 7 16 7 15-11Z" /><path d="M4 21 15 10" /></>}
    {name === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5" />}
  </svg>;
}

export default function App() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const [notice, setNotice] = useState('');
  const [state, setState] = useState('NW');
  const [region, setRegion] = useState<Region>('state');
  const [budgetInput, setBudgetInput] = useState('30');
  const [halfDays, setHalfDays] = useState(false);
  const [workWeekends, setWorkWeekends] = useState(false);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(initialTo);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string[]>([]);

  // Include adjacent years so free-time extensions across New Year remain correct.
  const holidayFrom = `${Number(from.slice(0, 4)) - 1}-01-01`;
  const holidayTo = `${Number(to.slice(0, 4)) + 1}-12-31`;
  const holidays = useMemo(() => holidaysFor(state, region, holidayFrom, holidayTo), [state, region, holidayFrom, holidayTo]);
  const months = useMemo(() => monthsFor(from, to), [from, to]);
  const blocks = useMemo(() => vacationBlocks(selected, holidays, halfDays, workWeekends), [selected, holidays, halfDays, workWeekends]);
  const used = blocks.reduce((sum, block) => sum + block.cost, 0);
  const budget = Number(budgetInput);
  const validBudget = budgetInput !== '' && Number.isFinite(budget) && budget >= 0 && Number.isInteger(budget * 2);
  const remaining = validBudget ? budget - used : null;
  const rangeValid = validRange(draftFrom, draftTo);
  const selectionRangeValid = validRange(rangeFrom, rangeTo) && rangeFrom >= from && rangeTo <= to;
  const stateName = STATES.find(([code]) => code === state)![1];

  function changeTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('baldweg-theme', next);
    } catch (error) {
      console.error('Darstellung konnte nicht gespeichert werden.', error);
      setNotice('Dein Browser blockiert den lokalen Speicher. Die Darstellung gilt nur bis zum Neuladen.');
    }
  }

  function changeLocation(nextState: string, nextRegion: Region) {
    const nextHolidays = holidaysFor(nextState, nextRegion, holidayFrom, holidayTo);
    const next = new Set([...selected].filter(key => selectable(key, nextHolidays, workWeekends)));
    const removed = selected.size - next.size;
    setState(nextState);
    setRegion(nextRegion);
    setSelected(next);
    setHighlight([]);
    setNotice(removed ? `${removed} ausgewählte Tage sind am neuen Ort Feiertage und wurden aus der Auswahl entfernt.` : 'Feiertage wurden für deinen Arbeitsort aktualisiert.');
  }

  function applyPeriod(event: React.FormEvent) {
    event.preventDefault();
    if (!rangeValid) return;
    const next = new Set([...selected].filter(key => key >= draftFrom && key <= draftTo));
    const removed = selected.size - next.size;
    if (removed && !window.confirm(`${removed} ausgewählte Urlaubstage liegen außerhalb des neuen Zeitraums und werden entfernt. Fortfahren?`)) return;
    setFrom(draftFrom);
    setTo(draftTo);
    setSelected(next);
    setHighlight([]);
    setRangeFrom('');
    setRangeTo('');
    setNotice(removed ? `Zeitraum aktualisiert. ${removed} Tage außerhalb des Zeitraums wurden entfernt.` : 'Planungszeitraum aktualisiert.');
  }

  function toggleDay(key: string) {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setHighlight([]);
  }

  function changeWorkWeekends(enabled: boolean) {
    const next = new Set([...selected].filter(key => selectable(key, holidays, enabled)));
    const removed = selected.size - next.size;
    setWorkWeekends(enabled);
    setSelected(next);
    setHighlight([]);
    setNotice(enabled
      ? 'Samstag und Sonntag zählen jetzt als Arbeitstage. Feiertage bleiben arbeitsfrei.'
      : `Wochenenden sind jetzt arbeitsfrei.${removed ? ` ${removed} ausgewählte Wochenendtage wurden aus der Planung entfernt.` : ''}`);
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="baldweg Startseite"><span className="brand-icon"><Icon name="leaf" /></span>baldweg<span className="brand-dot">.</span></a>
      <span className="header-caption">Weniger planen. Mehr vorfreuen.</span>
      <button className="theme-toggle" type="button" role="switch" aria-checked={theme === 'light'} aria-label="Heller Modus" onClick={changeTheme}>
        <Icon name={theme === 'dark' ? 'moon' : 'sun'} /><span>{theme === 'dark' ? 'Dark' : 'Light'}</span><span className="switch-track"><span /></span>
      </button>
    </header>

    <div className="workspace">
      <aside className="sidebar" aria-label="Einstellungen">
        <details open>
          <summary>Deine Einstellungen <span>⌄</span></summary>
          <p className="sidebar-intro">Ein guter Urlaub beginnt mit einem Plan.</p>
          <section className="setting-section">
            <div className="section-label"><span>01</span> Arbeitsort</div>
            <label htmlFor="state">Bundesland</label>
            <select id="state" value={state} onChange={e => changeLocation(e.target.value, 'state')}>
              {STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
            </select>
            <p className="field-help">Gesetzliche Feiertage werden automatisch berücksichtigt.</p>
            {(state === 'BY' || state === 'SN' || state === 'TH') && <>
              <label htmlFor="region">Regionale Feiertage</label>
              <select id="region" value={region} onChange={e => changeLocation(state, e.target.value as Region)}>
                <option value="state">Nur landesweite Feiertage</option>
                {state === 'BY' ? <>
                  <option value="catholic">Gemeinde mit Mariä Himmelfahrt</option>
                  <option value="augsburg">Stadt Augsburg</option>
                </> : <option value="sorbian">Gemeinde mit Fronleichnam</option>}
              </select>
              <p className="field-help">Die örtliche Regelung deines Arbeitsorts ist maßgeblich. Bitte bei deiner Gemeinde prüfen.</p>
            </>}
          </section>
          <section className="setting-section">
            <div className="section-label"><span>02</span> Dein Urlaubskonto</div>
            <label htmlFor="budget">Verfügbare Urlaubstage</label>
            <div className="input-suffix"><input id="budget" type="number" min="0" step="0.5" value={budgetInput} aria-invalid={!validBudget} onChange={e => setBudgetInput(e.target.value)} /><span>Tage</span></div>
            {!validBudget && <p className="error">Bitte eine positive Zahl oder 0 in Schritten von 0,5 eingeben.</p>}
            <label className="toggle-row">
              <span><strong>Wochenenden sind Arbeitstage</strong><small>Samstag und Sonntag berücksichtigen</small></span>
              <input type="checkbox" role="switch" checked={workWeekends} onChange={e => changeWorkWeekends(e.target.checked)} />
              <span className="switch-track"><span /></span>
            </label>
            <label className="toggle-row">
              <span><strong>24. & 31. Dezember</strong><small>Je einen halben Tag berechnen</small></span>
              <input type="checkbox" role="switch" checked={halfDays} onChange={e => setHalfDays(e.target.checked)} />
              <span className="switch-track"><span /></span>
            </label>
            <p className="field-help">Zusammen 1 statt 2 Urlaubstage. Gilt nur an Arbeitstagen, nach betrieblicher Regelung.</p>
          </section>
          <section className="setting-section">
            <div className="section-label"><span>03</span> Dein Planungshorizont</div>
            <form onSubmit={applyPeriod}>
              <label htmlFor="period-from">Von</label>
              <input id="period-from" type="date" min="1970-01-01" max="2099-12-31" required value={draftFrom} onChange={e => setDraftFrom(e.target.value)} />
              <label htmlFor="period-to">Bis</label>
              <input id="period-to" type="date" min="1970-01-01" max="2099-12-31" required value={draftTo} onChange={e => setDraftTo(e.target.value)} />
              {!rangeValid && <p className="error">Bitte einen gültigen Zeitraum von 1970 bis 2099 eingeben. Das Ende muss nach dem Beginn liegen.</p>}
              <button className="button secondary full-width" disabled={!rangeValid || (draftFrom === from && draftTo === to)}>Zeitraum übernehmen <Icon name="arrow" /></button>
            </form>
          </section>
          <button className="reset-button" type="button" disabled={!selected.size} onClick={() => {
            if (window.confirm('Alle ausgewählten Urlaubstage entfernen?')) {
              setSelected(new Set()); setHighlight([]); setNotice('Deine Urlaubsauswahl wurde geleert.');
            }
          }}>Auswahl zurücksetzen</button>
        </details>
        <div className="privacy-note"><span className="privacy-symbol">◇</span><div><strong>Dein Plan bleibt bei dir.</strong><p>Ohne Konto, ohne Cloud. Nur die Darstellung wird gespeichert.</p></div></div>
      </aside>

      <main>
        <div className="page-heading">
          <div><div className="eyebrow">DEINE NÄCHSTE AUSZEIT</div><h1>Mach mehr aus<br className="mobile-break" /> deinen freien Tagen<span>.</span></h1><p>Wähle deine Urlaubstage. Wir behalten den Überblick.</p></div>
          <span className="year-badge">{from.slice(0, 4) === to.slice(0, 4) ? from.slice(0, 4) : `${from.slice(0, 4)} – ${to.slice(0, 4)}`}</span>
        </div>

        <section className="stats" aria-label="Urlaubskonto" aria-live="polite">
          <div className="stat"><span>Verfügbar</span><div><strong>{validBudget ? numberOf(budget) : '–'}</strong><small>Tage</small></div></div>
          <div className="stat"><span>Verplant</span><div><strong>{numberOf(used)}</strong><small>Tage</small></div></div>
          <div className={`stat remaining ${remaining !== null && remaining < 0 ? 'over-budget' : ''}`}><span>Noch übrig</span><div><strong>{remaining === null ? '–' : numberOf(remaining)}</strong><small>Tage</small></div><span className="stat-decoration"><Icon name="leaf" /></span></div>
        </section>
        {remaining !== null && remaining < 0 && <p role="alert" className="alert">Dein Urlaubsbudget ist um {numberOf(-remaining)} Tage überschritten. Du kannst deine Planung weiter anpassen.</p>}
        <div className="notice" role="status">{notice}</div>

        <section className="calendar-section" aria-labelledby="calendar-title">
          <div className="section-heading"><div><h2 id="calendar-title">Dein Kalender</h2><p>{displayDate(from)} – {displayDate(to)} <span className="dot-separator">·</span> {stateName}</p></div>
            <div className="legend"><span><i className="legend-selected" />Urlaub</span><span><i className="legend-holiday" />Feiertag</span><span><i className="legend-weekend" />Wochenende</span></div>
          </div>
          <details className="range-picker">
            <summary><span>＋</span> Mehrere Tage auf einmal auswählen</summary>
            <form onSubmit={e => {
              e.preventDefault();
              if (!selectionRangeValid) return;
              const keys = chooseRange(rangeFrom, rangeTo, holidays, workWeekends);
              setSelected(previous => new Set([...previous, ...keys]));
              setNotice(keys.length ? 'Arbeitstage des Zeitraums wurden zur Auswahl hinzugefügt. Bereits gewählte Tage werden nicht doppelt gezählt.' : 'Dieser Zeitraum enthält keine auswählbaren Arbeitstage.');
            }}>
              <label>Beginn<input type="date" min={from} max={to} required value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} /></label>
              <label>Ende<input type="date" min={from} max={to} required value={rangeTo} onChange={e => setRangeTo(e.target.value)} /></label>
              <button className="button primary" disabled={!selectionRangeValid}>Arbeitstage hinzufügen</button>
              {rangeFrom && rangeTo && !selectionRangeValid && <p className="error">Der Bereich muss innerhalb deines Planungszeitraums liegen und in aufsteigender Reihenfolge sein.</p>}
            </form>
          </details>
          <div className="months-grid">
            {months.map(month => {
              const days = monthDays(month);
              const monthKey = format(month, 'yyyy-MM');
              const count = [...selected].filter(key => key.startsWith(monthKey)).reduce((sum, key) => sum + dayCost(key, halfDays), 0);
              return <section className="month-card" key={monthKey} aria-label={format(month, 'MMMM yyyy', { locale: de })}>
                <div className="month-heading"><h3>{format(month, 'MMMM', { locale: de })} <span>{format(month, 'yyyy')}</span></h3>{count > 0 && <span className="month-count">{numberOf(count)} {count === 1 ? 'Tag' : 'Tage'}</span>}</div>
                <div className="weekdays" aria-hidden="true">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
                <div className="days-grid">
                  {Array.from({ length: (days[0].getDay() + 6) % 7 }, (_, i) => <span key={`empty-${i}`} />)}
                  {days.map(date => {
                    const key = keyOf(date);
                    const holiday = holidays.get(key);
                    const outside = key < from || key > to;
                    const isSelected = selected.has(key);
                    const isWeekend = weekend(date);
                    const isWorkday = selectable(key, holidays, workWeekends);
                    const half = halfDays && dayCost(key, true) === 0.5 && isWorkday;
                    const description = `${format(date, 'EEEE, d. MMMM yyyy', { locale: de })}${holiday ? `, ${holiday}` : ''}${isWeekend ? ', Wochenende' : ''}${half ? ', halber Urlaubstag' : ''}${outside ? ', außerhalb des Zeitraums' : ''}`;
                    return <button key={key} type="button" id={`day-${key}`} className={`day ${isWeekend ? 'weekend' : ''} ${holiday ? 'holiday' : ''} ${isSelected ? 'selected' : ''} ${outside ? 'outside' : ''} ${highlight.includes(key) ? 'highlight' : ''} ${key === keyOf(new Date()) ? 'today' : ''}`}
                      disabled={outside || !isWorkday} aria-label={description} aria-pressed={isSelected} title={description} onClick={() => toggleDay(key)}>
                      {date.getDate()}{half && <span className="half-marker">½</span>}{holiday && <span className="holiday-dot" />}
                    </button>;
                  })}
                </div>
                <div className="month-footer">{days.filter(date => holidays.has(keyOf(date)) && keyOf(date) >= from && keyOf(date) <= to).map(date =>
                  <span key={keyOf(date)}><b>{format(date, 'dd.MM.')}</b> {holidays.get(keyOf(date))}</span>
                )}</div>
              </section>;
            })}
          </div>
          <p className="calendar-help">Arbeitswoche: {workWeekends ? 'Montag bis Sonntag' : 'Montag bis Freitag'}. Gesetzliche Feiertage bleiben arbeitsfrei.</p>
        </section>

        <section className="vacations" aria-labelledby="vacations-title">
          <div className="section-heading"><div><h2 id="vacations-title">Deine geplanten Auszeiten <span className="count-badge">{blocks.length}</span></h2></div><span className="muted">{numberOf(used)} Urlaubstage gesamt</span></div>
          {!blocks.length ? <div className="empty-state"><span className="empty-icon"><Icon name="leaf" /></span><h3>Platz für schöne Pläne.</h3><p>Wähle oben deine ersten Urlaubstage aus.<br />Deine Auszeiten erscheinen dann hier.</p></div> :
            <div className="vacation-list">{blocks.map((block, index) => <article className="vacation-row" key={block.days[0]}>
              <span className="block-number">{String(index + 1).padStart(2, '0')}</span>
              <button type="button" className="block-dates" title="Im Kalender hervorheben" onClick={() => {
                setHighlight(block.days);
                document.getElementById(`day-${block.days[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}><strong>{displayDate(block.days[0])}{block.days.length > 1 ? ` – ${displayDate(block.days[block.days.length - 1])}` : ''}</strong>
                <small>{block.freeDays ? `${block.freeDays} Kalendertage frei · ${displayDate(block.freeFrom)} – ${displayDate(block.freeTo)}` : 'Enthält halbe Urlaubstage; keine durchgehend arbeitsfreie Zeit.'}</small>
              </button>
              <span className="cost-badge">{numberOf(block.cost)} {block.cost === 1 ? 'Urlaubstag' : 'Urlaubstage'}</span>
              <button className="remove-button" type="button" aria-label={`Auszeit ab ${displayDate(block.days[0])} entfernen`} onClick={() => {
                setSelected(previous => new Set([...previous].filter(key => !block.days.includes(key))));
                setHighlight([]); setNotice('Auszeit aus der Planung entfernt.');
              }}>×</button>
            </article>)}</div>}
        </section>
        <footer className="page-footer"><span>Für mehr Zeit, die dir gehört.</span><span>Planung ohne Gewähr · Betriebliche Regelungen beachten</span></footer>
      </main>
    </div>
  </div>;
}
