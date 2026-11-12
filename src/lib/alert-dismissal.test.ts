import { describe, expect, it } from 'bun:test';

import {
  ALERT_DISMISSAL_KEY,
  ALERT_DISMISSAL_MAX,
  DISMISSED_ALERTS_SCRIPT,
  alertSignature,
  alertVisible,
  isAlertDismissed,
  rememberAlertByDefault,
  parseDismissed,
  readDismissed,
  withDismissed,
  writeDismissed,
  type AlertStorage,
} from './alert-dismissal';

/** Un stockage en mémoire, comme `localStorage`. */
function memoryStorage(): AlertStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  };
}

/** Un stockage qui refuse tout (navigation privée, stockage bloqué). */
const brokenStorage: AlertStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('alertSignature — repérer qu’un message a changé', () => {
  it('est stable pour un même texte, même mis en forme autrement', () => {
    expect(alertSignature('Paiement en attente : 2 000 FCFA')).toBe(
      alertSignature('  Paiement   en attente :\n2 000 FCFA '),
    );
  });

  it('change quand le texte change (un autre montant fait revenir l’alerte)', () => {
    expect(alertSignature('Paiement en attente : 2 000 FCFA')).not.toBe(
      alertSignature('Paiement en attente : 5 000 FCFA'),
    );
  });
});

describe('la mémoire des alertes fermées', () => {
  it('une alerte fermée reste fermée pour CE contenu, pas pour un autre', () => {
    const sig = alertSignature('Choisis tes jeux');
    const after = withDismissed({}, 'choose-games', sig);
    expect(isAlertDismissed(after, 'choose-games', sig)).toBe(true);
    expect(isAlertDismissed(after, 'choose-games', alertSignature('Autre texte'))).toBe(false);
    expect(isAlertDismissed(after, 'pending-payment', sig)).toBe(false);
  });

  it('survit au rechargement : écrite puis relue dans le stockage', () => {
    const storage = memoryStorage();
    const sig = alertSignature('Duel à traiter');
    expect(writeDismissed(storage, withDismissed({}, 'duel', sig))).toBe(true);
    expect(storage.data.has(ALERT_DISMISSAL_KEY)).toBe(true);
    expect(isAlertDismissed(readDismissed(storage), 'duel', sig)).toBe(true);
  });

  it('ne lève JAMAIS : stockage absent, bloqué ou plein → mémoire vide, écriture refusée', () => {
    expect(readDismissed(null)).toEqual({});
    expect(readDismissed(brokenStorage)).toEqual({});
    expect(writeDismissed(brokenStorage, { a: 'x' })).toBe(false);
    expect(writeDismissed(undefined, { a: 'x' })).toBe(false);
  });

  it('ignore un contenu corrompu au lieu de planter', () => {
    expect(parseDismissed('{pas du json')).toEqual({});
    expect(parseDismissed('[1,2,3]')).toEqual({});
    expect(parseDismissed('"texte"')).toEqual({});
    expect(parseDismissed('{"ok":"abc","nombre":3,"":"vide"}')).toEqual({ ok: 'abc' });
  });

  it('reste bornée : les fermetures les plus anciennes sortent', () => {
    let map = {};
    for (let i = 0; i < ALERT_DISMISSAL_MAX + 5; i += 1) {
      map = withDismissed(map, `a${i}`, 'x');
    }
    const ids = Object.keys(map);
    expect(ids).toHaveLength(ALERT_DISMISSAL_MAX);
    expect(ids).not.toContain('a0');
    expect(ids[ids.length - 1]).toBe(`a${ALERT_DISMISSAL_MAX + 4}`);
  });

  it('refermer une alerte la remet en dernière position avec sa nouvelle signature', () => {
    const map = withDismissed(withDismissed({ a: '1', b: '1' }, 'a', '2'), 'c', '1');
    expect(Object.entries(map)).toEqual([
      ['b', '1'],
      ['a', '2'],
      ['c', '1'],
    ]);
  });
});

describe('alertVisible : une nouvelle occurrence revient (audit web WA1)', () => {
  const base = { id: 'admin-decision', signature: 'sig', dismissible: true, closedHere: null };

  it('une alerte mémorisée fermée reste fermée, tant que son contenu ne change pas', () => {
    expect(alertVisible({ ...base, remember: true, dismissed: { 'admin-decision': 'sig' } })).toBe(false);
    expect(alertVisible({ ...base, remember: true, dismissed: { 'admin-decision': 'autre' } })).toBe(true);
  });

  it('pendant l’hydratation, une alerte mémorisée attend (pas de clignotement)', () => {
    expect(alertVisible({ ...base, remember: true, dismissed: null })).toBe(false);
  });

  it('une occurrence (échec après décision) n’est jamais mémorisée : la même phrase revient', () => {
    // Le même texte d'échec fermé hier ne masque pas l'échec d'aujourd'hui.
    expect(alertVisible({ ...base, remember: false, dismissed: { 'admin-decision': 'sig' } })).toBe(true);
    expect(alertVisible({ ...base, remember: false, dismissed: null })).toBe(true);
  });

  it('fermée ICI, une occurrence se cache jusqu’à la suivante', () => {
    expect(alertVisible({ ...base, remember: false, dismissed: null, closedHere: 'sig' })).toBe(false);
    expect(alertVisible({ ...base, remember: false, dismissed: null, closedHere: 'sig#1' })).toBe(true);
  });

  it('non fermable : toujours visible', () => {
    expect(
      alertVisible({ ...base, dismissible: false, remember: true, dismissed: { 'admin-decision': 'sig' } }),
    ).toBe(true);
  });

  it('le ton danger n’est pas mémorisé par défaut', () => {
    expect(rememberAlertByDefault('danger')).toBe(false);
    expect(rememberAlertByDefault('warning')).toBe(true);
    expect(rememberAlertByDefault('info')).toBe(true);
  });
});

describe('DISMISSED_ALERTS_SCRIPT — les alertes fermées masquées avant la première peinture', () => {
  /** Exécute le script inline avec un `localStorage` et un `document` factices ; rend la CSS posée. */
  function run(stored: string | null, throws = false): string | null {
    let css: string | null = null;
    const storage = {
      getItem: (k: string) => {
        if (throws) throw new Error('bloqué');
        return k === ALERT_DISMISSAL_KEY ? stored : null;
      },
    };
    const doc = {
      createElement: () => ({ textContent: '' }),
      head: { appendChild: (el: { textContent: string }) => (css = el.textContent) },
    };
    new Function('localStorage', 'document', DISMISSED_ALERTS_SCRIPT)(storage, doc);
    return css;
  }

  it('masque chaque alerte fermée par son identifiant ET sa signature', () => {
    expect(run(JSON.stringify({ 'home-attention': 'abc', 'photo-invite': 'z9' }))).toBe(
      '[data-alert-id="home-attention"][data-alert-sig="abc"],[data-alert-id="photo-invite"][data-alert-sig="z9"]{display:none!important}',
    );
  });

  it('rien de fermé, mémoire illisible ou bloquée : aucune règle, aucune erreur', () => {
    expect(run(null)).toBeNull();
    expect(run('pas du json')).toBeNull();
    expect(run(JSON.stringify({ a: 3 }))).toBeNull();
    expect(run(null, true)).toBeNull();
  });

  it('un `localStorage` dont l’accès même lève (stockage bloqué) ne casse pas la page', () => {
    const blocked = new Function(`const localStorage = undefined; Object.defineProperty(globalThis, '__e237Blocked', { get() { throw new Error('bloqué'); }, configurable: true }); ${DISMISSED_ALERTS_SCRIPT.replace(',localStorage,', ',__e237Blocked,')}`);
    expect(() => blocked()).not.toThrow();
  });
});
