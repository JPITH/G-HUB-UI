import { describe, expect, it } from 'bun:test';

import { gameHeroUrl, gameIconUrl } from './catalog';

describe('visuels de nos jeux', () => {
  // Slugs du catalogue (migration 0079) : sans eux, le rail du web montrait « AW » / « PU ».
  it.each(['ludo', 'echecs', 'dames', 'awale', 'puissance-4'])('%s a sa vignette et son bandeau', (slug) => {
    expect(gameIconUrl(slug)).toBe(`/media/game-${slug}.png`);
    expect(gameHeroUrl(slug)).toBe(`/media/hero-${slug}.png`);
  });

  it('un jeu sans visuel livré rend undefined (le repli en initiales)', () => {
    expect(gameIconUrl('inconnu')).toBeUndefined();
  });
});
