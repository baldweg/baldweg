import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  window.history.replaceState(null, '', window.location.pathname);
  vi.restoreAllMocks();
});

function navigate(hash: string) {
  act(() => {
    window.history.replaceState(null, '', `${window.location.pathname}${hash}`);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

it('zeigt das Impressum über den Footer und behält die Planung beim Zurückkehren', () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(<App />);
  fireEvent.change(screen.getByLabelText('Verfügbare Urlaubstage'), { target: { value: '23' } });
  expect(screen.getByRole('link', { name: 'Impressum' })).toHaveAttribute('href', '#impressum');
  navigate('#impressum');
  expect(screen.getByRole('heading', { name: 'Impressum' })).toHaveFocus();
  expect(screen.getByText(/Unvollständige Vorlage/)).toBeInTheDocument();
  expect(screen.getByText(/Vollständiger Vor- und Nachname/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Anbieter gemäß § 18 Abs. 1 MStV' })).toBeInTheDocument();
  expect(screen.getByText(/Erreichbare E-Mail-Adresse/)).toBeInTheDocument();
  expect(screen.getByText(/Die Website wird über Cloudflare Pages bereitgestellt/)).toBeInTheDocument();
  expect(screen.getByText(/ersetzen keine vollständige Datenschutzerklärung/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Datenschutzerklärung von Cloudflare' })).toHaveAttribute('href', 'https://www.cloudflare.com/privacypolicy/');
  expect(screen.queryByText(/GitHub/)).not.toBeInTheDocument();
  expect(screen.queryByRole('complementary', { name: 'Einstellungen' })).not.toBeInTheDocument();
  expect(document.title).toBe('Impressum · urlaubsjahr');
  expect(screen.getByRole('link', { name: /Zurück zum Urlaubsplaner/ })).toHaveAttribute('href', '#');
  navigate('');
  expect(screen.getByLabelText('Verfügbare Urlaubstage')).toHaveValue(23);
  expect(document.title).toBe('urlaubsjahr · Dein Urlaubsplaner');
});

it('unterstützt den direkten Aufruf der Impressumsseite', () => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  window.history.replaceState(null, '', '#impressum');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Impressum' })).toBeInTheDocument();
  expect(screen.getAllByRole('main')).toHaveLength(1);
});
