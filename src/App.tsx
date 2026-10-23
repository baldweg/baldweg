import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
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

interface Person {
  id: string;
  name: string;
  color: string;
  state: string;
  region: Region;
  budgetInput: string;
  halfDays: boolean;
  workWeekends: boolean;
  selected: Set<string>;
}

function createPerson(name: string, color: string): Person {
  return {
    id: crypto.randomUUID(), name, color, state: 'NW', region: 'state',
    budgetInput: '30', halfDays: false, workWeekends: false, selected: new Set(),
  };
}

function DeletePersonDialog({ person, onCancel, onDelete }: {
  person: Person;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return <dialog ref={dialogRef} className="confirmation-dialog" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={onCancel}>
    <div className="eyebrow">PERSON ENTFERNEN</div>
    <h2 id="delete-title">{person.name} löschen?</h2>
    <p id="delete-description">Die Person und ihre gesamte Urlaubsplanung werden entfernt. Das kann nicht rückgängig gemacht werden.</p>
    <div className="dialog-actions">
      <button type="button" className="button secondary" autoFocus onClick={onCancel}>Abbrechen</button>
      <button type="button" className="button destructive" onClick={onDelete}>Person löschen</button>
    </div>
  </dialog>;
}

function Icon({ name }: { name: 'sun' | 'moon' | 'leaf' | 'arrow' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'sun' && <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
    {name === 'moon' && <path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z" />}
    {name === 'leaf' && <><path d="M20 3C9 2 3 7 5 14c2 7 16 7 15-11Z" /><path d="M4 21 15 10" /></>}
    {name === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5" />}
  </svg>;
}

export default function App() {
  const [showImprint, setShowImprint] = useState(() => window.location.hash === '#impressum');
  const imprintHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const navigate = () => setShowImprint(window.location.hash === '#impressum');
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);
  useEffect(() => {
    document.title = showImprint ? 'Impressum · urlaubsjahr' : 'urlaubsjahr · Dein Urlaubsplaner';
    if (showImprint) {
      imprintHeading.current?.focus();
      window.scrollTo(0, 0);
    }
  }, [showImprint]);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const [notice, setNotice] = useState('');
  const [people, setPeople] = useState<Person[]>(() => [createPerson('Ich', 'hsl(88, 60%, 70%)')]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [personName, setPersonName] = useState('');
  const [personError, setPersonError] = useState('');
  const [colorIndex, setColorIndex] = useState(1);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);
  const person = people.find(item => item.id === activeId) ?? people[0];
  const { state, region, budgetInput, halfDays, workWeekends, selected } = person;

  function updatePerson(update: Partial<Person>) {
    setPeople(previous => previous.map(item => item.id === person.id ? { ...item, ...update } : item));
  }

  function selectPerson(id: string) {
    setActiveId(id); setHighlight([]); setRangeFrom(''); setRangeTo(''); setNotice('');
  }

  function setSelected(value: Set<string> | ((previous: Set<string>) => Set<string>)) {
    setPeople(previous => previous.map(item => item.id === person.id
      ? { ...item, selected: typeof value === 'function' ? value(item.selected) : value }
      : item));
  }
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [draftFrom, setDraftFrom] = useState(initialFrom);
  const [draftTo, setDraftTo] = useState(initialTo);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
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
      localStorage.setItem('urlaubsjahr-theme', next);
    } catch (error) {
      console.error('Darstellung konnte nicht gespeichert werden.', error);
      setNotice('Dein Browser blockiert den lokalen Speicher. Die Darstellung gilt nur bis zum Neuladen.');
    }
  }

  function changeLocation(nextState: string, nextRegion: Region) {
    const nextHolidays = holidaysFor(nextState, nextRegion, holidayFrom, holidayTo);
    const next = new Set([...selected].filter(key => selectable(key, nextHolidays, workWeekends)));
    const removed = selected.size - next.size;
    updatePerson({ state: nextState, region: nextRegion, selected: next });
    setHighlight([]);
    setNotice(removed ? `${removed} ausgewählte Tage sind am neuen Ort Feiertage und wurden aus der Auswahl entfernt.` : 'Feiertage wurden für deinen Arbeitsort aktualisiert.');
  }

  function applyPeriod(event: React.FormEvent) {
    event.preventDefault();
    if (!rangeValid) return;
    const next = people.map(item => ({
      ...item, selected: new Set([...item.selected].filter(key => key >= draftFrom && key <= draftTo)),
    }));
    const removed = people.reduce((sum, item, index) => sum + item.selected.size - next[index].selected.size, 0);
    if (removed && !window.confirm(`${removed} ausgewählte Urlaubstage aller Personen liegen außerhalb des neuen Zeitraums und werden entfernt. Fortfahren?`)) return;
    setFrom(draftFrom);
    setTo(draftTo);
    setPeople(next);
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
    updatePerson({ workWeekends: enabled, selected: next });
    setHighlight([]);
    setNotice(enabled
      ? 'Samstag und Sonntag zählen jetzt als Arbeitstage. Feiertage bleiben arbeitsfrei.'
      : `Wochenenden sind jetzt arbeitsfrei.${removed ? ` ${removed} ausgewählte Wochenendtage wurden aus der Planung entfernt.` : ''}`);
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="urlaubsjahr Startseite"><span className="brand-icon"><Icon name="leaf" /></span>urlaubsjahr<span className="brand-dot">.</span></a>
      <span className="header-caption">Weniger planen. Mehr vorfreuen.</span>
      <button className="theme-toggle" type="button" role="switch" aria-checked={theme === 'light'} aria-label="Heller Modus" onClick={changeTheme}>
        <Icon name={theme === 'dark' ? 'moon' : 'sun'} /><span>{theme === 'dark' ? 'Dark' : 'Light'}</span><span className="switch-track"><span /></span>
      </button>
    </header>

    {showImprint && <main className="imprint-page" aria-labelledby="imprint-title">
      <a className="back-link" href="#">← Zurück zum Urlaubsplaner</a>
      <div className="eyebrow">RECHTLICHES</div>
      <h1 id="imprint-title" ref={imprintHeading} tabIndex={-1}>Impressum</h1>
      <p className="alert"><strong>Unvollständige Vorlage:</strong> Diese Seite enthält Platzhalter und ist kein fertiges Impressum. Vor der Veröffentlichung müssen die tatsächlichen Betreiber- und Kontaktangaben ergänzt und die für den Betreiber geltenden Informationspflichten geprüft werden.</p>
      <section className="imprint-card" aria-labelledby="operator-title">
        <h2 id="operator-title">Anbieter gemäß § 18 Abs. 1 MStV</h2>
        <p>[Vollständiger Vor- und Nachname]<br />[Straße und Hausnummer – ladungsfähige Anschrift, kein Postfach]<br />[Postleitzahl und Ort]<br />[Land]</p>
      </section>
      <section className="imprint-card" aria-labelledby="contact-title">
        <h2 id="contact-title">Kontakt</h2>
        <p>E-Mail: [Erreichbare E-Mail-Adresse]</p>
      </section>
      <section className="imprint-card" aria-labelledby="project-title">
        <h2 id="project-title">Über dieses Angebot</h2>
        <p>urlaubsjahr ist ein privates Hobbyprojekt zur Urlaubsplanung. Das Angebot enthält keine Werbung und wird ohne Einnahmen betrieben.</p>
      </section>
      <section className="imprint-card" aria-labelledby="data-note-title">
        <h2 id="data-note-title">Hinweis zur Datenverarbeitung</h2>
        <p>Die Website wird über Cloudflare Pages bereitgestellt. Anbieter ist Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA. Beim Abruf verarbeitet Cloudflare technische Verbindungsdaten, insbesondere die IP-Adresse, um die Website auszuliefern und die Sicherheit des Dienstes zu gewährleisten. Die Verarbeitung kann auch außerhalb der EU erfolgen. Auch eine statische Website ist deshalb nicht frei von personenbezogener Datenverarbeitung.</p>
        <p>Eingegebene Personennamen, Einstellungen und Urlaubstage werden von der Anwendung ausschließlich im Arbeitsspeicher des Browsers verarbeitet und nicht an den Betreiber oder Cloudflare übertragen. Beim Neuladen gehen diese Eingaben verloren. Für die Mehrpersonenplanung können statt echter Namen auch frei gewählte Bezeichnungen verwendet werden.</p>
        <p>Nur die gewählte Darstellung wird im Local Storage unter <code>urlaubsjahr-theme</code> gespeichert und beim nächsten Aufruf gelesen. Dieser Eintrag bleibt bis zum Löschen der Websitedaten im Browser erhalten. Die Anwendung verwendet keine eigenen Cookies, Analysewerkzeuge, Werbung oder extern geladenen Schriftarten.</p>
        <p>Weitere Informationen: <a href="https://www.cloudflare.com/privacypolicy/">Datenschutzerklärung von Cloudflare</a>.</p>
        <p><strong>Vor Veröffentlichung prüfen:</strong> Diese technischen Hinweise ersetzen keine vollständige Datenschutzerklärung des Betreibers. Die für den konkreten Betrieb erforderlichen Datenschutzinformationen sind gesondert zu ergänzen.</p>
      </section>
      <footer className="page-footer"><a href="#">Zurück zu urlaubsjahr</a></footer>
    </main>}
    <div className="workspace" hidden={showImprint}>
      <aside className="sidebar" aria-label="Einstellungen">
        <details open>
          <summary>Deine Einstellungen <span>⌄</span></summary>
          <section className="setting-section person-settings">
            <div className="section-label">Personen</div>
            <label htmlFor="person">Planung bearbeiten für</label>
            <select id="person" value={person.id} onChange={e => selectPerson(e.target.value)}>
              {people.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <form onSubmit={event => {
              event.preventDefault();
              const name = personName.trim();
              if (!name || people.some(item => item.name.toLocaleLowerCase('de-DE') === name.toLocaleLowerCase('de-DE'))) {
                setPersonError('Bitte einen eindeutigen, nicht leeren Namen eingeben.');
                return;
              }
              const added = createPerson(name, `hsl(${(88 + colorIndex * 137.508) % 360}, 65%, 70%)`);
              setPeople(previous => [...previous, added]);
              setActiveId(added.id); setColorIndex(previous => previous + 1);
              setPersonName(''); setPersonError(''); setHighlight([]); setRangeFrom(''); setRangeTo('');
              setNotice(`${name} wurde mit einer leeren Planung und Standardeinstellungen angelegt.`);
            }}>
              <label htmlFor="person-name">Neue Person</label>
              <input id="person-name" value={personName} maxLength={60} aria-invalid={!!personError} onChange={e => {
                setPersonName(e.target.value); setPersonError('');
              }} placeholder="Name" />
              {personError && <p className="error" role="alert">{personError}</p>}
              <button className="button secondary full-width">Person hinzufügen</button>
            </form>
          </section>
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
            <div className="input-suffix"><input id="budget" type="number" min="0" step="0.5" value={budgetInput} aria-invalid={!validBudget} onChange={e => updatePerson({ budgetInput: e.target.value })} /><span>Tage</span></div>
            {!validBudget && <p className="error">Bitte eine positive Zahl oder 0 in Schritten von 0,5 eingeben.</p>}
            <label className="toggle-row">
              <span><strong>Wochenenden sind Arbeitstage</strong><small>Samstag und Sonntag berücksichtigen</small></span>
              <input type="checkbox" role="switch" checked={workWeekends} onChange={e => changeWorkWeekends(e.target.checked)} />
              <span className="switch-track"><span /></span>
            </label>
            <label className="toggle-row">
              <span><strong>24. & 31. Dezember</strong><small>Je einen halben Tag berechnen</small></span>
              <input type="checkbox" role="switch" checked={halfDays} onChange={e => updatePerson({ halfDays: e.target.checked })} />
              <span className="switch-track"><span /></span>
            </label>
            <p className="field-help">Zusammen 1 statt 2 Urlaubstage. Gilt nur an Arbeitstagen, nach betrieblicher Regelung.</p>
          </section>
          <section className="setting-section">
            <div className="section-label"><span>03</span> Dein Planungshorizont</div>
            <p className="field-help">Dieser Zeitraum gilt gemeinsam für alle Personen.</p>
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
            if (window.confirm(`Alle ausgewählten Urlaubstage von ${person.name} entfernen?`)) {
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

        <p className="active-person"><i style={{ backgroundColor: person.color }} />Du planst für <strong>{person.name}</strong></p>
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
          <div className="people-legend" aria-label="Personenfarben">
            {people.map(item => <span key={item.id} className={item.id === person.id ? 'active' : ''}>
              <button className="person-select" type="button" aria-label={`${item.name} auswählen`} aria-pressed={item.id === person.id} onClick={() => selectPerson(item.id)}>
                <i style={{ backgroundColor: item.color }} />{item.name}{item.id === person.id ? ' (ausgewählt)' : ''}
              </button>
              <button className="person-remove" type="button" aria-label={`${item.name} entfernen`} title={`${item.name} entfernen`} disabled={people.length === 1} onClick={() => setPersonToDelete(item)}>×</button>
            </span>)}
          </div>
          <p className="calendar-help">Feiertage und auswählbare Arbeitstage gelten für {person.name}. Farbmarkierungen zeigen den Urlaub aller Personen.</p>
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
                    const vacationers = people.filter(item => item.selected.has(key));
                    const description = `${format(date, 'EEEE, d. MMMM yyyy', { locale: de })}${holiday ? `, ${holiday}` : ''}${isWeekend ? ', Wochenende' : ''}${half ? ', halber Urlaubstag' : ''}${outside ? ', außerhalb des Zeitraums' : ''}`;
                    return <button key={key} type="button" id={`day-${key}`} className={`day ${isWeekend ? 'weekend' : ''} ${holiday ? 'holiday' : ''} ${isSelected ? 'selected' : ''} ${outside ? 'outside' : ''} ${highlight.includes(key) ? 'highlight' : ''} ${key === keyOf(new Date()) ? 'today' : ''}`}
                      style={isSelected ? { backgroundColor: person.color, color: '#172222' } : undefined}
                      disabled={outside || !isWorkday} aria-label={description} aria-describedby={vacationers.length ? `people-${key}` : undefined} aria-pressed={isSelected} title={`${description}${vacationers.length ? ` · Urlaub: ${vacationers.map(item => item.name).join(', ')}` : ''}`} onClick={() => toggleDay(key)}>
                      {date.getDate()}{half && <span className="half-marker">½</span>}{holiday && <span className="holiday-dot" />}
                      {vacationers.length > 0 && <span id={`people-${key}`} className="person-markers" role="img" aria-label={`Urlaub: ${vacationers.map(item => item.name).join(', ')}`}>
                        {vacationers.map(item => <span key={item.id} style={{ backgroundColor: item.color }} />)}
                      </span>}
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
        <footer className="page-footer"><span>Für mehr Zeit, die dir gehört.</span><span>Planung ohne Gewähr · Betriebliche Regelungen beachten</span><a href="#impressum">Impressum</a></footer>
      </main>
    </div>
    {personToDelete && <DeletePersonDialog person={personToDelete} onCancel={() => setPersonToDelete(null)} onDelete={() => {
      setPeople(previous => previous.filter(item => item.id !== personToDelete.id));
      if (personToDelete.id === person.id) {
        setActiveId(null); setHighlight([]); setRangeFrom(''); setRangeTo('');
      }
      setNotice(`${personToDelete.name} wurde entfernt.`);
      setPersonToDelete(null);
    }} />}
  </div>;
}
