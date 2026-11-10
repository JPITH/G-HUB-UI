import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { DivisionBadge } from './division-badge';
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
