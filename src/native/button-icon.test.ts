import { describe, expect, it } from 'bun:test';
import { createElement, type ReactElement } from 'react';

import { inertIcon } from './button-icon';

function Glyph(_: { name: string; color?: string; size?: number }) {
  return null;
}
function Bare(_: { name: string }) {
  return null;
}

describe('inertIcon — l’icône d’un bouton désactivé reste visible', () => {
  it('recolore une icône qui accepte `color` (onAccent devient la couleur atténuée)', () => {
    const icon = createElement(Glyph, { name: 'play', color: '#fff', size: 16 });
    const out = inertIcon(icon, '#777');
    expect(out.dim).toBe(false);
    const props = (out.node as ReactElement<{ color: string; size: number; name: string }>).props;
    expect(props.color).toBe('#777');
    expect(props.size).toBe(16);
    expect(props.name).toBe('play');
  });

  it('atténue (sans recolorer) un élément qui ne prend pas de `color`', () => {
    const icon = createElement(Bare, { name: 'x' });
    const out = inertIcon(icon, '#777');
    expect(out.dim).toBe(true);
    expect(out.node).toBe(icon);
  });

  it('laisse passer l’absence d’icône', () => {
    expect(inertIcon(undefined, '#777')).toEqual({ node: undefined, dim: false });
  });
});
