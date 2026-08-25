# Chirokas — van Claude-artifact naar eigen app

Deze map bevat alles om Chirokas als een echte, standalone app te hosten,
los van Claude: `index.html`, `manifest.json`, `sw.js` en twee icoontjes.
De opslag draait op **Firestore** (gratis onderdeel van Firebase) in plaats
van op de tijdelijke opslag van een Claude-artifact.

## Eenmalig instellen

1. **Firebase-project aanmaken**
   Ga naar [console.firebase.google.com](https://console.firebase.google.com),
   klik op "Project toevoegen", geef het een naam (bv. `chirokas-bodegem`).
   Het gratis Spark-plan is ruim voldoende voor een Chiro.

2. **Firestore inschakelen**
   In het linkermenu: **Build > Firestore Database > Database maken**.
   Kies een regio in Europa (bv. `eur3`). Start in **testmodus** — daarna
   passen we de regels aan (stap 5).

3. **Anonieme aanmelding inschakelen**
   In het linkermenu: **Build > Authentication > Sign-in method**.
   Schakel **Anoniem** in. Zo hoeft de leiding niet in te loggen, maar
   is de database toch niet zomaar voor iedereen op het internet open.

4. **Web-app toevoegen en config kopiëren**
   Op het hoofdscherm van je project: klik het `</>`-icoon ("Web-app
   toevoegen"). Geef een naam, sla Firebase Hosting gerust over. Je krijgt
   een `firebaseConfig`-object te zien — kopieer dat en plak het in
   `index.html`, bovenaan in `<head>`, op de plaats van
   `firebaseConfig = { apiKey: "VUL_HIER_IN", ... }`.

5. **Firestore-regels beperken**
   Ga naar **Firestore Database > Regels** en vervang de inhoud door:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /chirokas/{docId} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   Klik op **Publiceren**. Nu kan enkel wie via de app is aangemeld
   (automatisch en onzichtbaar dankzij stap 3) lezen en schrijven.

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
