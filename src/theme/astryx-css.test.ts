import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

import { OUT, build } from '../../scripts/astryx-css';

describe('CSS Astryx réduit (scripts/astryx-css.ts)', () => {
  const css = readFileSync(OUT, 'utf8');

  test('à jour avec Astryx et les réexports de src/web/astryx.ts (sinon : bun scripts/astryx-css.ts)', () => {
    expect(css).toBe(build());
  });

  test('garde les classes de l’avatar, retire celles des composants non réexportés', () => {
    const avatar = readFileSync(Bun.resolveSync('@astryxdesign/core/Avatar', import.meta.dir).replace('index.js', 'Avatar.js'), 'utf8');
    const used = avatar.match(/"(x[a-z0-9]{5,8})"/)![1]!;
    expect(css).toContain(`.${used}`);
    // AppShell n'est pas réexporté : sa mise en page n'a rien à faire ici.
    const shell = readFileSync(Bun.resolveSync('@astryxdesign/core/AppShell', import.meta.dir).replace('index.js', 'AppShell.js'), 'utf8');
    const own = [...shell.matchAll(/"(x[a-z0-9]{5,8})"/g)].map((m) => m[1]!).filter((c) => !css.includes(`.${c}`));
    expect(own.length).toBeGreaterThan(0);
    expect(css.length).toBeLessThan(readFileSync(Bun.resolveSync('@astryxdesign/core/astryx.css', import.meta.dir), 'utf8').length / 2);
  });
});
