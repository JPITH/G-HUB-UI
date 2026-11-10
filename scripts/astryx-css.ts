/**
 * CSS Astryx réduit aux composants que le design system réexporte.
 *
 *   bun scripts/astryx-css.ts           # régénère src/theme/astryx.css
 *   bun scripts/astryx-css.ts --check   # échoue si le fichier n'est pas à jour
 *
 * `@astryxdesign/core/astryx.css` porte le StyleX précompilé de TOUS ses
 * composants (127 Ko, 21 Ko gzip) ; G-HUB n'en réexporte que quatre
 * (src/web/astryx.ts). L'app web le chargeait en entier, en CSS bloquant le
 * rendu. On garde chaque règle dont toutes les classes apparaissent dans le
 * JavaScript de ces composants et de leurs imports relatifs — StyleX émet une
 * règle par ligne et des noms de classe atomiques, un filtre ligne à ligne
 * suffit. À relancer après une mise à jour d'Astryx ou un nouveau réexport
 * (le test src/theme/astryx-css.test.ts le signale).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, 'src/theme/astryx.css');

/** Les sous-chemins `@astryxdesign/core/X` réexportés par src/web/astryx.ts. */
export function entries(): string[] {
  const src = readFileSync(join(ROOT, 'src/web/astryx.ts'), 'utf8');
  return [...new Set([...src.matchAll(/from\s+['"](@astryxdesign\/core\/[^'"]+)['"]/g)].map((m) => m[1]!))];
}

/** Tous les mots du JS de ces composants et de leurs imports relatifs. */
function tokens(): Set<string> {
  const seen = new Set<string>();
  const out = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file) || file.endsWith('.json')) return;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    for (const t of src.split(/[^A-Za-z0-9_-]+/)) out.add(t);
    for (const m of src.matchAll(/(?:from|import)\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const next = resolve(dirname(file), m[1]!);
      visit(/\.(js|json)$/.test(next) ? next : `${next}.js`);
    }
  };
  for (const e of entries()) visit(Bun.resolveSync(e, ROOT));
  return out;
}

/** Le CSS réduit, prêt à écrire. */
export function build(): string {
  const used = tokens();
  const full = readFileSync(Bun.resolveSync('@astryxdesign/core/astryx.css', ROOT), 'utf8');
  const kept = full.split('\n').filter((line) =>
    // Une ligne sans classe (@property, :root, @keyframes, accolades) reste.
    [...line.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].every((m) => used.has(m[1]!)),
  );
  return [
    '/* Généré par scripts/astryx-css.ts depuis @astryxdesign/core/astryx.css — ne pas éditer. */',
    `/* Composants : ${entries().join(', ')} */`,
    ...kept,
  ].join('\n');
}

if (import.meta.main) {
  const css = build();
  if (process.argv.includes('--check')) {
    if (readFileSync(OUT, 'utf8') !== css) {
      console.error('src/theme/astryx.css n’est pas à jour : bun scripts/astryx-css.ts');
      process.exit(1);
    }
  } else {
    writeFileSync(OUT, css);
    console.log(`src/theme/astryx.css : ${css.length} octets`);
  }
}
