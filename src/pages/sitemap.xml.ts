import type { APIRoute } from 'astro';
import { episodes, activeShows, activeThemes, episodesOfShow, contentOfTheme, shorts, paginate, videoPath, thumbSrcset, excerpt, store, isDemo } from '~/lib/content';
import { abs } from '~/lib/seo';
import { getNews, newsPath } from '~/lib/news';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: APIRoute = async () => {
  const news = await getNews();
  const lastmod = store.generatedAt;
  const urls: string[] = [];
  const add = (path: string, mod?: string, extra = '') =>
    urls.push(`<url><loc>${abs(path)}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ''}${extra}</url>`);
  if (!isDemo) {
    add('/', episodes[0]?.publishedAt || lastmod);
    add('/emissions/', episodes[0]?.publishedAt);
    if (shorts.length) add('/extraits/', shorts[0]?.publishedAt);
    if (activeThemes.length) add('/themes/');
    for (const p of ['/participer/', '/equipe/', '/partenaires/', '/contact/']) add(p);
    for (const s of activeShows) {
      const eps = episodesOfShow(s.slug);
      add(`/emissions/${s.slug}/`, eps[0]?.publishedAt);
      paginate(eps, 24).slice(1).forEach((p) => add(`/emissions/${s.slug}/page/${p.page}/`));
    }
    for (const t of activeThemes) {
      const c = contentOfTheme(t.slug);
      if (c.episodes.length + c.shorts.length < 2) continue;
      add(`/themes/${t.slug}/`, c.episodes[0]?.publishedAt);
      paginate(c.episodes, 24).slice(1).forEach((p) => add(`/themes/${t.slug}/page/${p.page}/`));
    }
    if (news.length) add('/actualites/', news[0].data.date.toISOString());
    paginate(news, 18).slice(1).forEach((p) => add(`/actualites/page/${p.page}/`));
    for (const n of news) add(newsPath(n), n.data.date.toISOString());
    for (const v of episodes) {
      if (v.thin) continue;
      const video = `<video:video><video:thumbnail_loc>${esc(thumbSrcset(v).largest)}</video:thumbnail_loc><video:title>${esc(v.title)}</video:title><video:description>${esc(excerpt(v, 1000) || v.title)}</video:description><video:player_loc>https://www.youtube-nocookie.com/embed/${v.id}</video:player_loc><video:duration>${v.durationSec}</video:duration><video:publication_date>${v.publishedAt}</video:publication_date></video:video>`;
      add(videoPath(v), v.refreshedAt?.slice(0, 10) || v.publishedAt, video);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
