import { getCollection, type CollectionEntry } from 'astro:content';
import { isDemo, videos, thumbSrcset } from './content';

export type News = CollectionEntry<'actualites'>;

/** Actus publiées, de la plus récente à la plus ancienne */
export async function getNews(): Promise<News[]> {
  const now = Date.now();
  const keep = (e: { data: { brouillon: boolean; date: Date } }) => !e.data.brouillon && e.data.date.getTime() <= now;
  const all = (isDemo ? await getCollection('actualitesDemo', keep) : await getCollection('actualites', keep)) as News[];
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const newsPath = (n: News) => `/actualites/${n.id}/`;

/** Photo de l'actu, sinon la vignette de la vidéo liée */
export function newsImage(n: News): string | undefined {
  if (n.data.image) return n.data.image;
  const v = n.data.video ? videos.find((x) => x.id === n.data.video) : undefined;
  return v ? (thumbSrcset(v).src as string) : undefined;
}
