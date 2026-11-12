import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { MediaImage, mountedStatus } from './media-image';

/**
 * Rendue par le serveur, l'image peut finir de charger AVANT l'hydratation :
 * son évènement `load` est perdu et elle restait à opacité 0 (10/11/2026,
 * « Nos jeux » rendu côté serveur : cartes grises).
 */
describe('MediaImage : image déjà chargée au montage', () => {
  it('déjà chargée → prête ; en cours → chargement ; sans source → erreur', () => {
    expect(mountedStatus({ complete: true, naturalWidth: 640 }, true)).toBe('ready');
    expect(mountedStatus({ complete: false, naturalWidth: 0 }, true)).toBe('loading');
    expect(mountedStatus(null, true)).toBe('loading');
    expect(mountedStatus(null, false)).toBe('error');
  });

  it("déjà en échec (complete sans pixels) → chargement : le repli passe par onError", () => {
    expect(mountedStatus({ complete: true, naturalWidth: 0 }, true)).toBe('loading');
  });
});

/** L'image qui fait le LCP d'une liste (la première carte) part tout de suite, en priorité. */
describe('MediaImage : priority', () => {
  it('par défaut, chargement différé', () => {
    const out = renderToStaticMarkup(<MediaImage src="https://cdn.test/a.avif" alt="" />);
    expect(out).toContain('loading="lazy"');
    expect(out).not.toContain('fetchPriority');
  });

  it('priority : chargement immédiat, priorité haute', () => {
    const out = renderToStaticMarkup(<MediaImage src="https://cdn.test/a.avif" alt="" priority />);
    expect(out).toContain('loading="eager"');
    expect(out).toContain('fetchPriority="high"');
  });

  /**
   * Le fondu (opacité 0 jusqu'à `onLoad`) attend le JavaScript : sur l'image
   * du LCP rendue par le serveur, il repoussait le LCP après l'hydratation
   * (5,1 s simulés sur « Nos jeux » mobile). L'image prioritaire est visible
   * dès qu'elle arrive.
   */
  it("priority : visible sans attendre l'hydratation ; les autres gardent le fondu", () => {
    expect(renderToStaticMarkup(<MediaImage src="https://cdn.test/a.avif" alt="" priority />)).not.toContain('opacity:0');
    expect(renderToStaticMarkup(<MediaImage src="https://cdn.test/a.avif" alt="" />)).toContain('opacity:0');
  });
});
