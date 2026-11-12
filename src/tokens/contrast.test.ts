/**
 * Le garde-fou de la palette.
 *
 * Une couleur se change en une seconde et se vérifie rarement : ce test rend
 * la vérification automatique. Il parcourt CHAQUE couple texte × fond que
 * l'interface peut réellement produire et exige le AA (4.5:1).
 *
 * Il vérifie aussi les deux règles structurelles qui ne se voient pas dans un
 * tableau de couleurs :
 *
 *   • en sombre, une surface plus élevée est plus claire — toujours ;
 *   • l'écart de clarté entre fonds sombres vaut environ le double de
 *     l'écart clair. Sans quoi la hiérarchie s'écrase en mode sombre.
 *
 * `bun test src/tokens` après toute retouche de `tokens/index.ts`.
 */
import { describe, expect, it } from 'bun:test';

import { chart, color, ramp, ROLE, type ColorScale } from './index';
import { contrast, hexToOklch } from './oklch';

/** Seuil AA pour du texte de taille normale. */
const AA = 4.5;
/** Seuil AA pour un élément non textuel (liseré, aplat de graphique). */
const AA_UI = 3;

const SURFACES = {
  light: ['bg', 'frame', 'surface', 'surfaceRaised', 'surfaceSunken'],
  dark: ['bg', 'frame', 'surface', 'surfaceRaised', 'surfaceSunken'],
} as const;

const TEXTS = ['textStrong', 'textPrimary', 'textSecondary', 'textMuted'] as const;

describe.each(['light', 'dark'] as const)('mode %s', (mode) => {
  const c: ColorScale = color[mode];

  it.each([...TEXTS])('le texte %s tient le AA sur les quatre fonds', (textKey) => {
    for (const surfaceKey of SURFACES[mode]) {
      const ratio = contrast(c[textKey], c[surfaceKey]);
      expect(
        ratio,
        `${mode} · ${textKey} sur ${surfaceKey} = ${ratio.toFixed(2)}`,
      ).toBeGreaterThanOrEqual(AA);
    }
  });

  it.each([...(['accent', 'cyan', 'success', 'danger', 'warning', 'info', 'gold'] as const)])(
    'la couleur %s tient le AA en texte sur toutes les surfaces',
    (key) => {
      for (const surfaceKey of SURFACES[mode]) {
        const ratio = contrast(c[key], c[surfaceKey]);
        expect(
          ratio,
          `${mode} · ${key} sur ${surfaceKey} = ${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(AA);
      }
    },
  );

  it("l'étiquette d'un bouton d'accent tient le AA, au repos comme au survol", () => {
    expect(contrast(c.onAccent, c.accent)).toBeGreaterThanOrEqual(AA);
    expect(contrast(c.onAccent, c.accentHover)).toBeGreaterThanOrEqual(AA);
  });

  it('une pastille teintée reste lisible', () => {
    const role = ROLE[mode];
    // cyan : la pilule de division (.e237-divbadge) sans couleur du back-office.
    for (const name of ['accent', 'cyan', 'success', 'danger', 'warning', 'info'] as const) {
      const ratio = contrast(ramp[name][role.text], ramp[name][role.tint]);
      expect(ratio, `${mode} · pastille ${name} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA);
    }
  });

  it('les séries de graphique se détachent du fond des cartes', () => {
    for (const [i, series] of chart[mode].entries()) {
      const ratio = contrast(series, c.surface);
      expect(ratio, `${mode} · série ${i + 1} (${series}) = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
        AA_UI,
      );
    }
  });

  it('les huit séries ont le même poids visuel (couche 3)', () => {
    const ls = chart[mode].map((hex) => hexToOklch(hex).l);
    const spread = Math.max(...ls) - Math.min(...ls);
    // Tolérance serrée : au-delà, une série « crie » plus que ses voisines.
    expect(spread, `amplitude de clarté = ${spread.toFixed(3)}`).toBeLessThan(0.03);
  });
});

describe('structure de la fondation neutre', () => {
  const l = (hex: string) => hexToOklch(hex).l;

  it('en sombre, une surface plus élevée est plus claire', () => {
    const { bg, frame, surface, surfaceRaised } = color.dark;
    expect(l(bg)).toBeLessThan(l(frame));
    expect(l(frame)).toBeLessThan(l(surface));
    expect(l(surface)).toBeLessThan(l(surfaceRaised));
  });

  it("en clair, le cadre est l'ancre sombre et les cartes sont les plus claires", () => {
    const { bg, frame, surface } = color.light;
    expect(l(frame)).toBeLessThan(l(bg));
    expect(l(bg)).toBeLessThan(l(surface));
  });

  it("l'écart entre fonds sombres vaut environ le double de l'écart clair", () => {
    const lightStep = l(color.light.bg) - l(color.light.frame);
    const darkSteps = [
      l(color.dark.frame) - l(color.dark.bg),
      l(color.dark.surface) - l(color.dark.frame),
      l(color.dark.surfaceRaised) - l(color.dark.surface),
    ];
    for (const step of darkSteps) {
      expect(step / lightStep, `rapport = ${(step / lightStep).toFixed(2)}`).toBeGreaterThan(1.5);
    }
  });

  it('les deux traits se distinguent, et le trait discret ne découpe pas la carte', () => {
    for (const mode of ['light', 'dark'] as const) {
      const c = color[mode];
      expect(l(c.border)).not.toBe(l(c.borderStrong));
      // Un liseré de carte doit rester sous ~3:1 : au-delà il dessine un
      // cadre noir au lieu de poser un bord.
      expect(contrast(c.border, c.surface)).toBeLessThan(AA_UI);
    }
  });

  it("l'accent et le succès sont franchement séparés en teinte", () => {
    const dh = Math.abs(hexToOklch(ramp.accent[500]).h - hexToOklch(ramp.success[500]).h);
    expect(dh, `écart de teinte = ${dh.toFixed(0)}°`).toBeGreaterThan(20);
  });
});
