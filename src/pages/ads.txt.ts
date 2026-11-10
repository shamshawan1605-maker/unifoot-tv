import type { APIRoute } from 'astro';
import { google } from '@config/site';
// Fichier ads.txt exigé par AdSense : déclare qui a le droit de vendre la pub du site.
export const GET: APIRoute = () =>
  new Response(
    google.adsenseClient
      ? `google.com, ${google.adsenseClient.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`
      : '# Aucune régie publicitaire pour le moment\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
