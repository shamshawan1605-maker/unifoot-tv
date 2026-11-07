import { site, links, legal } from '@config/site';
import type { Video } from '~/types';
import { isoDuration, showOf, videoPath, thumbSrcset } from './content';
import { allShows } from '@config/shows';

export const SITE = (import.meta.env.SITE as string).replace(/\/$/, '');
export const abs = (path: string) => (path.startsWith('http') ? path : `${SITE}${path}`);

export const organization = {
  '@type': ['Organization', 'NewsMediaOrganization'],
  '@id': `${SITE}/#organization`,
  name: site.name,
  url: `${SITE}/`,
  email: site.email,
  logo: abs(site.logo.src || '/brand/icon-512.png'),
  sameAs: [links.youtube, links.instagram, links.tiktok, links.facebook, links.x, links.linkedin, links.tipeee],
  address: { '@type': 'PostalAddress', streetAddress: '9 rue des Colonnes', postalCode: '75002', addressLocality: 'Paris', addressCountry: 'FR' },
  legalName: legal.company,
  founder: { '@type': 'Person', '@id': `${SITE}/equipe/#shamsh`, name: 'Shamsh Awan', url: `${SITE}/equipe/` },
  slogan: 'Le média du football amateur',
};

export const website = {
  '@type': 'WebSite',
  '@id': `${SITE}/#website`,
  name: site.name,
  url: `${SITE}/`,
  inLanguage: 'fr-FR',
  publisher: { '@id': `${SITE}/#organization` },
  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
};

export function breadcrumbLd(items: { name: string; href?: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      ...(it.href ? { item: abs(it.href) } : {}),
    })),
  };
}

export function podcastSeriesLd() {
  return {
    '@type': 'PodcastSeries',
    '@id': `${SITE}/#podcast`,
    name: allShows[0].name,
    url: abs(`/emissions/${allShows[0].slug}/`),
    webFeed: 'https://anchor.fm/s/103114550/podcast/rss',
    inLanguage: 'fr-FR',
    author: { '@id': `${SITE}/#organization` },
    sameAs: [links.spotify, links.apple, links.deezer, links.amazon],
  };
}

export function videoLd(v: Video, description: string) {
  const ld: Record<string, unknown> = {
    '@type': 'VideoObject',
    '@id': `${abs(videoPath(v))}#video`,
    name: v.title,
    description: description || v.title,
    thumbnailUrl: v.thumbnails.map((t) => t.url).reverse(),
    uploadDate: v.publishedAt,
    duration: isoDuration(v.durationSec),
    embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`,
    url: abs(videoPath(v)),
    inLanguage: 'fr-FR',
    publisher: { '@id': `${SITE}/#organization` },
    isPartOf: { '@type': 'CreativeWorkSeries', name: showOf(v).name, url: abs(`/emissions/${v.show}/`) },
  };
  if (v.viewCount !== undefined)
    ld.interactionStatistic = { '@type': 'InteractionCounter', interactionType: { '@type': 'WatchAction' }, userInteractionCount: v.viewCount };
  if (v.chapters.length)
    ld.hasPart = v.chapters.map((c, i) => ({
      '@type': 'Clip',
      name: c.label,
      startOffset: c.start,
      endOffset: v.chapters[i + 1]?.start ?? v.durationSec,
      url: `https://www.youtube.com/watch?v=${v.id}&t=${c.start}s`,
    }));
  return ld;
}

export function podcastEpisodeLd(v: Video) {
  const p = v.podcast!;
  return {
    '@type': 'PodcastEpisode',
    name: p.title,
    datePublished: p.publishedAt,
    url: p.url || abs(videoPath(v)),
    ...(p.audioUrl ? { associatedMedia: { '@type': 'MediaObject', contentUrl: p.audioUrl, encodingFormat: p.audioType || 'audio/mpeg' } } : {}),
    ...(p.durationSec ? { timeRequired: isoDuration(p.durationSec) } : {}),
    partOfSeries: { '@id': `${SITE}/#podcast` },
    image: thumbSrcset(v).largest,
  };
}
