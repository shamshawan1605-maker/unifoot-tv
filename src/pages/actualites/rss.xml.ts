// Flux RSS des actus (lecteurs RSS, Google Discover, agrégateurs)
import type { APIRoute } from 'astro';
import { abs } from '~/lib/seo';
import { getNews, newsPath, newsImage } from '~/lib/news';
import { site } from '@config/site';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const GET: APIRoute = async () => {
  const news = (await getNews()).slice(0, 30);
  const items = news.map((n) => {
    const img = newsImage(n);
    return `<item><title>${esc(n.data.titre)}</title><link>${abs(newsPath(n))}</link><guid isPermaLink="true">${abs(newsPath(n))}</guid><pubDate>${n.data.date.toUTCString()}</pubDate><description>${esc(n.data.chapo)}</description>${img ? `<enclosure url="${esc(abs(img))}" type="image/${img.endsWith('.webp') ? 'webp' : 'jpeg'}" length="0"/>` : ''}</item>`;
  }).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(site.name)} : l'actu du foot amateur</title><link>${abs('/actualites/')}</link><atom:link href="${abs('/actualites/rss.xml')}" rel="self" type="application/rss+xml"/><description>L'actualité du football amateur par UNIFOOT TV.</description><language>fr-FR</language>${news[0] ? `<lastBuildDate>${news[0].data.date.toUTCString()}</lastBuildDate>` : ''}${items}</channel></rss>`, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
