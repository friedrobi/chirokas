# Chirokas — van Claude-artifact naar eigen app

Deze map bevat alles om Chirokas als een echte, standalone app te hosten,
los van Claude: `index.html` (de leiding-app), `inschrijven.html` (de
publieke inschrijvingspagina voor ouders), `manifest.json`, `sw.js` en twee
icoontjes. Optioneel: `MOLLIE-SETUP.md` voor wie online betalen via Mollie
wil inschakelen. De opslag draait op **Firestore** (gratis onderdeel van
Firebase) in plaats van op de tijdelijke opslag van een Claude-artifact.

## Eenmalig instellen

1. **Firebase-project aanmaken**
   Ga naar [console.firebase.google.com](https://console.firebase.google.com),
   klik op "Project toevoegen", geef het een naam (bv. `chirokas-bodegem`).
   Het gratis Spark-plan is ruim voldoende voor een Chiro.

2. **Firestore inschakelen**
   In het linkermenu: **Build > Firestore Database > Database maken**.
   Kies een regio in Europa (bv. `eur3`). Start in **testmodus** — daarna
   passen we de regels aan (stap 5).

3. **E-mail/Wachtwoord aanmelding inschakelen**
   In het linkermenu: **Build > Authentication > Sign-in method**.
   Schakel **E-mail/Wachtwoord** in. Chirokas gebruikt nu echte, per
   persoon aangemaakte logins in plaats van automatisch/anoniem
   inloggen — dat is nodig om rollen (hoofdleiding / afdelingsleiding)
   te kunnen toewijzen.

4. **Web-app toevoegen en config kopiëren**
   Op het hoofdscherm van je project: klik het `</>`-icoon ("Web-app
   toevoegen"). Geef een naam, sla Firebase Hosting gerust over. Je krijgt
   een `firebaseConfig`-object te zien — kopieer dat en plak het in
   `index.html`, bovenaan in `<head>`, op de plaats van
   `firebaseConfig = { apiKey: "VUL_HIER_IN", ... }`.

5. **Eerste hoofdleiding-account aanmaken (eenmalig, manueel)**
   De app kan zichzelf geen eerste beheerder geven — dat moet één keer
   via de Firebase-console:
   - **Authentication > Users > Add user**: geef je eigen e-mailadres
     en een wachtwoord op.
   - **Firestore Database > Data > Start collection**: naam
     `chirokas_users`. Document-ID: exact je e-mailadres (zelfde als
     hierboven). Velden: `email` (string, je eigen e-mailadres), `naam`
     (string, je eigen voor- en achternaam — bv. "Jan Peeters", niet
     letterlijk het woord "naam"), `role` (string, exact `hoofdleiding`),
     `afdeling` (string, leeg laten).
   Vanaf dan kan je verder alle andere leiding toevoegen via
   Instellingen > Gebruikers in de app zelf — deze stap is dus echt
   maar één keer nodig.

6. **Firestore-regels beperken**
   Ga naar **Firestore Database > Regels** en vervang de inhoud door:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function isSignedIn() { return request.auth != null; }
       function myRole() {
         return get(/databases/$(database)/documents/chirokas_users/$(request.auth.token.email)).data;
       }
       function isHoofdleiding() {
         return isSignedIn() && myRole().role == 'hoofdleiding';
       }

       match /chirokas_users/{email} {
         allow read: if isSignedIn() && (request.auth.token.email == email || isHoofdleiding());
         allow write: if isHoofdleiding();
       }
       match /chirokas/settings {
         allow read: if isSignedIn();
         allow write: if isHoofdleiding()
           || (isSignedIn() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['nextRef']));
       }
       match /chirokas/members {
         allow read, write: if isSignedIn();
       }
       match /chirokas/ledger {
         allow read, write: if isSignedIn();
       }
     }
   }
   ```
   Klik op **Publiceren**.

   **Waarom die uitzondering voor `nextRef`**: de publieke
   inschrijvingspagina (`inschrijven.html`) meldt zich anoniem aan — ouders
   hebben geen leiding-account — en moet bij elke nieuwe inschrijving de
   teller voor betaalreferenties kunnen ophogen. Zonder die uitzondering
   zou elke inschrijving via die pagina stilletjes dezelfde referentie
   blijven hergebruiken. Alle andere Chirogegevens (IBAN, naam, Mollie...)
   blijven wel volledig hoofdleiding-only, ook voor schrijven.

   **Belangrijk om te weten**: deze regels controleren wie er mag
   inloggen en wie Instellingen mag aanpassen, maar ze filteren de
   leden- en boekhoudingdata zelf niet per afdeling — die twee leven
   in Firestore als één groot document voor de hele Chiro (zie
   "Hoe dit zit" hieronder). De schifting per afdeling gebeurt in de
   app zelf (afdelingsleiding ziet enkel hun eigen afdeling in het
   scherm), niet op databaseniveau. Voor een kleine, vertrouwde
   leidingsploeg is dat een redelijke afweging; wie dat écht
   waterdicht wil, zou de leden en boekingen elk als apart document
   moeten opslaan — een grotere herbouw die enkel de moeite waard is
   bij een aanzienlijk grotere of gevoeligere organisatie.

   **Nog een bestaande beperking, niet nieuw door deze wijziging**: omdat
   `inschrijven.html` de volledige ledenlijst moet kunnen doorzoeken om
   dubbels te herkennen, kan in principe iedereen die deze pagina opent
   (via de browserconsole) de volledige ledenlijst uitlezen — namen,
   adressen, geboortedata, telefoonnummers. Dat was ook al zo vóór deze
   wijziging. Enkel op te lossen met dezelfde grotere herbouw als
   hierboven (leden als aparte documenten, met regels per document).

7. **Storage inschakelen (voor bijlagen bij boekingen)**
   In het linkermenu: **Build > Storage > Get started**. Start in
   testmodus, zelfde regio als je Firestore. Ga daarna naar het
   tabblad **Rules** en vervang de inhoud door:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /bijlagen/{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   Klik op **Publiceren**. Gratis tot 5GB opslag — ruim voldoende voor
   foto's en PDF's van bonnetjes en facturen.

## Gebruikers en rollen

Vanaf nu logt iedereen in met een eigen e-mailadres en wachtwoord, in
plaats van automatisch/anoniem. Twee rollen:

- **Hoofdleiding**: ziet en beheert alles, inclusief Instellingen.
- **Afdelingsleiding**: ziet enkel leden, boekingen en herinneringen
  van hun eigen afdeling; geen toegang tot Instellingen, het
  rekeninguittreksel-import, of andere afdelingen.

Na de eenmalige bootstrap-stap hierboven beheer je dit verder volledig
vanuit de app: **Instellingen > Gebruikers**. Daar maak je in één stap
zowel de login als de roltoewijzing aan; je krijgt een tijdelijk
wachtwoord te zien om door te geven. De persoon kan dat zelf wijzigen
via "Wachtwoord wijzigen" bovenaan de app na het inloggen.

Een gebruiker verwijderen via die lijst haalt enkel de roltoewijzing
weg (die persoon verliest dan alle toegang) — het account zelf
verwijderen kan enkel via Authentication in de Firebase-console.

## E-mails automatisch versturen (EmailJS)

Standaard opent "Open e-mail" gewoon je eigen mailprogramma — dat werkt
altijd, zonder verdere instellingen. Wil je ook automatisch kunnen
versturen (handig voor de "Verstuur naar alle leden"-knop), dan heb je
een gratis EmailJS-account nodig:

1. Maak een gratis account op [emailjs.com](https://www.emailjs.com)
   (tot 200 mails/maand gratis — ruim voldoende voor een Chiro).
2. **Email Services > Add New Service**: koppel het mailadres waarmee je
   wil versturen (bv. een Gmail-account van de Chiro). Onthoud de
   **Service ID**.
3. **Email Templates > Create New Template**: zet het veld **Subject**
   op `{{subject}}` en de inhoud van het bericht op `{{message}}` (de
   ontvanger komt uit `{{to_email}}`, de naam uit `{{to_name}}` — die
   hoef je zelf niet in de template te typen, enkel te weten dat ze
   bestaan als je het sjabloon verder wil opmaken). Onthoud de
   **Template ID**.
4. **Account > General**: kopieer je **Public Key**.
5. Vul deze drie waarden in bovenaan `index.html`, op de plaats van
   `EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID` en `EMAILJS_TEMPLATE_ID`.

Zonder deze stappen blijft "Open e-mail" gewoon werken — enkel de
"Verstuur"-knoppen en de bulkverzending vereisen deze koppeling.

## Per afdeling opsplitsen

Elk lid kan een afdeling krijgen (Pagatters, Speelclub, Rakkers, Kwiks,
Tippers, Toppers, Kerels, Tiptiens, Aspi's, Leiding — instelbaar per
lid in "Leden", of via een "Afdeling"-kolom bij Excel-import). Elke
boeking kan dat ook, optioneel — lidgeldbetalingen krijgen de afdeling
van het lid automatisch mee, zonder dat je dat zelf moet aanduiden.
"Overzicht" toont een tabel met inkomsten, uitgaven en openstaande
lidgelden per afdeling; "Boekhouding" heeft een filter om de
boekingenlijst tot één afdeling te beperken (het echte saldo bovenaan
blijft altijd het totaal van alle afdelingen samen).

## Ouders bereiken via WhatsApp

Werkt zonder enige instelling — geen account, geen koppeling nodig.
De "WhatsApp"-knop bij een lid (tabblad "Herinneringen") opent een
kant-en-klaar bericht naar het gsm-nummer van dat lid via een
`wa.me`-link; jij bekijkt en verstuurt het bericht zelf in WhatsApp
(app of web).

Let op: dit kan enkel één voor één, er bestaat geen "verstuur naar
iedereen"-knop voor WhatsApp. Echte automatische WhatsApp-verzending
vereist een goedgekeurde WhatsApp Business-koppeling bij Meta — een
zware, formele aanvraagprocedure met (meestal) kosten per bericht, wat
voor een Chiro niet in verhouding staat tegenover wat het oplevert.

## Kampinschrijvingen met gezinsprijzen

Tabblad "Kamp" laat leden inschrijven voor het kamp aan een prijs die
afhangt van de gezinsgrootte:

- Koppel broers/zussen via het **"Gezin"-veld** in het ledendetail
  (klik op een lid in "Leden" of "Kamp") — typ dezelfde naam bij elk
  kind uit hetzelfde gezin (een suggestielijst verschijnt automatisch
  op basis van al ingevoerde gezinsnamen).
- De prijzen zelf stel je in bij **Instellingen > Kampprijzen**:
  eerste kind, tweede kind, vanaf derde kind, en een apart vast
  bedrag voor Pagatters (die tellen niet mee in de gezinsteller).
- Wie van een gezin **het eerst** ingeschreven wordt, krijgt het
  eerste-kind-tarief; de volgende het tweede-kind-tarief, enzovoort.
  Die prijs ligt daarna vast — komt er later nog een broer of zus
  bij, dan verandert de al vastgelegde prijs van de eerdere
  inschrijvingen niet meer.
- De betaalflow zelf werkt identiek aan lidgeld: gratis QR-code met
  een eigen, stabiele gestructureerde mededeling, "markeer als
  betaald", en herkenning bij het importeren van een
  rekeninguittreksel (CODA). Boekingen komen in de boekhouding onder
  categorie "Kampinschrijving" terecht.

**Bewust nog niet gebouwd** — om het behapbaar te houden: een
publieke inschrijvingspagina voor ouders (zoals `inschrijven.html`
voor lidgeld) is er nog niet; kampinschrijving gebeurt voorlopig
enkel via de leiding zelf in de app. Ook WhatsApp/e-mailherinneringen
en Mollie zijn nog niet gekoppeld aan kampbetalingen — enkel de
gratis QR-flow. Beide zijn wel op dezelfde manier uit te breiden als
gewenst.

## Hosten (gratis)

Kies één van beide — beide zijn gratis en werken met deze bestanden zoals ze zijn:

**Optie A — Firebase Hosting** (alles in één dashboard):
```
npm install -g firebase-tools
firebase login
firebase init hosting   # kies je project, public folder = deze map, single-page app = nee
firebase deploy
```
Je krijgt een gratis `https://jouwproject.web.app`-adres.

**Optie B — GitHub Pages** (als je al met GitHub werkt):
Zet deze bestanden in een GitHub-repository, ga naar
**Settings > Pages**, kies de branch en map, en je krijgt een gratis
`https://gebruikersnaam.github.io/repo-naam` adres.

## Als een echte app op de telefoon

Zodra de app online staat: open de link op een telefoon en kies
**"Zet op beginscherm" / "App installeren"** in het browsermenu. Dankzij
`manifest.json` en `sw.js` verschijnt Chirokas dan als een gewoon
app-icoontje, zonder browserbalk.

## Nadien

- Alle leden en boekingen die nu al in de Claude-versie staan, staan
  **niet automatisch** in deze nieuwe versie — die begint leeg. Gebruik
  de Excel-import in het tabblad "Leden" om je ledenlijst opnieuw in te
  laden.
- Wil je later een eigen domeinnaam (bv. `kas.chirobodegem.be`)? Dat kan
  gratis toegevoegd worden bij zowel Firebase Hosting als GitHub Pages,
  via de respectievelijke instellingenpagina's.
