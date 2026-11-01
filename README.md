# G-HUB-UI

Design system officiel de **G-HUB** — la plateforme e-sport du Cameroun (duels vérifiés, salles de jeux, compétitions, classements).

Basé sur **[Astryx](https://astryx.atmeta.com/)**, le design system open-source de Meta (React + StyleX, 160+ composants), avec un thème maison `esport237` et des composants métier partagés entre le **web** (Next.js, Astro) et le **mobile** (React Native / Expo).

> Dépôt public pour l'instant ; pourra être rendu privé et publié sur npm plus tard sans changer les imports.


Compatibilité native : **Expo SDK 58**, React Native 0.88 et React 19.3. Les contrôles Expo UI utilisent les couleurs et le mode du DS ; les sélecteurs de date gardent un repli web.

## Principes

1. **Une seule source de tokens** — `src/tokens/index.ts` (TS pur, zéro dépendance). Le CSS (`theme.css`) et les composants natifs en dérivent.
2. **Light + dark natifs** — variables CSS `light-dark()` pilotées par `color-scheme` ; attribut `data-theme="light" | "dark"` sur `<html>` (absent = système). Côté mobile : `useColorScheme()`.
3. **Astryx isolé** — les applications n'importent **jamais** `@astryxdesign/*` directement. Seul `src/web/astryx.ts` y a droit : Astryx est en v0.x, ce fichier absorbe les breaking changes.
4. **API parallèle web/native** — mêmes noms (`Button`, `Card`, `Badge`, `Stat`, `SectionLabel`) dans `./web` et `./native` pour des écrans jumeaux.

## Points d'entrée

| Import | Contenu |
|---|---|
| `@esport237hub/ui/tokens` | Tokens TS (couleurs light/dark, spacing, radius, typo) |
| `@esport237hub/ui/css` | Feuille globale (reset + Astryx + thème ESPORT 237) |
| `@esport237hub/ui/theme.css` | Variables `--e237-*` seules (Astro/marketing léger) |
| `@esport237hub/ui/theme` | Thème Astryx `esport237` (`defineTheme`) |
| `@esport237hub/ui/web` | Composants React web + ré-exports Astryx |
| `@esport237hub/ui/native` | Composants React Native (marque E237, zéro dep Expo) |
| `@esport237hub/ui/native/expo` | Bridge `@expo/ui` — contrôles natifs (sheet, picker, switch, date) |

## Utilisation

### Next.js / web

```tsx
// app/globals.css : @import '@esport237hub/ui/css';
// next.config.ts : transpilePackages: ['@esport237hub/ui']
import { Button, Card, PlayerCard, SectionLabel } from '@esport237hub/ui/web';

<Card>
  <SectionLabel>Duel rapide</SectionLabel>
  <PlayerCard name="Sando Pascal" rating={87} division="Division 1" meta="EA SPORTS FC 27 · Yaoundé" />
  <Button>Trouver un duel</Button>
</Card>;
```

### Expo / React Native

```tsx
import { Button, Card, Stat, useE237Colors } from '@esport237hub/ui/native';
// Contrôles natifs (optionnel) — même API que les équivalents RN
import { SelectSheet, SwitchRow } from '@esport237hub/ui/native/expo';

<Card>
  <Stat value="32" label="Victoires" />
  <Button label="Trouver un duel" onPress={findDuel} />
  <SelectSheet label="Jeu" value={game} onChange={setGame} options={games} />
</Card>;
```

**Règle** : Expo UI pour les contrôles système ; RN + tokens pour tout ce qui
porte la marque (boutons dégradés, cartes joueur, tab bar).

### Astro (site marketing)

```astro
---
import '@esport237hub/ui/css';
import { Button } from '@esport237hub/ui/web';
---
<Button client:visible>Télécharger l'app</Button>
```

## Palette (extrait)

| Token | Light | Dark |
|---|---|---|
| `bg` | `#F7F9FB` | `#0B0F14` |
| `surface` | `#FFFFFF` | `#111826` |
| `accent` (vert duel) | `#16A34A` | `#22C55E` |
| `cyan` (sections) | `#0891B2` | `#22D3EE` |
| `gold` (podiums) | `#CA8A04` | `#FACC15` |

Palette complète : [`src/tokens/index.ts`](src/tokens/index.ts).

## Développement

Ce paquet est consommé **en source** (pas de build) : les apps le transpilent
(`transpilePackages` côté Next, Vite côté Astro, Metro côté Expo). Il est monté
en **submodule git** dans le monorepo `esport237hub` (`packages/ui`).

```bash
bun install         # dépendances (typescript, react, astryx…)
bun run typecheck   # tsc web (DOM) + tsc native (RN)
```

> Gestionnaire de paquets : **Bun** uniquement (pas de npm/pnpm/yarn).

Publication npm (plus tard) : ajouter un build `tsup` + `exports` vers `dist/`.

## Licence

MIT © 2026 ESPORT 237 HUB — Sopgwi Armel
