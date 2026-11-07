// Index de recherche (chargé seulement quand on ouvre la loupe)
import type { APIRoute } from 'astro';
import { episodes, shorts, videos, showOf, videoPath, fr } from '~/lib/content';
import { getNews, newsPath, newsImage } from '~/lib/news';
import { invites } from '@config/invites';

export const GET: APIRoute = async () => {
  const news = await getNews();
  const items = [
    ...news.map((n) => ({ t: 'a', ti: fr(n.data.titre), s: 'Actu', u: newsPath(n), i: newsImage(n) ?? '', d: n.data.date.toISOString().slice(0, 10), k: n.data.chapo })),
    ...episodes.map((v) => ({ t: 'e', ti: fr(v.title), s: showOf(v).name, u: videoPath(v), i: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, d: v.publishedAt.slice(0, 10), k: v.guest ?? '' })),
    ...invites.filter((g) => g.photo).map((g) => { const v = videos.find((x) => x.id === g.video); return { t: 'g', ti: g.name, s: g.role ?? 'Invité', u: v ? videoPath(v) : g.link ?? '/', i: g.photo!, d: '', k: g.role ?? '' }; }),
    ...shorts.map((v) => ({ t: 's', ti: fr(v.title), s: 'Extrait', u: `/extraits/?v=${v.id}`, i: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`, d: v.publishedAt.slice(0, 10), k: '' })),
  ];
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
