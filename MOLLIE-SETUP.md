# Mollie inschakelen in Chirokas

Deze stappen zijn eenmalig. Geen creditcard of Firebase-upgrade nodig — alles
blijft op gratis niveau (Firebase Spark, Cloudflare Workers gratis plan).

## 1. Mollie-account

1. Maak een account op [mollie.com](https://www.mollie.com) voor de Chiro
   (met de IBAN van de Chiro-rekening).
2. Rond de verificatie van jullie organisatie af (Mollie vraagt basisgegevens
   van de vzw/feitelijke vereniging — dit is eenmalig).
3. Ga naar **Ontwikkelaars > API-sleutels** en kopieer je **live API-sleutel**
   (begint met `live_...`). Wil je eerst testen zonder echt geld, gebruik dan
   tijdelijk de **test API-sleutel** (`test_...`).

## 2. Cloudflare Worker aanmaken (houdt je Mollie-sleutel geheim)

1. Maak een gratis account op [dash.cloudflare.com](https://dash.cloudflare.com)
   — geen betaalgegevens nodig voor het gratis Workers-plan.
2. In het linkermenu: **Workers & Pages > Create > Create Worker**.
3. Geef een naam, bv. `chirokas-mollie`, en klik **Deploy** (dit zet eerst
   een standaard "Hello World"-Worker live — dat is normaal).
4. Klik daarna **Edit code**. Verwijder alle bestaande code en plak de
   volledige inhoud van `worker.js` erin. Klik **Save and Deploy**.
5. Ga naar **Settings > Variables and Secrets** van deze Worker.
   Voeg een secret toe:
   - Naam: `MOLLIE_API_KEY`
   - Waarde: je Mollie API-sleutel uit stap 1
   Klik **Save and Deploy**.
6. Bovenaan de Worker-pagina staat de URL van je Worker, iets als
   `https://chirokas-mollie.jouwnaam.workers.dev`. Kopieer die.

## 3. Chirokas koppelen

1. Open `index.html` (via je gewone link), ga naar **Instellingen**.
2. Onder **"Online betalen via Mollie"**: plak de Worker-URL uit stap 2.6,
   en zet **"Mollie inschakelen"** aan. Klik **Opslaan**.
3. Test het via de inschrijvingspagina (`inschrijven.html`) — schrijf een
   proeflid in en klik "Betaal nu online". Gebruik hiervoor gerust eerst de
   Mollie **test**-sleutel, en Mollie's testkaartgegevens
   (zie hun documentatie) voor een nepbetaling zonder echt geld.
4. Zodra alles werkt, vervang de test-sleutel door je live-sleutel in de
   Worker-secret (stap 2.5) — de rest verandert niet.

## Kosten

Enkel Mollie zelf rekent iets aan, per succesvolle betaling — geen vaste
kosten. Voor Bancontact (de standaardkeuze in deze koppeling) is dat
doorgaans €0,39 excl. btw per transactie. De Cloudflare Worker en Firebase
blijven volledig gratis voor het gebruiksvolume van een Chiro.

## Als er iets misloopt

- **"Online betalen lukte niet" op de inschrijvingspagina** → meestal een
  verkeerde Worker-URL in Instellingen, of de `MOLLIE_API_KEY`-secret
  ontbreekt nog. De gratis QR-optie blijft in dat geval gewoon werken als
  terugvaloptie.
- **Betaling gebeurd, maar niet automatisch geboekt** → gebruik de knop
  "Mollie-betalingen controleren" onderaan het tabblad Boekhouding in
  `index.html`. Dat controleert alle openstaande Mollie-betalingen opnieuw.
