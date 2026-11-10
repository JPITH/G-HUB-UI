import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

import { MediaImage } from './media-image';

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
});
