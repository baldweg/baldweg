# baldweg – Urlaubsplaner

Statische, deutschsprachige React-/TypeScript-Anwendung mit Vite. Kein Backend,
keine Anmeldung und keine Übertragung der Urlaubsplanung. Nur die Auswahl von
Dark/Light Mode wird im Local Storage unter `baldweg-theme` gespeichert. Standard
ist Dark Mode; Planung und Einstellungen gehen beim Neuladen verloren.

## Lokal starten

Voraussetzung: Node.js 22.12+ oder 24+ und npm.

```sh
npm install
npm run dev
```

Die ausgegebene lokale Adresse im Browser öffnen.

```sh
npm test
npm run build
npm run preview
```

`dist` enthält das statische Deployment. Den Inhalt auf einem beliebigen
statischen Webserver bereitstellen, auch unter einem Unterverzeichnis.
Der Entwicklungsserver ist nur an die lokale Loopback-Adresse gebunden.

## Funktionen und Regeln

- 16 Bundesländer; gesetzliche Feiertage aus `date-holidays`, ohne externe API.
- Bayern: zusätzliche Auswahl für Gemeinden mit Mariä Himmelfahrt und die Stadt
  Augsburg. Sachsen/Thüringen: zusätzliche Auswahl für Gemeinden mit Fronleichnam.
  Die örtliche Gültigkeit muss anhand des Arbeitsorts geprüft werden.
- Planungszeitraum von 1970 bis 2099, einschließlich jahresübergreifender Auswahl.
  Nur berührte Monate werden gezeigt; Tage außerhalb sind gesperrt.
- Arbeitswoche Montag bis Freitag. Wochenenden und Feiertage kosten keinen Urlaub.
- Einzelne Tage anklicken oder Arbeitstage eines Datumsbereichs hinzufügen.
- Optional kosten der 24. und 31. Dezember jeweils 0,5 Urlaubstage, sofern sie
  Arbeitstage sind. Ohne diese betriebliche Sonderregel kosten sie jeweils 1 Tag.
- Urlaubstage-Budget in Schritten von 0,5; Überschreitungen warnen, blockieren aber nicht.
- Automatische Urlaubsblöcke über Wochenenden und Feiertage hinweg. Angezeigt
  werden Urlaubskosten sowie angrenzende arbeitsfreie Kalendertage, auch über
  Jahresgrenzen und den Planungszeitraum hinaus.
- Blöcke mit halben Urlaubstagen werden ausdrücklich nicht als durchgehend
  arbeitsfreie Zeit ausgewiesen.
- Ortswechsel entfernt ausgewählte Tage, die dort Feiertage sind, mit Hinweis.
  Zeitraumverkürzung und Zurücksetzen benötigen bei Auswahl eine Bestätigung.
- Responsive Darstellung, Tastaturbedienung, Tagesbeschriftungen, Feiertagsnamen
  und reduzierte Animationen entsprechend den Systemeinstellungen.

Feiertagsdaten und betriebliche Urlaubsregeln vor verbindlicher Planung prüfen.
Die Datumslogik verwendet lokale Kalendertage statt UTC-Zeitpunkte.

## Projektstruktur

- `src/planner.ts`: Feiertage, Datumslogik, Kosten und Urlaubsblöcke
- `src/App.tsx`: Oberfläche und flüchtiger Planungszustand
- `src/styles.css`: responsive Darstellung und Theme-Variablen
- `src/*.test.ts*`: Berechnungs- und Interaktionstests mit Vitest/Testing Library

Es werden keine externen Schriftarten oder anderen Laufzeitressourcen geladen.
