/**
 * Mémoire des alertes fermées — la règle 3 de la refonte du web (lot R,
 * 09/10/2026) : « une alerte fermée reste fermée (mémorisée localement) sauf
 * si son contenu change ».
 *
 * Fonctions PURES, sans DOM ni React : le web (`AlertBanner`) les branche sur
 * `localStorage`, un natif pourrait les brancher sur AsyncStorage. Tout accès
 * au stockage passe par un `try/catch` : navigation privée, quota plein,
 * stockage bloqué par le navigateur — l'alerte s'affiche alors, et la croix la
 * masque pour la durée de la page. Jamais d'exception qui remonte à l'écran.
 *
 * Ce qu'on retient pour une alerte : son IDENTIFIANT et une SIGNATURE de son
 * contenu. Si le texte change (un autre montant à régler, un autre duel à
 * traiter), la signature change et l'alerte revient : on a fermé CE message,
 * pas tous ceux qui porteront le même identifiant.
 */

/** Clé unique dans le stockage : une seule entrée JSON pour toutes les alertes. */
export const ALERT_DISMISSAL_KEY = 'e237.alerts.dismissed.v1';

/**
 * Au-delà, les plus anciennes sortent : une alerte fermée il y a des mois n'a
 * plus besoin d'occuper le stockage du navigateur.
 */
export const ALERT_DISMISSAL_MAX = 60;

/** Ce que le stockage doit savoir faire — `localStorage` en est un. */
export interface AlertStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Identifiant → signature du contenu fermé, dans l'ordre des fermetures. */
export type DismissedAlerts = Readonly<Record<string, string>>;

/**
 * Signature courte et stable d'un contenu (djb2, base 36). Pas un secret :
 * elle sert seulement à remarquer qu'un texte a changé. Les blancs sont
 * normalisés pour qu'une simple mise en forme ne fasse pas revenir l'alerte.
 */
export function alertSignature(content: string): string {
  const text = content.replace(/\s+/g, ' ').trim();
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** Lit la mémoire ; tout ce qui n'a pas la bonne forme est ignoré, jamais levé. */
export function parseDismissed(raw: string | null | undefined): DismissedAlerts {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Record<string, string> = {};
    for (const [id, signature] of Object.entries(value as Record<string, unknown>)) {
      if (typeof signature === 'string' && id.length > 0) out[id] = signature;
    }
    return out;
  } catch {
    return {};
  }
}

/** Lecture protégée : un stockage absent ou qui lève rend une mémoire vide. */
export function readDismissed(storage: AlertStorage | null | undefined): DismissedAlerts {
  if (!storage) return {};
  try {
    return parseDismissed(storage.getItem(ALERT_DISMISSAL_KEY));
  } catch {
    return {};
  }
}

/** L'alerte `id` est-elle fermée pour CE contenu ? */
export function isAlertDismissed(
  dismissed: DismissedAlerts,
  id: string,
  signature: string,
): boolean {
  return dismissed[id] === signature;
}

/**
 * La mémoire après fermeture de `id` : l'entrée passe en dernière position
 * (la plus récente) et la liste reste bornée à `max`.
 */
export function withDismissed(
  dismissed: DismissedAlerts,
  id: string,
  signature: string,
  max: number = ALERT_DISMISSAL_MAX,
): DismissedAlerts {
  const entries = Object.entries(dismissed).filter(([key]) => key !== id);
  entries.push([id, signature]);
  const kept = entries.slice(Math.max(0, entries.length - Math.max(1, max)));
  return Object.fromEntries(kept);
}

/**
 * Une alerte est-elle MÉMORISÉE fermée par défaut ? Pas une erreur (audit
 * web du 15/10/2026, WA1) : « Validation impossible » fermé une fois, même
 * identifiant, même texte, ne s'affichait plus jamais, y compris pour un
 * nouvel échec le lendemain. Une erreur est une OCCURRENCE, pas un avis
 * durable : sa croix vaut pour l'écran, pas pour toujours.
 */
export function rememberAlertByDefault(tone: string): boolean {
  return tone !== 'danger';
}

/**
 * L'alerte s'affiche-t-elle ?
 * - non fermable : toujours ;
 * - mémorisée (`remember`) : sauf si CE contenu a été fermé (et pas tant que
 *   la mémoire est inconnue, pendant l'hydratation : rien ne clignote) ;
 * - occurrence (`remember` faux) : sauf si elle vient d'être fermée ICI
 *   (`closedHere`, la signature fermée dans cette page) ; la mémoire du
 *   navigateur n'y compte jamais.
 */
export function alertVisible(input: {
  id: string;
  signature: string;
  dismissible: boolean;
  remember: boolean;
  dismissed: DismissedAlerts | null;
  closedHere: string | null;
}): boolean {
  if (!input.dismissible) return true;
  if (!input.remember) return input.closedHere !== input.signature;
  if (input.dismissed === null) return false;
  return !isAlertDismissed(input.dismissed, input.id, input.signature);
}

/**
 * Écriture protégée. Rend `false` si le stockage a refusé (quota, navigation
 * privée) : l'appelant garde alors la fermeture en mémoire pour la page.
 */
export function writeDismissed(
  storage: AlertStorage | null | undefined,
  dismissed: DismissedAlerts,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ALERT_DISMISSAL_KEY, JSON.stringify(dismissed));
    return true;
  } catch {
    return false;
  }
}

/**
 * Masque, AVANT la première peinture, les alertes déjà fermées : le HTML
 * serveur montre toutes les alertes mémorisables (il ne lit pas le
 * `localStorage`), et les faire apparaître après l'hydratation poussait la
 * page (CLS 0,043 sur `/dashboard` au bureau, 11/11/2026). Autonome : il est
 * sérialisé tel quel dans un `<script>` inline, il n'appelle rien d'autre.
 */
function hideDismissedAlerts(
  key: string,
  storage: Pick<AlertStorage, 'getItem'>,
  doc: { createElement(tag: 'style'): { textContent: string | null }; head: { appendChild(node: never): unknown } },
): void {
  try {
    const value = JSON.parse(storage.getItem(key) || '{}') as Record<string, unknown>;
    const rules: string[] = [];
    for (const id in value) {
      const sig = value[id];
      if (typeof sig === 'string') {
        rules.push('[data-alert-id=' + JSON.stringify(id) + '][data-alert-sig=' + JSON.stringify(sig) + ']');
      }
    }
    if (rules.length === 0) return;
    const style = doc.createElement('style');
    style.textContent = rules.join(',') + '{display:none!important}';
    doc.head.appendChild(style as never);
  } catch {
    // Mémoire illisible ou bloquée : les alertes restent affichées.
  }
}

/** Le `<script>` inline de `hideDismissedAlerts`, à poser en tête de page. */
// L'accès même à `localStorage` peut lever (stockage bloqué) : dans le `try`.
export const DISMISSED_ALERTS_SCRIPT = `try{(${hideDismissedAlerts.toString()})(${JSON.stringify(ALERT_DISMISSAL_KEY)},localStorage,document)}catch(e){}`;
