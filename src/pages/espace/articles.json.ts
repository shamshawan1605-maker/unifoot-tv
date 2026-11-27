// Liste des articles publiés (slug, titre, date, auteur), lue par /api/espace.php pour l'espace contributeur.
import type { APIRoute } from 'astro';
import { getNews } from '~/lib/news';

export const GET: APIRoute = async () => {
  const all = await getNews();
  const liste = all.map((n) => ({ slug: n.id, titre: n.data.titre, date: n.data.date.toISOString().slice(0, 10), auteur: n.data.auteur }));
  return new Response(JSON.stringify(liste), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
