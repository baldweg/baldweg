import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = 'dark';
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

describe('urlaubsjahr Urlaubsplaner', () => {
  it('startet dunkel und speichert ausschließlich das Theme', () => {
    const { unmount } = render(<App />);
    expect(screen.getByRole('link', { name: 'urlaubsjahr Startseite' })).toHaveTextContent('urlaubsjahr.');
    const toggle = screen.getByRole('switch', { name: 'Heller Modus' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('urlaubsjahr-theme')).toBe('light');
    unmount();
    render(<App />);
    expect(screen.getByRole('switch', { name: 'Heller Modus' })).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.length).toBe(1);
  });

  it('meldet Speicherfehler und wechselt trotzdem die Darstellung', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    fireEvent.click(screen.getByRole('switch', { name: 'Heller Modus' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(screen.getByRole('status')).toHaveTextContent('blockiert');
    spy.mockRestore();
    log.mockRestore();
  });

  it('plant einen Bereich, warnt bei Budgetüberschreitung und entfernt die Auszeit', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2027-04-01' } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2027-04-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    expect(screen.getAllByRole('region', { name: 'April 2027' })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '2027-04-05' } });
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '2027-04-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Arbeitstage hinzufügen' }));
    expect(screen.getByText('5 Urlaubstage')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Verfügbare Urlaubstage'), { target: { value: '4.5' } });
    expect(screen.getByRole('alert')).toHaveTextContent('0,5');
    fireEvent.click(screen.getByRole('button', { name: 'Auszeit ab 05.04.2027 entfernen' }));
    expect(screen.getByText('Platz für schöne Pläne.')).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it('berücksichtigt Halbtage und entfernt beim Ortswechsel neue Feiertage', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2026-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026' }));
    fireEvent.change(screen.getByLabelText('Bundesland'), { target: { value: 'BY' } });
    expect(screen.getByRole('status')).toHaveTextContent('wurden aus der Auswahl entfernt');
    fireEvent.click(screen.getByRole('switch', { name: /24. & 31. Dezember/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Donnerstag, 24. Dezember 2026, halber Urlaubstag' }));
    expect(screen.getByText('0,5 Urlaubstage')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Urlaubskonto' })).getByText('29,5')).toBeInTheDocument();
  });

  it('behält bei abgebrochenem Zeitraumwechsel die Auswahl', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026' }));
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-01-07' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    expect(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026' })).toHaveAttribute('aria-pressed', 'true');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    expect(screen.getByText('Platz für schöne Pläne.')).toBeInTheDocument();
    confirm.mockRestore();
  });

  it('schaltet Wochenendarbeit für Auswahl, Bereich und Ortswechsel konsistent um', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-04-01' } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2026-04-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    const toggle = screen.getByRole('switch', { name: /Wochenenden sind Arbeitstage/ });
    const saturday = screen.getByRole('button', { name: 'Samstag, 4. April 2026, Wochenende' });
    expect(toggle).not.toBeChecked();
    expect(saturday).toBeDisabled();
    fireEvent.click(toggle);
    expect(saturday).toBeEnabled();
    expect(screen.getByText(/Arbeitswoche: Montag bis Sonntag/)).toBeInTheDocument();
    fireEvent.click(saturday);
    expect(saturday).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Bundesland'), { target: { value: 'BY' } });
    expect(saturday).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '2026-04-02' } });
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '2026-04-07' } });
    fireEvent.click(screen.getByRole('button', { name: 'Arbeitstage hinzufügen' }));
    expect(screen.getByText('4 Urlaubstage')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Montag, 6. April 2026, Ostermontag' })).toBeDisabled();
    fireEvent.click(toggle);
    expect(saturday).toBeDisabled();
    expect(saturday).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('2 Urlaubstage')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('2 ausgewählte Wochenendtage');
    expect(localStorage.length).toBe(0);
  });

  it('trennt persönliche Einstellungen und zeigt überlappenden Urlaub aller Personen', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2026-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    const ichId = within(screen.getByLabelText('Planung bearbeiten für')).getByRole('option', { name: 'Ich' }).getAttribute('value');
    fireEvent.change(screen.getByLabelText('Bundesland'), { target: { value: 'BY' } });
    fireEvent.change(screen.getByLabelText('Regionale Feiertage'), { target: { value: 'augsburg' } });
    fireEvent.change(screen.getByLabelText('Verfügbare Urlaubstage'), { target: { value: '20.5' } });
    fireEvent.click(screen.getByRole('switch', { name: /Wochenenden sind Arbeitstage/ }));
    fireEvent.click(screen.getByRole('switch', { name: /24. & 31. Dezember/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Donnerstag, 24. Dezember 2026, halber Urlaubstag' }));
    fireEvent.click(screen.getByRole('button', { name: 'Samstag, 3. Januar 2026, Wochenende' }));

    fireEvent.change(screen.getByLabelText('Neue Person'), { target: { value: 'Anna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }));
    expect(screen.getByLabelText('Bundesland')).toHaveValue('NW');
    expect(screen.getByLabelText('Verfügbare Urlaubstage')).toHaveValue(30);
    expect(screen.getByRole('switch', { name: /Wochenenden sind Arbeitstage/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /24. & 31. Dezember/ })).not.toBeChecked();
    const saturday = screen.getByRole('button', { name: 'Samstag, 3. Januar 2026, Wochenende' });
    expect(saturday).toBeDisabled();
    expect(within(saturday).getByRole('img', { name: 'Urlaub: Ich' })).toBeInTheDocument();
    const christmas = screen.getByRole('button', { name: 'Donnerstag, 24. Dezember 2026' });
    fireEvent.click(christmas);
    const markers = within(christmas).getByRole('img', { name: 'Urlaub: Ich, Anna' });
    expect(markers.children).toHaveLength(2);
    expect(markers.children[0].getAttribute('style')).not.toBe(markers.children[1].getAttribute('style'));
    expect(within(screen.getByRole('region', { name: 'Urlaubskonto' })).getByText('29')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Planung bearbeiten für'), { target: { value: ichId } });
    expect(screen.getByLabelText('Bundesland')).toHaveValue('BY');
    expect(screen.getByLabelText('Regionale Feiertage')).toHaveValue('augsburg');
    expect(screen.getByLabelText('Verfügbare Urlaubstage')).toHaveValue(20.5);
    expect(screen.getByRole('switch', { name: /Wochenenden sind Arbeitstage/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /24. & 31. Dezember/ })).toBeChecked();
    expect(within(screen.getByRole('region', { name: 'Urlaubskonto' })).getByText('19')).toBeInTheDocument();
    expect(localStorage.length).toBe(0);
  });

  it('bestätigt Zeitraumverkürzungen für alle Personen einschließlich inaktiver Planungen', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026' }));
    fireEvent.change(screen.getByLabelText('Neue Person'), { target: { value: 'Anna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }));
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-01-07' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('1 ausgewählte Urlaubstage aller Personen'));
    expect(screen.getByRole('img', { name: 'Urlaub: Ich' })).toBeInTheDocument();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    expect(screen.queryByRole('img', { name: 'Urlaub: Ich' })).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it('löscht und leert nur die aktive Person und verhindert ungültige Namen', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026' }));
    fireEvent.change(screen.getByLabelText('Neue Person'), { target: { value: ' ich ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }));
    expect(screen.getByRole('alert')).toHaveTextContent('eindeutigen');
    fireEvent.change(screen.getByLabelText('Neue Person'), { target: { value: 'Anna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026' }));
    fireEvent.click(screen.getByRole('button', { name: 'Auszeit ab 06.01.2026 entfernen' }));
    expect(screen.getByRole('img', { name: 'Urlaub: Ich' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026' }));
    fireEvent.click(screen.getByRole('button', { name: 'Auswahl zurücksetzen' }));
    expect(screen.getByRole('img', { name: 'Urlaub: Ich' })).toBeInTheDocument();
    confirm.mockReturnValue(false);
    fireEvent.click(screen.getByRole('button', { name: 'Anna entfernen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.getByLabelText('Planung bearbeiten für')).toHaveDisplayValue('Anna');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'Anna entfernen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Person löschen' }));
    expect(screen.getByLabelText('Planung bearbeiten für')).toHaveDisplayValue('Ich');
    expect(screen.getByRole('button', { name: 'Ich entfernen' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026' })).toHaveAttribute('aria-pressed', 'true');
    confirm.mockRestore();
  });

  it('löscht inaktive Personen direkt aus der Liste ohne die aktive Planung zu wechseln', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Neue Person'), { target: { value: 'Anna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }));
    fireEvent.change(screen.getByLabelText('Verfügbare Urlaubstage'), { target: { value: '25' } });
    const remove = screen.getByRole('button', { name: 'Ich entfernen' });
    expect(within(screen.getByLabelText('Personenfarben')).getByRole('button', { name: 'Ich entfernen' })).toBe(remove);
    expect(within(screen.getByRole('complementary', { name: 'Einstellungen' })).queryByRole('button', { name: /entfernen/ })).not.toBeInTheDocument();
    fireEvent.click(remove);
    expect(screen.getByRole('dialog', { name: 'Ich löschen?' })).toBeInTheDocument();
    expect(confirm).not.toHaveBeenCalled();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(remove);
    fireEvent.click(screen.getByRole('button', { name: 'Person löschen' }));
    expect(screen.getByLabelText('Planung bearbeiten für')).toHaveDisplayValue('Anna');
    expect(screen.getByLabelText('Verfügbare Urlaubstage')).toHaveValue(25);
    expect(screen.getByRole('button', { name: 'Anna entfernen' })).toBeDisabled();
    confirm.mockRestore();
  });

  it('synchronisiert Namensauswahl und Dropdown ohne beim Löschen die Person zu wechseln', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Verfügbare Urlaubstage'), { target: { value: '22' } });
    fireEvent.change(screen.getByLabelText('Neue Person'), { target: { value: 'Anna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }));
    const annaId = (screen.getByLabelText('Planung bearbeiten für') as HTMLSelectElement).value;
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ich auswählen' }));
    expect(screen.getByLabelText('Planung bearbeiten für')).toHaveDisplayValue('Ich');
    expect(screen.getByLabelText('Verfügbare Urlaubstage')).toHaveValue(22);
    expect(screen.getByRole('button', { name: 'Ich auswählen' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Beginn')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Planung bearbeiten für'), { target: { value: annaId } });
    expect(screen.getByRole('button', { name: 'Anna auswählen' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Ich entfernen' }));
    expect(screen.getByLabelText('Planung bearbeiten für')).toHaveDisplayValue('Anna');
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.getByRole('button', { name: 'Anna auswählen' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('entfernt bei geänderten Arbeitsregeln und Feiertagen nur Urlaub der aktiven Person', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Von'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Bis'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zeitraum übernehmen' }));
    fireEvent.click(screen.getByRole('switch', { name: /Wochenenden sind Arbeitstage/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Samstag, 3. Januar 2026, Wochenende' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026' }));
    fireEvent.change(screen.getByLabelText('Neue Person'), { target: { value: 'Anna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Person hinzufügen' }));
    fireEvent.click(screen.getByRole('switch', { name: /Wochenenden sind Arbeitstage/ }));
    fireEvent.change(screen.getByLabelText('Beginn'), { target: { value: '2026-01-03' } });
    fireEvent.change(screen.getByLabelText('Ende'), { target: { value: '2026-01-06' } });
    fireEvent.click(screen.getByRole('button', { name: 'Arbeitstage hinzufügen' }));
    fireEvent.click(screen.getByRole('switch', { name: /Wochenenden sind Arbeitstage/ }));
    fireEvent.change(screen.getByLabelText('Bundesland'), { target: { value: 'BY' } });
    expect(screen.getAllByRole('img', { name: 'Urlaub: Ich' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Dienstag, 6. Januar 2026, Heilige Drei Könige' })).toBeDisabled();
    expect(screen.getByRole('img', { name: 'Urlaub: Anna' })).toBeInTheDocument();
  });
});
