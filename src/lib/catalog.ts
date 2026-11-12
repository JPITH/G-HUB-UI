/**
 * Vocabulaire produit partagé : évènements, compétitions, billets.
 *
 * Ces tables étaient écrites deux fois — `apps/web/src/lib/events.ts` vs
 * `apps/mobile/src/lib/format.ts`, `events/competitions-list.tsx` vs
 * `apps/mobile/src/app/(tabs)/competitions.tsx` — et divergeaient déjà
 * (« Démo/Showcase » d'un côté, « Showcase » de l'autre). Une seule source
 * ici ; les fonctions sont tolérantes aux valeurs inconnues pour ne jamais
 * afficher un identifiant technique brut à un joueur.
 */
import { dsT, type DsKey } from '../i18n/store';
import type { Tone } from './tone';

/* ------------------------------------------------------------------ */
/* Visuels des disciplines                                             */
/* ------------------------------------------------------------------ */

/**
 * Identifiant de discipline → nom court du fichier livré dans `public/media`.
 *
 * Les visuels ont été nommés court (`game-clash.png`) alors que les
 * identifiants produits sont longs (`clash-royale`). Sans cette table, chaque
 * écran devine — et se trompe : le rail affichait des images cassées pour
 * trois disciplines sur cinq.
 */
const GAME_ASSET: Record<string, string> = {
  fc27: 'fc27',
  'clash-royale': 'clash',
  codm: 'cod',
  // L'identifiant du catalogue en base est `call-of-duty` (seed 0001) :
  // sans cette ligne, Call of Duty n'avait jamais son visuel (lot M1).
  'call-of-duty': 'cod',
  'pubg-mobile': 'pubg',
  valorant: 'valorant',
  // Nos jeux (lot G, 09/10/2026) : visuels ORIGINAUX dessinés pour G-HUB
  // (`assets/our-games/*.svg` du dépôt principal, rastérisés par
  // `scripts/our-games-art.ts`) — aucune image empruntée.
  ludo: 'ludo',
  echecs: 'echecs',
  dames: 'dames',
  // Visuels du 11/11/2026 (le Quatre en ligne, dessiné, remplace l'ancien nom).
  awale: 'awale',
  'quatre-en-ligne': 'quatre-en-ligne',
};

/**
 * Vignette d'une discipline, ou `undefined` si aucun visuel n'est livré.
 *
 * Renvoyer `undefined` plutôt qu'une URL improbable est délibéré : les
 * composants savent afficher un repli propre (initiales), mais seulement si
 * on ne leur ment pas sur l'existence de l'image.
 */
export function gameIconUrl(slug: string | null | undefined): string | undefined {
  const key = slug ? GAME_ASSET[slug] : undefined;
  return key ? `/media/game-${key}.png` : undefined;
}

/** Bandeau large d'une discipline (accueil, en-têtes). */
export function gameHeroUrl(slug: string | null | undefined): string | undefined {
  const key = slug ? GAME_ASSET[slug] : undefined;
  return key ? `/media/hero-${key}.png` : undefined;
}

/* ------------------------------------------------------------------ */
/* Journal d'audit (back-office)                                       */
/* ------------------------------------------------------------------ */

/**
 * Actions journalisées → clé de libellé.
 *
 * Le journal d'audit affichait ses identifiants bruts (`duel.validate`,
 * `points.recompute`) en police à chasse fixe. C'est la règle transverse la
 * plus simple du produit et la plus souvent oubliée : une valeur venue de la
 * base n'atteint jamais l'écran telle quelle. Un modérateur qui relit une
 * décision de la veille ne devrait pas avoir à traduire mentalement un slug.
 */
export const AUDIT_ACTION_LABEL: Record<string, DsKey> = {
  'duel.validate': 'catalog.audit.action.duelValidate',
  'duel.cancel': 'catalog.audit.action.duelCancel',
  'duel.dispute': 'catalog.audit.action.duelDispute',
  'duel.resolve': 'catalog.audit.action.duelResolve',
  'venue.verify': 'catalog.audit.action.venueVerify',
  'venue.reject': 'catalog.audit.action.venueReject',
  'venue.suspend': 'catalog.audit.action.venueSuspend',
  'points.recompute': 'catalog.audit.action.pointsRecompute',
  'division.update': 'catalog.audit.action.divisionUpdate',
  'game.update': 'catalog.audit.action.gameUpdate',
  'user.suspend': 'catalog.audit.action.userSuspend',
  'payout.approve': 'catalog.audit.action.payoutApprove',
};

/** Type d'objet concerné par une action d'audit. */
export const AUDIT_OBJECT_LABEL: Record<string, DsKey> = {
  duel: 'catalog.audit.object.duel',
  venue: 'catalog.audit.object.venue',
  season: 'catalog.audit.object.season',
  division: 'catalog.audit.object.division',
  game: 'catalog.audit.object.game',
  user: 'catalog.audit.object.user',
  payout: 'catalog.audit.object.payout',
  event: 'catalog.audit.object.event',
};

/** Auteur d'une action journalisée. */
export const AUDIT_ACTOR_LABEL: Record<string, DsKey> = {
  admin: 'catalog.audit.actor.admin',
  system: 'catalog.audit.actor.system',
  venue: 'catalog.audit.actor.venue',
  player: 'catalog.audit.actor.player',
};

/**
 * Libellé d'une action d'audit. Tolérant : une action ajoutée côté back-end
 * sans passer par cette table reste lisible plutôt que d'afficher un slug —
 * `duel.validate` devient « Duel · validate », pas `duel.validate`.
 */
export function auditActionLabel(action: string | null | undefined): string {
  if (!action) return '—';
  const known = AUDIT_ACTION_LABEL[action];
  if (known) return dsT(known);
  const [object, verb] = action.split('.');
  if (verb && object) {
    const objectKey = AUDIT_OBJECT_LABEL[object];
    return `${objectKey ? dsT(objectKey) : object} · ${verb}`;
  }
  return action;
}

export function auditObjectLabel(kind: string | null | undefined): string {
  if (!kind) return '—';
  const key = AUDIT_OBJECT_LABEL[kind];
  return key ? dsT(key) : kind;
}

export function auditActorLabel(kind: string | null | undefined): string {
  if (!kind) return '—';
  const key = AUDIT_ACTOR_LABEL[kind];
  return key ? dsT(key) : kind;
}

/* ------------------------------------------------------------------ */
/* Évènements                                                          */
/* ------------------------------------------------------------------ */

export const EVENT_TYPE_LABEL: Record<string, DsKey> = {
  tournament: 'catalog.eventType.tournament',
  meetup: 'catalog.eventType.meetup',
  watch_party: 'catalog.eventType.watchParty',
  showcase: 'catalog.eventType.showcase',
  other: 'catalog.eventType.other',
};

export const EVENT_TYPE_TONE: Record<string, Tone> = {
  tournament: 'gold',
  meetup: 'cyan',
  watch_party: 'accent',
  showcase: 'warning',
  other: 'neutral',
};

/** Type d'évènement, tolérant aux valeurs absentes/inconnues. */
export function eventTypeLabel(type: string | null | undefined): string {
  if (!type) return '—';
  const key = EVENT_TYPE_LABEL[type];
  return key ? dsT(key) : type;
}

export function eventTypeTone(type: string | null | undefined): Tone {
  if (!type) return 'neutral';
  return EVENT_TYPE_TONE[type] ?? 'neutral';
}

export const EVENT_STATUS_LABEL: Record<string, DsKey> = {
  draft: 'catalog.eventStatus.draft',
  published: 'catalog.eventStatus.published',
  cancelled: 'catalog.eventStatus.cancelled',
  finished: 'catalog.eventStatus.finished',
};

/** Statut d'évènement, tolérant aux valeurs absentes/inconnues. */
export function eventStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  const key = EVENT_STATUS_LABEL[status];
  return key ? dsT(key) : status;
}

/* ------------------------------------------------------------------ */
/* Compétitions                                                        */
/* ------------------------------------------------------------------ */

export const COMPETITION_FORMAT_LABEL: Record<string, DsKey> = {
  single_elimination: 'catalog.competitionFormat.singleElimination',
  double_elimination: 'catalog.competitionFormat.doubleElimination',
  round_robin: 'catalog.competitionFormat.roundRobin',
  groups_playoffs: 'catalog.competitionFormat.groupsPlayoffs',
  swiss: 'catalog.competitionFormat.swiss',
};

export function competitionFormatLabel(
  format: string | null | undefined,
): string {
  if (!format) return '—';
  const key = COMPETITION_FORMAT_LABEL[format];
  return key ? dsT(key) : format;
}

export const COMPETITION_STATUS_TONE: Record<string, Tone> = {
  ongoing: 'accent',
  upcoming: 'cyan',
  finished: 'neutral',
};

export const COMPETITION_STATUS_LABEL: Record<string, DsKey> = {
  ongoing: 'catalog.competitionStatus.ongoing',
  upcoming: 'catalog.competitionStatus.upcoming',
  finished: 'catalog.competitionStatus.finished',
};

export function competitionStatusLabel(
  status: string | null | undefined,
): string {
  if (!status) return '—';
  const key = COMPETITION_STATUS_LABEL[status];
  return key ? dsT(key) : status;
}

export function competitionStatusTone(status: string | null | undefined): Tone {
  if (!status) return 'neutral';
  return COMPETITION_STATUS_TONE[status] ?? 'neutral';
}

/* ------------------------------------------------------------------ */
/* Billets d'évènement                                                 */
/* ------------------------------------------------------------------ */

/**
 * « Payé » est un état ACQUIS : `success`, jamais l'accent — l'accent est
 * réservé aux actions (DESIGN.md, couche 2 ; audit UX mobile du 09/10/2026).
 */
export const TICKET_STATUS_META: Record<string, { labelKey: DsKey; tone: Tone }> = {
  paid: { labelKey: 'catalog.ticketStatus.paid', tone: 'success' },
  reserved: { labelKey: 'catalog.ticketStatus.reserved', tone: 'warning' },
  cancelled: { labelKey: 'catalog.ticketStatus.cancelled', tone: 'danger' },
  refunded: { labelKey: 'catalog.ticketStatus.refunded', tone: 'neutral' },
};

export function ticketStatusMeta(status: string): { label: string; tone: Tone } {
  const meta = TICKET_STATUS_META[status];
  return meta ? { label: dsT(meta.labelKey), tone: meta.tone } : { label: status, tone: 'neutral' };
}

/* ------------------------------------------------------------------ */
/* Abonnements de salle                                                */
/* ------------------------------------------------------------------ */

export const SUBSCRIPTION_STATUS_LABEL: Record<string, DsKey> = {
  pending_payment: 'catalog.subscriptionStatus.pendingPayment',
  active: 'catalog.subscriptionStatus.active',
  exhausted: 'catalog.subscriptionStatus.exhausted',
  expired: 'catalog.subscriptionStatus.expired',
  cancelled: 'catalog.subscriptionStatus.cancelled',
};

export function subscriptionStatusLabel(
  status: string | null | undefined,
): string {
  if (!status) return '—';
  const key = SUBSCRIPTION_STATUS_LABEL[status];
  return key ? dsT(key) : status;
}

/* ------------------------------------------------------------------ */
/* Plateformes de jeu                                                  */
/* ------------------------------------------------------------------ */

/**
 * Plateformes déclarées par une discipline (`games.platforms`).
 * La table était recopiée mot pour mot dans les deux écrans « Duels »
 * (web et natif) : une seule source ici, comme le reste du vocabulaire.
 */
export const PLATFORM_LABEL: Record<string, DsKey> = {
  ps5: 'catalog.platform.ps5',
  ps4: 'catalog.platform.ps4',
  xbox: 'catalog.platform.xbox',
  pc: 'catalog.platform.pc',
  mobile: 'catalog.platform.mobile',
};

/** Plateforme en clair ; on retombe sur l'identifiant si elle est inconnue. */
export function platformLabel(platform: string | null | undefined): string {
  if (!platform) return '—';
  const key = PLATFORM_LABEL[platform];
  return key ? dsT(key) : platform;
}
