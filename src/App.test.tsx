import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = 'dark';
});

describe('baldweg Urlaubsplaner', () => {
  it('startet dunkel und speichert ausschließlich das Theme', () => {
    const { unmount } = render(<App />);
    expect(screen.getByRole('link', { name: 'baldweg Startseite' })).toHaveTextContent('baldweg.');
    const toggle = screen.getByRole('switch', { name: 'Heller Modus' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('baldweg-theme')).toBe('light');
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
});
