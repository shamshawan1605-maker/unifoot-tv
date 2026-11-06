// Alerte e-mail (via l'API Resend) quand la synchronisation échoue plusieurs fois de suite.

export async function sendAlert(subject: string, text: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const to = process.env.ALERT_EMAIL_TO;
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ALERT_EMAIL_FROM || 'UNIFOOT TV <alertes@unifoottv.fr>';
  if (!to || !key) {
    console.warn('[alerte] ALERT_EMAIL_TO ou RESEND_API_KEY non configurés : alerte non envoyée.');
    return false;
  }
  const endpoint = process.env.RESEND_API_BASE || 'https://api.resend.com';
  try {
    const res = await fetchImpl(`${endpoint}/emails`, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: to.split(',').map((s) => s.trim()), subject, text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(`[alerte] envoi refusé : HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[alerte] envoi impossible :', (err as Error).message);
    return false;
  }
}
