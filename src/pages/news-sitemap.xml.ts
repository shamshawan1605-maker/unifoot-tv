// Sitemap Google Actualités : les actus des 2 derniers jours (règle de Google News)
import type { APIRoute } from 'astro';
import { abs } from '~/lib/seo';
import { getNews, newsPath } from '~/lib/news';
import { site } from '@config/site';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const GET: APIRoute = async () => {
  const news = await getNews();
  const since = Date.now() - 2 * 24 * 3600 * 1000;
  const recent = news.filter((n) => n.data.date.getTime() >= since);
  const list = recent.length ? recent : news.slice(0, 1);
  const body = list.map((n) => `<url><loc>${abs(newsPath(n))}</loc><news:news><news:publication><news:name>${esc(site.name)}</news:name><news:language>fr</news:language></news:publication><news:publication_date>${n.data.date.toISOString()}</news:publication_date><news:title>${esc(n.data.titre)}</news:title></news:news></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${body}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
