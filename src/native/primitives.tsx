/**
 * Primitives d'interface native (sans composites API).
 * Couleurs via useE237Colors() — light et dark (DESIGN.md).
 */
import { dateTimeShort, localeTag } from '@esport237hub/types';
import { useEffect, useState, type ComponentType, type ReactElement, type ReactNode } from 'react';
import {
  Animated as RNAnimated,
  Easing as RNEasing,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  pill,
  radius,
  spacing,
  useE237Colors,
  useE237Mode,
  useToneSurface,
  useToneTint,
  withAlpha,
} from './core';
import { dsLocale, useDsT } from '../i18n';
import { initials } from '../lib/initials';
import { haptic } from './haptics';
import { ScrollView, type ScrollIndicatorInsets } from './scroll';
import { Txt } from './text';
import { Icon } from '../icons/generated/native';

export { Field, Textarea, PhoneField, Stepper, SearchField } from './fields';

type ScreenScrollProps = {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  contentInsetAdjustmentBehavior?: 'automatic' | 'never' | 'scrollableAxes' | 'always';
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never';
  showsVerticalScrollIndicator?: boolean;
  bottomOffset?: number;
  extraKeyboardSpace?: number;
  /** Curseur vert du design system (`ScrollView` de `./scroll`). */
  indicatorInsets?: ScrollIndicatorInsets;
  /** Tirer pour rafraîchir (`Screen onRefresh`). */
  refreshControl?: ReactElement<RefreshControlProps>;
  children?: ReactNode;
};

/**
 * Le « tirer pour rafraîchir » du design system, aux couleurs du thème : rond
 * en `textMuted` (iOS), flèche accent sur fond de surface (Android). Les
 * données restent à l'écran pendant le rechargement (`useApi`) : `refreshing`
 * ne vaut vrai que si l'écran n'a RIEN d'autre pour dire qu'il travaille.
 *
 * Toutes les props passent au `RefreshControl` natif (la `ScrollView`
 * d'Android lui confie son style et son contenu) : à poser tel quel dans
 * `refreshControl`, ou via `onRefresh` de `Screen` et de `FastList`.
 */
export function ThemedRefreshControl({
  refreshing = false,
  ...props
}: Omit<RefreshControlProps, 'refreshing'> & { refreshing?: boolean }) {
  const c = useE237Colors();
  return (
    <RefreshControl
      tintColor={c.textMuted}
      colors={[c.accent]}
      progressBackgroundColor={c.surface}
      {...props}
      refreshing={refreshing}
    />
  );
}

/**
 * Fond de page + défilement. Passe `ScrollComponent` pour le clavier-aware.
 *
 * Le défilement par défaut est celui du design system : curseur vert maison
 * (natif) ou barre du navigateur peinte en vert (web). Sa piste s'arrête sous
 * l'encoche et au-dessus de la réserve basse (pilule d'onglets).
 *
 * `onRefresh` (15/10/2026) : tirer vers le bas relance la lecture de l'écran
 * (en général le `reload` de `useApi`), avec `ThemedRefreshControl`.
 */
export function Screen({
  children,
  ScrollComponent = ScrollView,
  padBottom,
  contentStyle,
  safeTop = true,
  onRefresh,
  refreshing,
}: {
  children: ReactNode;
  ScrollComponent?: ComponentType<ScreenScrollProps>;
  /** Réserve sous le contenu — à régler sur la hauteur de la tab bar flottante. */
  padBottom?: number;
  contentStyle?: StyleProp<ViewStyle>;
  /**
   * Décale le contenu sous l’encoche / status bar (TopBar uniforme).
   * Défaut `true` ; les onglets (`TabScreen`) et les écrans déjà dans un
   * `SafeAreaView` passent `false`.
   */
  safeTop?: boolean;
  /** Tirer pour rafraîchir : relance la lecture de l'écran. */
  onRefresh?: () => void;
  /** Rond visible pendant le rechargement ; par défaut `false` (les données restent affichées). */
  refreshing?: boolean;
}) {
  const c = useE237Colors();
  const insets = useSafeAreaInsets();
  const Scroll = ScrollComponent;
  return (
    <Scroll
      refreshControl={
        onRefresh ? <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined
      }
      style={{ backgroundColor: c.bg, flex: 1 }}
      indicatorInsets={{
        top: (safeTop ? insets.top : 0) + spacing['1'],
        bottom: (padBottom ?? insets.bottom) + spacing['1'],
      }}
      contentContainerStyle={[
        styles.screen,
        // Remplace le `paddingTop` du shorthand : encoche + même air que les côtés.
        safeTop && { paddingTop: insets.top + spacing['4'] },
        padBottom != null && { paddingBottom: padBottom },
        contentStyle,
      ]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
      extraKeyboardSpace={12}
    >
      {children}
    </Scroll>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Txt variant="overline" tone="cyan">
      {children}
    </Txt>
  );
}

/** Un geste proposé par un état (vide, erreur) : « Réessayer », « Trouver un adversaire ». */
export interface StateAction {
  label: string;
  onPress: () => void;
  /** Pictogramme avant le libellé. */
  icon?: ReactNode;
}

export interface ErrorNoteProps {
  /** Ce qui s'est passé, en clair (`friendlyError` côté app). */
  message: string;
  /** Relance l'action ou la lecture : un bouton « Réessayer » dans l'encart. */
  onRetry?: () => void;
  /** Libellé du bouton ; défaut « Réessayer » (`ui.retry`). */
  retryLabel?: string;
  /** La relance est en cours : le bouton se verrouille. */
  retrying?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Encart d'erreur EN LIGNE (sous un formulaire, dans une feuille).
 *
 * 15/10/2026 (audit T5) : `onRetry` pose le « Réessayer » dans l'encart ;
 * 23 écrans le dessinaient chacun à sa façon, avec sa propre clé. Fond et
 * liseré viennent de la rampe `danger` (`useToneTint`), plus d'une opacité
 * inventée. Pour une ERREUR DE CHARGEMENT qui remplace l'écran : `LoadError`.
 */
export function ErrorNote({ message, onRetry, retryLabel, retrying, style }: ErrorNoteProps) {
  const c = useE237Colors();
  const t = useDsT();
  const tint = useToneTint('danger');
  return (
    <View accessibilityRole="alert" style={[styles.note, tint, style]}>
      <Icon name="alert-circle" color={c.danger} size={16} />
      <Txt selectable variant="body" tone="danger" style={{ flex: 1 }}>
        {message}
      </Txt>
      {onRetry ? (
        <Button
          label={retryLabel ?? t('ui.retry')}
          variant="ghost"
          loading={retrying}
          onPress={onRetry}
          style={styles.noteAction}
        />
      ) : null}
    </View>
  );
}

export interface LoadErrorProps {
  /** Ce qui s'est passé, en clair (l'`error` de `useApi` l'est déjà). */
  message: string;
  /** Relance la lecture (le `reload` de `useApi`). */
  onRetry?: () => void;
  retrying?: boolean;
  /** Une autre sortie que « Réessayer » : revenir, ouvrir un autre écran. */
  action?: StateAction;
  style?: StyleProp<ViewStyle>;
}

/**
 * L'écran (ou le bloc) n'a pas pu se CHARGER : à la place du contenu, ce qui
 * s'est passé et quoi faire ensuite (audit du 15/10/2026, T5). Jamais une
 * impasse : « Réessayer » relance la lecture, `action` offre une autre sortie.
 *
 * @example
 * if (error && !data) return <LoadError message={error} onRetry={reload} />;
 */
export function LoadError({ message, onRetry, retrying, action, style }: LoadErrorProps) {
  const c = useE237Colors();
  const t = useDsT();
  return (
    <View accessibilityRole="alert" style={[styles.empty, { borderColor: c.border }, style]}>
      <Icon name="alert-circle" color={c.danger} size={22} />
      <Txt selectable variant="body" tone="secondary" align="center">
        {message}
      </Txt>
      {onRetry || action ? (
        <View style={styles.stateActions}>
          {onRetry ? (
            <Button label={t('ui.retry')} variant="secondary" loading={retrying} onPress={onRetry} />
          ) : null}
          {action ? (
            <Button label={action.label} variant="ghost" icon={action.icon} onPress={action.onPress} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export interface EmptyStateProps {
  children: ReactNode;
  /**
   * La sortie d'une liste vide (audit T6 : 39 vides sur 54 n'en avaient
   * pas) : « Trouver un adversaire », « Voir l'agenda ». Un seul geste.
   */
  action?: StateAction;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ children, action, style }: EmptyStateProps) {
  const c = useE237Colors();
  return (
    <View style={[styles.empty, { borderColor: c.border }, style]}>
      <Icon name="inbox" color={c.textMuted} size={22} />
      <Txt variant="body" tone="secondary" align="center">
        {children}
      </Txt>
      {action ? (
        <View style={styles.stateActions}>
          <Button label={action.label} variant="secondary" icon={action.icon} onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Bloc fantôme avec balayage lumineux (« shimmer »).
 *
 * Le shimmer n'est pas décoratif : il distingue « ça charge » de « c'est vide
 * et ça restera vide ». Un bloc figé ressemble à une carte cassée ; un bloc qui
 * respire annonce une arrivée. C'est aussi ce qui couvre les BASCULES de
 * contenu (changement de discipline sur le classement) : la liste ne saute pas
 * d'un état à l'autre, elle passe par un état de chargement lisible.
 *
 * Réécrit le 21/09/2026 pour le coût, pas pour l'allure. Chaque bloc montait
 * son propre `<Svg>` avec un `<LinearGradient>` — et TOUS sous le même
 * `id="e237Shimmer"` : sur react-native-web, les identifiants SVG sont
 * globaux au document, donc huit squelettes se disputaient une définition
 * unique. Chaque bloc lançait en plus sa propre boucle Reanimated : une liste
 * en chargement, sur l'Android d'entrée de gamme qui est la cible du produit,
 * en allumait une dizaine.
 *
 * Désormais : UNE seule horloge partagée par tout l'écran (module-level
 * `SharedValue`, démarrée au premier squelette monté, arrêtée au dernier), et
 * une bande peinte par trois `View` superposées plutôt que par un dégradé SVG.
 * Même lecture à l'œil, sans SVG ni boucle par bloc.
 *
 * La bande est en `pointerEvents="none"` et l'animation est purement visuelle :
 * elle ne retarde ni ne bloque l'affichage des données quand elles arrivent.
 */

/** Durée d'un balayage, en ms — assez lent pour ne pas scintiller. */
const SHIMMER_DURATION = 1400;

/**
 * Horloge unique : 0 → 1 en boucle, partagée par tous les squelettes montés.
 * Un compteur de montages évite qu'un écran qui se démonte laisse tourner une
 * animation pour personne (batterie, cas typique d'un onglet quitté).
 *
 * PAS Reanimated, ici (diagnostic ANR du 14/10/2026, émulateur EAS) : un
 * squelette vit pour être DÉMONTÉ — par paquets, à l'instant où les données
 * arrivent (quatorze d'un coup sur la Boutique). Reanimated continuait de
 * pousser le balayage vers ces vues retirées ; chaque échec écrivait une pile
 * Java sur le fil principal, vingt secondes durant, et Android finissait par
 * afficher « G-HUB ne répond pas ». L'`Animated` de React Native, en pilote
 * natif, détache ses nœuds avec la vue : le balayage s'arrête avec elle.
 */
const shimmerClock = new RNAnimated.Value(0);
const shimmerLoop = RNAnimated.loop(
  RNAnimated.timing(shimmerClock, {
    toValue: 1,
    duration: SHIMMER_DURATION,
    easing: RNEasing.linear,
    useNativeDriver: true,
  }),
);
let shimmerMounts = 0;

function retainShimmerClock(): () => void {
  shimmerMounts += 1;
  if (shimmerMounts === 1) {
    shimmerClock.setValue(0);
    shimmerLoop.start();
  }
  return () => {
    shimmerMounts -= 1;
    if (shimmerMounts === 0) {
      shimmerLoop.stop();
      shimmerClock.setValue(0);
    }
  };
}

export function Skeleton({ height = 64 }: { height?: number }) {
  const c = useE237Colors();
  // Largeur mesurée : la bande se déplace d'une largeur d'écran à l'autre, il
  // faut donc la connaître. Tant qu'elle vaut 0, seul le fond est peint.
  const [width, setWidth] = useState(0);

  useEffect(retainShimmerClock, []);

  const translateX = shimmerClock.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  // Le dégradé SVG remplacé par trois bandes de la même encre, d'opacité
  // croissante puis décroissante : à 7 % sur fond de surface, l'œil ne fait
  // pas la différence, et il n'y a plus ni SVG ni `<Defs>` par squelette.
  const band = withAlpha(c.textPrimary, 0.07);
  const bandSoft = withAlpha(c.textPrimary, 0.035);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        height,
        borderRadius: radius.lg,
        backgroundColor: c.surface,
        overflow: 'hidden',
      }}
    >
      {width > 0 ? (
        <RNAnimated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              flexDirection: 'row',
              width: width * 0.6,
            },
            { transform: [{ translateX }] },
          ]}
        >
          <View style={{ flex: 1, backgroundColor: bandSoft }} />
          <View style={{ flex: 1, backgroundColor: band }} />
          <View style={{ flex: 1, backgroundColor: bandSoft }} />
        </RNAnimated.View>
      ) : null}
    </View>
  );
}

/**
 * Avatar à initiales ou photo — même dosage de fond que les autres pilules.
 *
 * Deux garanties, qui manquaient toutes deux :
 *  - les initiales viennent de `initials()` (`../lib`), la MÊME règle que le
 *    web ; `name.charAt(0)` rendait une pastille vide sur un pseudo commençant
 *    par un emoji, et une seule lettre là où le web en affichait deux ;
 *  - une URL qui casse (média retiré, réseau coupé, 403) RETOMBE sur les
 *    initiales. Sans ce repli, l'avatar devenait un rond vide, indiscernable
 *    d'un bug d'affichage.
 */
export function Avatar({
  name,
  size = 44,
  src,
}: {
  name: string | null | undefined;
  size?: number;
  /** URI locale ou URL distante (sinon initiales). */
  src?: string | null;
}) {
  const c = useE237Colors();
  const surface = useToneSurface(c.accent);
  // On mémorise l'URL qui a échoué, pas un booléen : changer de photo doit
  // retenter le chargement sans effet de synchronisation (parité web).
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = !!src && failedSrc !== src;
  const letters = initials(name);

  return (
    <View
      accessibilityLabel={name ?? undefined}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...surface,
      }}
    >
      {showPhoto ? (
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFailedSrc(src)}
          accessibilityLabel={name ?? undefined}
        />
      ) : (
        /* Deux lettres dans un rond de 24 px débordent à 0.4 × la taille :
           l'échelle suit le NOMBRE de lettres, pas la seule taille. */
        <Txt
          variant="title"
          tone="accent"
          size={size * (letters.length > 1 ? 0.34 : 0.42)}
        >
          {letters}
        </Txt>
      )}
    </View>
  );
}

/**
 * Marque « joueur vérifié » (icône G-HUB `badge-check`) — jumelle du web.
 * Elle manquait au natif : les écrans posaient l'icône à la main.
 */
/**
 * Badge « joueur vérifié » (identité confirmée en salle partenaire) — jumeau
 * du web, et le seul du produit : vérifié est un ÉTAT acquis, donc `success`
 * (émeraude), jamais l'accent ni le cyan (« en direct »).
 */
export function VerifiedMark({ size = 14 }: { size?: number }) {
  const c = useE237Colors();
  const t = useDsT();
  return (
    <Icon name="badge-check"
      color={c.success}
      size={size}
      accessibilityLabel={t('ui.player.verified')}
    />
  );
}

/**
 * Date courte — jumelle de `formatDate` du web (même sortie).
 * Elle manquait au natif : chaque application refaisait la sienne.
 *
 * La locale vient du design system, pas d'un `'fr-FR'` figé : un joueur en
 * anglais lisait « 10 sept., 11:19 » au milieu d'un écran traduit.
 *
 * 15/10/2026 (audit T10) : la règle vit dans le module de temps commun
 * (`dateTimeShort`, `@esport237hub/types`) ; une date absente rend une chaîne
 * VIDE, plus « — » (pas de tiret long à l'écran, AGENTS.md règle 14).
 */
export function formatDate(value: string | null | undefined): string {
  return dateTimeShort(value, localeTag(dsLocale()));
}

/**
 * Onglets segmentés — pastille active qui glisse (timing, sans rebond).
 *
 * Parité web `.seg` / `.seg__pill` : la gouttière prend `surfaceRaised`, la
 * pastille active un fond PLEIN (`surface`) bordé, pas un simple voile teinté
 * — c'est ce qui rend l'onglet actif lisible sur un écran de téléphone.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  /**
   * `badge` (09/10/2026) : un compteur à côté du libellé — « Demandes 3 ».
   * `warning` quand un geste attend l'utilisateur, `info` sinon ; rien à zéro.
   * Le compte est aussi dit au lecteur d'écran.
   */
  tabs: { value: T; label: string; badge?: { count: number; tone: 'warning' | 'info' } | null }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useE237Colors();
  const mode = useE237Mode();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  );
  const itemWidth = width > 0 ? (width - 8) / tabs.length : 0;

  const pillStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateX: withTiming(index * itemWidth, {
            duration: 200,
            easing: Easing.out(Easing.cubic),
          }),
        },
      ],
    }),
    [index, itemWidth],
  );

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[
        styles.segment,
        { backgroundColor: c.surfaceRaised, borderColor: c.border },
      ]}
    >
      {itemWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.segmentPill,
            {
              width: itemWidth,
              backgroundColor: c.surface,
              borderColor: withAlpha(c.accent, pill.stroke[mode]),
            },
            pillStyle,
          ]}
        />
      ) : null}
      {tabs.map((t) => {
        const active = t.value === value;
        const badge = t.badge && t.badge.count > 0 ? t.badge : null;
        const badgeColor = badge?.tone === 'warning' ? c.warning : c.info;
        return (
          <Pressable
            key={t.value}
            accessibilityRole="tab"
            accessibilityLabel={badge ? `${t.label}, ${badge.count}` : undefined}
            accessibilityState={{ selected: active }}
            hitSlop={{ top: 3, bottom: 3 }}
            onPress={() => {
              haptic('selection');
              onChange(t.value);
            }}
            style={styles.segmentItem}
          >
            <Txt
              numberOfLines={1}
              variant={active ? 'label' : 'subtitle'}
              tone={active ? 'accent' : 'secondary'}
              size={13}
            >
              {t.label}
            </Txt>
            {badge ? (
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[styles.segmentBadge, { borderColor: badgeColor }]}
              >
                <Txt variant="label" size={10} color={badgeColor}>
                  {badge.count > 9 ? '9+' : String(badge.count)}
                </Txt>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing['4'], gap: spacing['3'], paddingBottom: spacing['12'] },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing['3'],
  },
  // Le bouton fantôme garde sa cible de 44 px ; l'encart ne grandit pas.
  noteAction: { marginVertical: -spacing['2'], marginRight: -spacing['2'] },
  empty: {
    alignItems: 'center',
    gap: spacing['2'],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing['6'],
  },
  stateActions: { alignItems: 'center', gap: spacing['1'], marginTop: spacing['1'] },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.full,
    padding: 3,
  },
  segmentPill: {
    position: 'absolute',
    left: 3,
    top: 3,
    bottom: 3,
    borderWidth: 1,
    borderRadius: radius.full,
  },
  segmentItem: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    gap: spacing['1'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing['2'],
  },
  segmentBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
