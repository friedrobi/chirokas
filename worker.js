// Chirokas — Mollie-koppeling via Cloudflare Workers (gratis plan)
//
// Waarom dit bestand bestaat: Mollie-betalingen aanmaken vereist een geheime
// API-sleutel. Die sleutel mag nooit in index.html of inschrijven.html staan
// (die code is voor iedereen zichtbaar in de browser). Deze Worker draait
// server-side bij Cloudflare, houdt de sleutel geheim (als "secret"), en
// wordt door de Chirokas-pagina's aangeroepen via een gewone fetch()-call.
//
// Installatie: zie MOLLIE-SETUP.md.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (!env.MOLLIE_API_KEY) {
      return json({ error: 'MOLLIE_API_KEY ontbreekt — zet deze als secret in de Worker-instellingen.' }, 500, cors);
    }

    try {
      if (url.pathname === '/create-payment' && request.method === 'POST') {
        return await createPayment(request, env, cors);
      }
      if (url.pathname === '/payment-status' && request.method === 'GET') {
        return await paymentStatus(url, env, cors);
      }
      if (url.pathname === '/webhook' && request.method === 'POST') {
        // Mollie vereist een webhookUrl bij het aanmaken van sommige betaalmethodes.
        // Chirokas gebruikt deze niet actief voor reconciliatie (dat gebeurt door
        // de app zelf te pollen via /payment-status), dus dit is een no-op die
        // enkel de verplichte 200 OK teruggeeft.
        return new Response('OK', { status: 200, headers: cors });
      }
      return json({ error: 'Onbekende route.' }, 404, cors);
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 500, cors);
    }
  },
};

async function createPayment(request, env, cors) {
  const body = await request.json();
  const { amount, description, redirectUrl, metadata } = body || {};
  if (!amount || !description || !redirectUrl) {
    return json({ error: 'amount, description en redirectUrl zijn verplicht.' }, 400, cors);
  }

  const webhookUrl = new URL('/webhook', request.url).toString();

  const mollieRes = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.MOLLIE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { currency: 'EUR', value: Number(amount).toFixed(2) },
      description,
      redirectUrl,
      webhookUrl,
      method: 'bancontact',
      metadata: metadata || {},
    }),
  });

  const data = await mollieRes.json();
  if (!mollieRes.ok) {
    return json({ error: data.detail || 'Mollie gaf een foutmelding.' }, mollieRes.status, cors);
  }

  return json({ id: data.id, checkoutUrl: data._links.checkout.href }, 200, cors);
}

async function paymentStatus(url, env, cors) {
  const id = url.searchParams.get('id');
  if (!id) return json({ error: 'id ontbreekt.' }, 400, cors);

  const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(id)}`, {
    headers: { 'Authorization': `Bearer ${env.MOLLIE_API_KEY}` },
  });
  const data = await mollieRes.json();
  if (!mollieRes.ok) {
    return json({ error: data.detail || 'Mollie gaf een foutmelding.' }, mollieRes.status, cors);
  }

  return json({ id: data.id, status: data.status, paidAt: data.paidAt || null }, 200, cors);
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
