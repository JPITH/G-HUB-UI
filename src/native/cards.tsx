/**
 * Cartes de liste (natif) — jumelles de `./web/cards`, mêmes noms, mêmes
 * props (la navigation passe par `onPress` au lieu de `href`).
 */
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  competitionFormatLabel,
  competitionStatusLabel,
  competitionStatusTone,
  eventTypeLabel,
  eventTypeTone,
  ticketStatusMeta,
} from '../lib/catalog';
import { formatXaf, priceOrFreeLabel } from '../lib/money';
import { formatRatingAverage, ratingCountLabel } from '../lib/rating';
import { ROLE, color, ramp } from '../tokens';
import { Badge, Card, font, radius, spacing, useE237Colors } from './core';
import { MediaImage } from './media-image';
import { PerkList } from './perk-list';
import { Txt } from './text';
import { Icon } from '../icons/generated/native';

/** Enveloppe pressable optionnelle — sans `onPress`, simple bloc. */
function Clickable({
  onPress,
  children,
  style,
}: {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Gabarit commun de l'agenda : évènement ET tournoi                    */
/* ------------------------------------------------------------------ */

/**
 * UNE carte pour l'agenda (audit UI/UX du 12/10/2026, webB-21) — jumelle du
 * web : pastilles (type, jeu, disponibilité), titre, à droite le prix ou
 * l'état, puis la date et le lieu avec leurs icônes, et un détail.
 */
function AgendaCardBody({
  kind,
  gameName,
  badges,
  title,
  trailing,
  dateLabel,
  placeLabel,
  detail,
}: {
  kind: ReactNode;
  gameName?: string | null;
  badges?: ReactNode;
  title: string;
  trailing: ReactNode;
  dateLabel?: string | null;
  placeLabel?: string | null;
  detail?: string | null;
}) {
  const c = useE237Colors();
  return (
    <Card style={styles.stack}>
      <View style={styles.headRow}>
        <View style={styles.headMain}>
          <View style={styles.badges}>
            {kind}
            {gameName ? <Badge tone="neutral">{gameName}</Badge> : null}
            {badges}
          </View>
          <Txt variant="label">{title}</Txt>
        </View>
        {trailing}
      </View>
      <View style={styles.metaRow}>
        {dateLabel ? (
          <View style={styles.metaItem}>
            <Icon name="calendar" color={c.textMuted} size={14} />
            <Txt variant="caption" tone="muted">{dateLabel}</Txt>
          </View>
        ) : null}
        {placeLabel ? (
          <View style={styles.metaItem}>
            <Icon name="map-pin" color={c.textMuted} size={14} />
            <Txt variant="caption" tone="muted">{placeLabel}</Txt>
          </View>
        ) : null}
        {detail ? (
          <Txt variant="caption" tone="muted">
            · {detail}
          </Txt>
        ) : null}
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* EventCard                                                           */
/* ------------------------------------------------------------------ */

export interface EventCardProps {
  onPress?: () => void;
  title: string;
  /** Type d'évènement brut (`tournament`, `meetup`…) — libellé et ton dérivés. */
  type: string;
  gameName?: string | null;
  /** Date déjà mise en forme par l'appelant. */
  dateLabel: string;
  /** Salle ou ville. */
  placeLabel?: string | null;
  capacity?: number | null;
  /** Prix déjà calculé (« Gratuit », « À partir de 2 000 FCFA »…). */
  priceLabel: string;
  /** Colore le prix en accent (évènement payant). */
  isPaid?: boolean;
  /** Disponibilité sans chiffre (« Places limitées », « Complet ») — 09/10/2026. */
  availabilityLabel?: string | null;
  availabilityTone?: 'warning' | 'danger';
  style?: StyleProp<ViewStyle>;
}

export function EventCard({
  onPress,
  title,
  type,
  gameName,
  dateLabel,
  placeLabel,
  capacity,
  priceLabel,
  isPaid = false,
  availabilityLabel,
  availabilityTone = 'warning',
  style,
}: EventCardProps) {
  return (
    <Clickable onPress={onPress} style={style}>
      <AgendaCardBody
        kind={<Badge tone={eventTypeTone(type)}>{eventTypeLabel(type)}</Badge>}
        gameName={gameName}
        badges={
          availabilityLabel ? (
            <Badge tone={availabilityTone} size="sm">
              {availabilityLabel}
            </Badge>
          ) : null
        }
        title={title}
        trailing={
          <Txt variant="bodyBold" tone={isPaid ? 'accent' : 'secondary'}>
            {priceLabel}
          </Txt>
        }
        dateLabel={dateLabel}
        placeLabel={placeLabel}
        detail={capacity ? `${capacity} places` : null}
      />
    </Clickable>
  );
}

/* ------------------------------------------------------------------ */
/* CompetitionCard                                                     */
/* ------------------------------------------------------------------ */

export interface CompetitionCardProps {
  onPress?: () => void;
  title: string;
  /** `upcoming` / `ongoing` / `finished`. */
  status: string;
  /** `single_elimination`, `swiss`… — libellé FR dérivé. */
  format: string;
  isOnline: boolean;
  city?: string | null;
  /** Date de début déjà mise en forme ; absente = non annoncée. */
  dateLabel?: string | null;
  venueName?: string | null;
  /** Le jeu du tournoi, en pastille comme sur la carte d'un évènement. */
  gameName?: string | null;
  /** Disponibilité sans chiffre (« Places limitées », « Complet »). */
  availabilityLabel?: string | null;
  availabilityTone?: 'warning' | 'danger';
  /** Tournoi d'un jeu joué DANS l'app : « En ligne · dans l'app ». */
  inAppLabel?: string | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * Carte d'une compétition en liste — le gabarit de l'évènement (webB-21) :
 * pastille « Tournoi » et jeu, titre, l'état à la place du prix, date, lieu
 * et format.
 */
export function CompetitionCard({
  onPress,
  title,
  status,
  format,
  isOnline,
  city,
  dateLabel,
  venueName,
  gameName,
  availabilityLabel,
  availabilityTone = 'warning',
  inAppLabel,
  style,
}: CompetitionCardProps) {
  return (
    <Clickable onPress={onPress} style={style}>
      <AgendaCardBody
        kind={<Badge tone={eventTypeTone('tournament')}>{eventTypeLabel('tournament')}</Badge>}
        gameName={gameName}
        badges={
          <>
            {inAppLabel ? (
              <Badge tone="info" size="sm">
                {inAppLabel}
              </Badge>
            ) : null}
            {availabilityLabel ? (
              <Badge tone={availabilityTone} size="sm">
                {availabilityLabel}
              </Badge>
            ) : null}
          </>
        }
        title={title}
        trailing={
          <Badge tone={competitionStatusTone(status)}>{competitionStatusLabel(status)}</Badge>
        }
        dateLabel={dateLabel}
        placeLabel={isOnline ? 'En ligne' : [venueName, city].filter(Boolean).join(' · ') || 'En salle'}
        detail={competitionFormatLabel(format)}
      />
    </Clickable>
  );
}

/* ------------------------------------------------------------------ */
/* ProductCard                                                         */
/* ------------------------------------------------------------------ */

export interface ProductCardProps {
  onPress?: () => void;
  name: string;
  description?: string | null;
  priceXaf: number;
  /** `digital` (livraison automatique) ou `physical` (retrait en salle). */
  kind: string;
  imageUrl?: string | null;
  /**
   * Rupture de stock. `onPress` est désactivé et un badge « Épuisé »
   * remplace l'invite habituelle. Défaut `false` — sans changement pour
   * les appels existants.
   */
  soldOut?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProductCard({
  onPress,
  name,
  description,
  priceXaf,
  kind,
  imageUrl,
  soldOut = false,
  style,
}: ProductCardProps) {
  const c = useE237Colors();
  const digital = kind === 'digital';
  return (
    <Clickable onPress={soldOut ? undefined : onPress} style={style}>
      <Card style={[styles.stack, soldOut && styles.disabled]}>
        <View>
          <MediaImage
            src={imageUrl}
            alt={name}
            ratio={1}
            rounded="lg"
            fallbackIcon={
              digital ? (
                <Icon name="gift" color={c.textMuted} size={26} strokeWidth={1.25} />
              ) : (
                <Icon name="shirt" color={c.textMuted} size={26} strokeWidth={1.25} />
              )
            }
            fallbackLabel="Visuel à venir"
          />
          <View style={[styles.floatBadge, styles.badges]}>
            <Badge tone={digital ? 'cyan' : 'neutral'}>
              {digital ? 'Numérique' : 'Physique'}
            </Badge>
            {soldOut ? <Badge tone="danger">Épuisé</Badge> : null}
          </View>
        </View>
        <Txt variant="label">{name}</Txt>
        <Txt variant="body" tone="secondary" numberOfLines={2}>
          {description || '—'}
        </Txt>
        <Txt variant="numeric" size={font.size.lg} tone="accent">
          {formatXaf(priceXaf)}
        </Txt>
      </Card>
    </Clickable>
  );
}

/* ------------------------------------------------------------------ */
/* TicketCard                                                          */
/* ------------------------------------------------------------------ */

export interface TicketCardProps {
  eventTitle: string;
  /** Type d'évènement brut — libellé FR dérivé. */
  eventType: string;
  /** Ouverture de la fiche de l'évènement (titre pressable). */
  onPressEvent?: () => void;
  dateLabel: string;
  city?: string | null;
  quantity: number;
  amountXaf: number;
  /** `paid`, `reserved`, `cancelled`, `refunded`. */
  status: string;
  /** Billet déjà scanné à l'entrée. */
  admitted?: boolean;
  /** Date de l'admission, déjà mise en forme. */
  checkedInAtLabel?: string | null;
  /**
   * Le QR lui-même. Le design system ne fabrique pas le code (l'encodage
   * dépend d'une bibliothèque par plateforme) : il l'accueille — voir
   * `QrFrame`.
   */
  qr?: ReactNode;
  /** À qui est le billet (billets nominatifs, 09/10/2026), fourni par l'app. */
  holder?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function TicketCard({
  eventTitle,
  eventType,
  onPressEvent,
  dateLabel,
  city,
  quantity,
  amountXaf,
  status,
  admitted = false,
  checkedInAtLabel,
  qr,
  holder,
  style,
}: TicketCardProps) {
  const c = useE237Colors();
  const meta = ticketStatusMeta(status);

  const title = (
    <View style={styles.grow}>
      <Txt variant="label">{eventTitle}</Txt>
      <Txt variant="caption" tone="muted">
        {eventTypeLabel(eventType)}
      </Txt>
    </View>
  );

  return (
    <Card style={[styles.stack, style]}>
      <View style={styles.headRow}>
        {onPressEvent ? (
          <Pressable
            accessibilityRole="button"
            onPress={onPressEvent}
            style={({ pressed }) => [styles.grow, pressed && styles.pressed]}
          >
            {title}
          </Pressable>
        ) : (
          title
        )}
        <View style={styles.badges}>
          {admitted ? <Badge tone="accent">Admis</Badge> : null}
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="calendar" color={c.textMuted} size={14} />
          <Txt variant="caption" tone="muted">{dateLabel}</Txt>
        </View>
        {city ? (
          <View style={styles.metaItem}>
            <Icon name="map-pin" color={c.textMuted} size={14} />
            <Txt variant="caption" tone="muted">{city}</Txt>
          </View>
        ) : null}
        <Txt variant="caption" tone="muted">
          · {quantity} billet{quantity > 1 ? 's' : ''}
        </Txt>
        <Txt variant="bodyBold" size={font.size.xs} tone="secondary">
          {priceOrFreeLabel(amountXaf)}
        </Txt>
      </View>

      {holder ? (
        <View style={styles.metaItem}>
          <Icon name="user" color={c.textMuted} size={16} />
          <View style={styles.grow}>{holder}</View>
        </View>
      ) : null}

      {qr ? (
        <View style={[styles.qrRow, { borderTopColor: c.border }]}>
          {qr}
          <View style={styles.grow}>
            {admitted ? (
              <>
                <View style={styles.metaItem}>
                  <Icon name="check-circle" color={c.accent} size={16} />
                  <Txt variant="label" tone="accent">
                    Déjà admis à l’entrée
                  </Txt>
                </View>
                {checkedInAtLabel ? (
                  <Txt variant="caption" tone="muted">
                    Ce QR a déjà servi le {checkedInAtLabel}.
                  </Txt>
                ) : null}
              </>
            ) : (
              <>
                <Txt variant="label" tone="secondary">
                  Présente ce QR à l’entrée
                </Txt>
                <Txt variant="caption" tone="muted">
                  Le personnel le scanne pour valider ton accès.
                </Txt>
              </>
            )}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* SubscriptionCard                                                    */
/* ------------------------------------------------------------------ */

export interface SubscriptionCardProps {
  venueName: string;
  planName: string;
  /** Abonnement encore consommable (heures restantes et non périmé). */
  usable: boolean;
  /** Libellé d'état quand l'abonnement n'est plus utilisable. */
  statusLabel: string;
  /** Ex. « 4 h restantes ». */
  remainingLabel: string;
  /** Ex. « Jusqu’au 12 août » ; absent = sans péremption. */
  expiresLabel?: string | null;
  city?: string | null;
  pricePaidXaf: number;
  /**
   * Libellés traduits par l'app (audit du 15/10/2026, M4) ; à défaut, le
   * français d'origine. `paidLabel` porte déjà le montant (« Payé 5 000 FCFA »).
   */
  usableLabel?: string;
  noExpiryLabel?: string;
  paidLabel?: string;
  perks?: readonly string[] | null;
  /**
   * Actions et détails propres à l'écran (séances, « Voir la salle »),
   * posés DANS la carte sous un trait fin : des liens flottant entre deux
   * cartes ne disaient pas à laquelle ils appartenaient (porteur, 14/10/2026).
   */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SubscriptionCard({
  venueName,
  planName,
  usable,
  statusLabel,
  remainingLabel,
  expiresLabel,
  city,
  pricePaidXaf,
  usableLabel = 'Utilisable',
  noExpiryLabel = 'Sans péremption',
  paidLabel,
  perks,
  children,
  style,
}: SubscriptionCardProps) {
  const c = useE237Colors();
  return (
    <Card style={[styles.stack, style]}>
      <View style={styles.headRow}>
        <View style={styles.grow}>
          <View style={styles.metaItem}>
            <Icon name="store" color={c.accent} size={16} />
            <Txt variant="label">
              {venueName}
            </Txt>
          </View>
          <Txt variant="caption" tone="muted">{planName}</Txt>
        </View>
        {/* Un ÉTAT : `success`, jamais l'accent (réservé à l'interactif). */}
        <Badge tone={usable ? 'success' : 'neutral'}>
          {usable ? usableLabel : statusLabel}
        </Badge>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="clock" color={c.textMuted} size={14} />
          <Txt variant="caption" tone="secondary">
            {remainingLabel}
          </Txt>
        </View>
        <Txt variant="caption" tone="secondary">
          {expiresLabel ?? noExpiryLabel}
        </Txt>
        {city ? (
          <View style={styles.metaItem}>
            <Icon name="map-pin" color={c.textMuted} size={14} />
            <Txt variant="caption" tone="secondary">{city}</Txt>
          </View>
        ) : null}
        <Txt variant="caption" tone="secondary">
          {paidLabel ?? `Payé ${formatXaf(pricePaidXaf)}`}
        </Txt>
      </View>

      <PerkList items={perks} />

      {children ? (
        <View style={[styles.cardFooter, { borderTopColor: c.border }]}>{children}</View>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* VenueCard                                                           */
/* ------------------------------------------------------------------ */

export interface VenueCardProps {
  onPress?: () => void;
  name: string;
  city: string;
  district?: string | null;
  /** Tarif « à partir de », en FCFA/heure. */
  pricePerHour?: number | null;
  /** Calculé par l'API depuis les horaires ; absent = on n'affiche rien. */
  isOpen?: boolean;
  imageUrl?: string | null;
  /**
   * Disciplines de la salle. Seuls les noms sont rendus, les trois premiers,
   * duels ouverts d'abord (l'API trie déjà ainsi) : sur une carte de liste on
   * répond à « est-ce que mon jeu y est ? », pas au détail de l'inventaire.
   */
  games?: readonly { id: string; name: string; duels_open: boolean }[] | null;
  /**
   * Réputation de la salle. Zéro avis n'affiche RIEN plutôt qu'un zéro : une
   * salle qui vient d'ouvrir n'a pas démérité, et la ranger visuellement au
   * niveau des plus mauvaises la condamnerait sans qu'un joueur se soit
   * prononcé.
   */
  ratingAvg?: number | null;
  ratingCount?: number | null;
  /** Position au classement des salles, si la carte est rendue dans ce contexte. */
  rank?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Carte de salle (natif) — jumelle de `./web/venue-card`.
 *
 * Le web tire ses puces d'`equipment.consoles` (les types de postes) ; ici
 * ce sont les JEUX, parce que sur mobile la liste des salles est le point
 * d'entrée du parcours « où puis-je jouer à FC 27 ce soir ». Le badge des
 * duels reste sur la fiche : trois pastilles suffisent à donner l'envie
 * d'ouvrir, les mentionner toutes ferait un pavé sur une carte de 160 px.
 */
export function VenueCard({
  onPress,
  name,
  city,
  district,
  pricePerHour,
  isOpen,
  imageUrl,
  games,
  ratingAvg,
  ratingCount,
  rank,
  style,
}: VenueCardProps) {
  const c = useE237Colors();
  const shown = (games ?? []).slice(0, 3);
  const extra = (games?.length ?? 0) - shown.length;
  const rated = (ratingCount ?? 0) > 0 && ratingAvg != null;

  return (
    <Clickable onPress={onPress} style={style}>
      <Card style={styles.stack}>
        <View style={styles.venueMedia}>
          <MediaImage
            src={imageUrl}
            alt={`Salle ${name}`}
            ratio={16 / 10}
            rounded="lg"
            fallbackIcon={
              <Icon name="store" color={c.textMuted} size={30} strokeWidth={1.25} />
            }
          />
          {isOpen !== undefined ? (
            <View style={styles.floatBadge}>
              {/* Sur une PHOTO : un fond plein, le même dans les deux thèmes (la
                  photo ne change pas avec le thème). La pastille teintée se
                  perdait sur une image sombre en clair (revue du 11/11/2026). */}
              <Badge
                tone={isOpen ? 'success' : 'neutral'}
                style={{
                  backgroundColor: isOpen ? ramp.success[ROLE.light.fill] : color.dark.surface,
                  borderColor: 'transparent',
                }}
                textStyle={{ color: isOpen ? ROLE.light.onFill : color.dark.textStrong }}
              >
                {isOpen ? 'Ouvert' : 'Fermé'}
              </Badge>
            </View>
          ) : null}
          {rank !== undefined ? (
            <View style={[styles.rankPill, { backgroundColor: c.surfaceRaised }]}>
              <Txt variant="numeric" size={font.size.xs}>
                {rank}
              </Txt>
            </View>
          ) : null}
        </View>

        {/* Le nom d'abord, sur toute la largeur (deux lignes au plus) : le prix
            qui partageait sa ligne le coupait à 360 px. Le prix descend sur la
            ligne de la note (revue du 11/11/2026). */}
        <View style={styles.venueHead}>
          <Txt variant="label" numberOfLines={2}>
            {name}
          </Txt>
          <View style={styles.metaItem}>
            <Icon name="map-pin" color={c.textMuted} size={14} />
            <Txt variant="caption" tone="muted" numberOfLines={2} style={styles.shrink}>
              {city}
              {district ? ` · ${district}` : ''}
            </Txt>
          </View>
          {rated || pricePerHour != null ? (
            <View style={styles.priceRow}>
              {rated ? (
                <View style={styles.metaItem}>
                  <Icon name="star" color={c.gold} filled size={13} strokeWidth={1.5} />
                  <Txt variant="numeric" size={font.size.xs} tone="gold">
                    {formatRatingAverage(ratingAvg)}
                  </Txt>
                  <Txt variant="caption" tone="muted">
                    {ratingCountLabel(ratingCount)}
                  </Txt>
                </View>
              ) : (
                <View />
              )}
              {pricePerHour != null ? (
                <Txt variant="bodyBold" tone="accent" numberOfLines={1}>
                  {formatXaf(pricePerHour)}
                  <Txt variant="caption" tone="muted"> /h</Txt>
                </Txt>
              ) : null}
            </View>
          ) : null}
        </View>

        {shown.length ? (
          <View style={styles.badges}>
            {shown.map((game) => (
              <Badge key={game.id} tone={game.duels_open ? 'cyan' : 'neutral'}>
                {game.name}
              </Badge>
            ))}
            {extra > 0 ? <Badge tone="neutral">+{extra}</Badge> : null}
          </View>
        ) : null}
      </Card>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  cardFooter: {
    gap: spacing['2'],
    paddingTop: spacing['3'],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  venueMedia: { position: 'relative' },
  rankPill: {
    position: 'absolute',
    top: spacing['2'],
    right: spacing['2'],
    minWidth: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['1'],
  },
  stack: { gap: spacing['2'] },
  grow: { flex: 1 },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing['3'],
  },
  headMain: { flex: 1, gap: spacing['1'] },
  venueHead: { gap: spacing['1'] },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing['2'],
  },
  shrink: { flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing['1-5'] },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing['2'],
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing['1'] },
  floatBadge: { position: 'absolute', top: spacing['2'], right: spacing['2'] },
  disabled: { opacity: 0.6 },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['4'],
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing['3'],
  },
  pressed: { opacity: 0.85 },
});
