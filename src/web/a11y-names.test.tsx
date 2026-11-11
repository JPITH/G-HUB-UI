import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { BUILTIN_SKINS } from '../skins';
import { CardStage } from './card-stage';
import { EventRow, GameRail } from './dashboard';
import { DivisionBadge } from './division-badge';
import { RankPreview } from './marketing';
import { Combobox, Select } from './pickers';
import { TrendArrow } from './trend-arrow';

const html = (el: ReactElement) => renderToStaticMarkup(el);
const options = [
  { value: 'a', label: 'Pertinence' },
  { value: 'b', label: 'Prix croissant' },
];

/**
 * Noms accessibles du design system (Lighthouse « agent-accessibility-tree »,
 * aria-prohibited-attr, button-name, 11/11/2026) : un `aria-label` n'est
 * permis sur un <span> qu'avec un rôle, et un combobox ne tire JAMAIS son nom
 * de son contenu.
 */
describe('pastilles parlantes : un rôle porte le aria-label', () => {
  it('TrendArrow est une image nommée', () => {
    const out = html(<TrendArrow movement="same" label="Position stable" />);
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Position stable"');
  });

  it('DivisionBadge est une image nommée', () => {
    const out = html(<DivisionBadge rank={1} name="Élite" />);
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="Division 1 : Élite"');
  });

  it('DivisionBadge sans couleur du back-office prend la pastille des tokens', () => {
    expect(html(<DivisionBadge rank={2} />)).toContain('class="e237-divbadge"');
    expect(html(<DivisionBadge rank={2} color="#c08a00" />)).toContain('e237-divbadge--toned');
    // Sans teinte fournie : fond et liseré des tokens (5.01:1 en clair), pas
    // un color-mix à 14 % (4.45:1, sous le AA).
    const theme = readFileSync(new URL('../theme/theme.css', import.meta.url), 'utf8');
    const rule = theme.slice(theme.indexOf('.e237-divbadge {'), theme.indexOf('}', theme.indexOf('.e237-divbadge {')));
    expect(rule).toContain('var(--e237-cyan-subtle)');
    expect(rule).not.toContain('color-mix');
  });
});

describe('combobox : un nom même sans libellé visible', () => {
  it('Select transmet aria-label au déclencheur', () => {
    const out = html(<Select aria-label="Trier" options={options} value="a" onChange={() => {}} />);
    expect(out).toContain('role="combobox"');
    expect(out).toContain('aria-label="Trier"');
  });

  it('Combobox transmet aria-labelledby au déclencheur', () => {
    const out = html(<Combobox aria-labelledby="titre-saison" options={options} value="a" onChange={() => {}} />);
    expect(out).toContain('aria-labelledby="titre-saison"');
  });

  it('avec un libellé visible, le <label for> vise le déclencheur', () => {
    const out = html(<Select id="tri" label="Trier par" options={options} value="a" onChange={() => {}} />);
    expect(out).toContain('for="tri"');
    expect(out).toContain('id="tri"');
  });
});

describe('feuilles : une classe que l’app web rend vit dans components.css', () => {
  it('RankPreview (accueil de l’app web) ne dépend pas de marketing.css', () => {
    const out = html(
      <RankPreview lines={[{ rank: 1, username: 'a', city: 'Douala', division: 'DIV 1' }]} ghostLabel="Ta place" />,
    );
    const components = readFileSync(new URL('../theme/components.css', import.meta.url), 'utf8');
    for (const [, list] of out.matchAll(/class="([^"]+)"/g)) {
      for (const cls of list!.split(' ')) expect({ cls, ici: components.includes(`.${cls}`) }).toEqual({ cls, ici: true });
    }
  });
});

/*
 * label-content-name-mismatch (Lighthouse, revue du tour 3) : un `aria-label`
 * qui ne reprend pas le texte visible (« AW » contre « Awalé », la carte
 * entière contre « Carte EA SPORTS FC 27 de … »). Le nom passe par un texte
 * réservé au lecteur d'écran ; le visuel reste masqué.
 */
describe('nom accessible = texte du bouton, pas un aria-label qui contredit le visuel', () => {
  it('GameRail : vignette sans image nommée par son texte', () => {
    const out = html(<GameRail games={[{ id: 'aw', name: 'Awalé' }, { id: 'p4', name: 'Puissance 4', status: 'coming_soon' }]} />);
    expect(out).not.toContain('aria-label="Awalé"');
    expect(out).toContain('<span class="e237-visually-hidden">Awalé</span>');
    expect(out).toContain('<span class="e237-visually-hidden">Puissance 4 (bientôt)</span>');
    expect(out).toContain('<span class="e237-game-rail__fallback" aria-hidden="true">AW</span>');
  });

  it('CardStage retournable : le libellé est le texte du bouton, les faces sont masquées', () => {
    const out = html(
      <CardStage spec={BUILTIN_SKINS.signature} flippable front={<b>EA SPORTS FC 27</b>} back={<i>dos</i>} flipLabel="Carte FC de Bastos" />,
    );
    expect(out).toContain('role="button"');
    expect(out).not.toContain('aria-label="Carte FC de Bastos"');
    expect(out).toContain('<span class="e237-visually-hidden">Carte FC de Bastos</span>');
    expect(out).toMatch(/class="pcard-stage__face" aria-hidden="true"><b>EA SPORTS FC 27/);
  });

  it('CardStage fixe : ni rôle ni libellé ajouté, le recto reste lisible', () => {
    const out = html(<CardStage spec={BUILTIN_SKINS.signature} front={<b>EA</b>} flipLabel="x" />);
    expect(out).not.toContain('e237-visually-hidden');
    expect(out).toContain('<div class="pcard-stage__face"><b>EA</b>');
  });
});

/*
 * Une ligne d'évènement sans image (revue du tour 3 : vignettes vides dans
 * « Mes prochains billets ») : l'icône de son type dans la vignette de repli.
 */
describe('EventRow : vignette de repli', () => {
  it("pose l'icône donnée dans la vignette, masquée au lecteur d'écran", () => {
    const out = html(<EventRow title="Rencontre" timeLabel="16 nov." icon={<i>users</i>} />);
    expect(out).toContain('class="e237-event-row__thumb e237-event-row__thumb--fallback" aria-hidden="true"><i>users</i></span>');
  });
});
