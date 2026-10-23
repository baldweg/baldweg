# urlaubsjahr – Urlaubsplaner

Statische, deutschsprachige React-/TypeScript-Anwendung mit Vite. Kein Backend,
keine Anmeldung und keine Übertragung der Urlaubsplanung. Nur die Auswahl von
Dark/Light Mode wird im Local Storage unter `urlaubsjahr-theme` gespeichert. Standard
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

## Cloudflare Pages

Das Repository mit Cloudflare Pages verbinden. Build-Befehl: `npm run build`,
Ausgabeverzeichnis: `dist`, Node.js-Version: 24 (Umgebungsvariable `NODE_VERSION`).
Alternativ den lokal gebauten Inhalt von `dist` per Direct Upload bereitstellen.
Cloudflare Web Analytics oder andere zusätzliche Dienste werden von der Anwendung
nicht eingebunden; bei nachträglicher Aktivierung Datenschutzhinweise anpassen.
Der vorhandene GitHub-Pages-Workflow ist davon unabhängig und muss in GitHub
deaktiviert werden, wenn dort kein paralleles Deployment mehr gewünscht ist.

## Funktionen und Regeln

- Impressumsseite über den Footer oder direkt über `#impressum` erreichbar, auch
  auf Cloudflare Pages ohne Server-Routing. Beim Zurückkehren bleibt die Planung erhalten.
  Die Vorlage in `src/App.tsx` enthält ausdrücklich unvollständige Platzhalter:
  Betreiberanschrift und Kontaktdaten vor Veröffentlichung ersetzen und die
  zutreffenden gesetzlichen Informationspflichten prüfen. Die Angaben sind für
  eine Privatperson mit öffentlichem Hobbyprojekt ohne Werbung und Einnahmen
  vorgesehen (§ 18 Abs. 1 MStV). Keine pauschalen Haftungsausschlüsse.
  Die tatsächliche Einordnung ist bei Änderungen des Betriebs erneut zu prüfen.
  Quellen: [§ 18 MStV](https://www.gesetze-bayern.de/Content/Document/MStV-18),
  [§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html).
- Statisches Hosting bedeutet nicht „keine Datenverarbeitung“: Cloudflare Pages
  verarbeitet technische Verbindungsdaten zur Auslieferung und Sicherheit.
  Siehe [Cloudflare-Datenschutzerklärung](https://www.cloudflare.com/privacypolicy/).
  Planung und Namen werden lokal verarbeitet,
  die Darstellung wird im Local Storage gespeichert. Die technischen Hinweise im
  Impressum ersetzen keine vollständige Datenschutzerklärung; erforderliche
  Betreiberinformationen zum Datenschutz vor Veröffentlichung gesondert ergänzen.
- Personen in der Seitenleiste anlegen und per Dropdown oder Klick auf ihren Namen
  in der Personenliste am Kalender auswählen. Beide Auswahlen sind synchron.
  Das Kreuz rechts neben dem
  Namen in der Personenliste am Kalender öffnet ein zentriertes Bestätigungsmodal
  im aktuellen Theme. „Abbrechen“ oder Escape schließen es ohne Löschung.
  Mindestens eine Person bleibt bestehen. Neue Personen starten mit einer leeren
  Planung, Nordrhein-Westfalen, 30 Urlaubstagen und deaktivierten Sonderregeln.
- Bundesland, regionale Feiertage, Budget, Wochenendarbeit, Halbtagsregel und
  Urlaubsauswahl sind je Person getrennt. Konto und Urlaubsliste zeigen die
  ausgewählte Person; Zurücksetzen und Entfernen einer Auszeit betreffen nur sie.
- Urlaub aller Personen bleibt im gemeinsamen Kalender sichtbar, auch bei
  Überschneidungen und auf für die aktive Person gesperrten Tagen. Farbige
  Markierungsleisten, Personenlegende und Tages-Tooltips zeigen die Zuordnung.
  Feiertage und auswählbare Arbeitstage richten sich nach der aktiven Person.
- Der Planungszeitraum gilt für alle Personen. Beim Verkürzen wird die Entfernung
  betroffener Urlaubstage aller Personen gemeinsam bestätigt. Personen und
  Planungen werden wie bisher nicht gespeichert.
- 16 Bundesländer; gesetzliche Feiertage aus `date-holidays`, ohne externe API.
- Bayern: zusätzliche Auswahl für Gemeinden mit Mariä Himmelfahrt und die Stadt
  Augsburg. Sachsen/Thüringen: zusätzliche Auswahl für Gemeinden mit Fronleichnam.
  Die örtliche Gültigkeit muss anhand des Arbeitsorts geprüft werden.
- Planungszeitraum von 1970 bis 2099, einschließlich jahresübergreifender Auswahl.
  Nur berührte Monate werden gezeigt; Tage außerhalb sind gesperrt.
- Standardmäßig Arbeitswoche Montag bis Freitag. Über „Wochenenden sind Arbeitstage“
  zählen auch Samstag und Sonntag als Arbeitstage und benötigen Urlaub. Dies gilt
  für Einzelauswahl, Bereichsauswahl, Verbrauch und zusammenhängende Freizeit.
  Beim Ausschalten werden ausgewählte Wochenendtage mit Hinweis entfernt.
  Gesetzliche Feiertage bleiben in beiden Modi arbeitsfrei.
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
