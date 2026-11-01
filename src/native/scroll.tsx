/**
 * Défilement du design system — UN curseur, vert, sur tous les appareils
 * (demande du porteur, visite du 09/10/2026 : « notre scroll bar doit être
 * verte custom et utiliser sur tous les devices la même scroll bar »).
 *
 * POURQUOI UN CURSEUR DESSINÉ, ET PAS CELUI DU SYSTÈME
 *
 * React Native ne sait pas recolorer l'indicateur natif de façon fiable :
 * `indicatorStyle` d'iOS n'offre que noir / blanc, et Android n'a aucune prop
 * (la couleur vient du thème natif de l'app, la même pour toutes les listes,
 * et certains constructeurs l'ignorent). On masque donc l'indicateur du
 * système et on dessine le nôtre : un trait fin à la couleur d'accent
 * (`useE237Colors().accent` — palier 700 en clair, 400 en sombre), posé
 * PAR-DESSUS la vue défilante, synchronisé à la position de défilement sur le
 * fil UI (Reanimated : aucun rendu React par image), qui apparaît au premier
 * mouvement et s'efface après, comme celui d'iOS. En « réduire les
 * animations », il apparaît et disparaît sans fondu.
 *
 * SUR LE WEB (Expo web), rien n'est dessiné : la barre du NAVIGATEUR reste
 * visible et c'est la règle CSS du design system qui la peint en vert
 * (`src/theme/scrollbar.css`, la même que l'app web). Les couleurs du thème
 * actif lui sont passées en variables CSS.
 *
 * COMMENT L'UTILISER
 *
 * `ScrollView` et `FlatList` ci-dessous remplacent ceux de `react-native`,
 * props comprises (ref, `onScroll` — y compris un gestionnaire Reanimated —,
 * `refreshControl`, `inverted`…). `Screen`, `Sheet`, `AuthScreen` s'en servent
 * déjà : un écran construit avec eux a le curseur sans rien faire.
 *
 * - `showsVerticalScrollIndicator` ne commande plus rien : l'indicateur du
 *   système est toujours masqué (natif), toujours affiché et peint en vert
 *   (web). Pour une vue sans aucun curseur : `indicator={false}`.
 * - Un défilement HORIZONTAL (rails de puces, carrousels) n'a pas de curseur
 *   maison : ces rangées masquent volontairement leur barre, et la vue est
 *   transmise telle quelle.
 * - `indicatorInsets` écarte la piste d'une barre collante en haut ou de la
 *   pilule d'onglets flottante en bas.
 * - Pour une vue défilante qui n'est pas l'une de ces deux-là :
 *   `useScrollIndicator()` + `<ScrollIndicator />`.
 */
import { useCallback, useEffect, type Ref } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type FlatList as RNFlatList,
  type LayoutChangeEvent,
  type ScrollViewInstance,
  type ScrollViewProps as RNScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useReducedMotion,
  useScrollOffset,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type AnimatedRef,
  type FlatListPropsWithLayout,
  type SharedValue,
} from 'react-native-reanimated';

import { useE237Colors } from './core';
import { scrollThumb, splitScrollStyle, thumbTimings } from './scroll-indicator-model';

const IS_WEB = Platform.OS === 'web';

/**
 * Le curseur est-il DESSINÉ (et la barre du système masquée) ? Toujours sur
 * iOS et Android. Sur le web, seulement en aperçu : une page qui pose
 * `globalThis.__E237_DRAWN_SCROLL_INDICATOR__ = true` avant le chargement de
 * l'app voit le curseur des téléphones au lieu de la barre du navigateur —
 * c'est ce qui permet de le photographier (captures du lot T1) et de vérifier
 * l'enveloppe sans téléphone. Jamais posé par l'app.
 */
const DRAWN =
  !IS_WEB ||
  (globalThis as { __E237_DRAWN_SCROLL_INDICATOR__?: boolean }).__E237_DRAWN_SCROLL_INDICATOR__ ===
    true;

/** Épaisseur du curseur : fin, comme celui d'iOS, mais lisible en vert. */
const THUMB_WIDTH = 4;
/** Écart au bord droit de la vue. */
const THUMB_EDGE = 2;
/** Marge par défaut aux deux bouts de la piste. */
const TRACK_INSET = 4;

export interface ScrollIndicatorInsets {
  /** Marge en tête de piste (sous une encoche, une barre collante). */
  top?: number;
  /** Marge en fin de piste (au-dessus de la pilule d'onglets, d'un pied fixe). */
  bottom?: number;
}

export interface ScrollIndicatorOptions {
  /**
   * Curseur vert maison. Défaut : vrai pour un défilement vertical, sans objet
   * à l'horizontale. `false` : aucune barre, ni la nôtre ni celle du système.
   */
  indicator?: boolean;
  /** Marges de piste du curseur. */
  indicatorInsets?: ScrollIndicatorInsets;
}

/* ------------------------------------------------------------------ */
/* Couleurs de la barre du navigateur (Expo web)                       */
/* ------------------------------------------------------------------ */

let webColors = '';

/** Le `document` du navigateur, vu depuis un code compilé sans le DOM. */
type WebDocument = {
  documentElement: { style: { setProperty: (name: string, value: string) => void } };
};

/**
 * Sur le web, la barre est celle du navigateur, peinte par `scrollbar.css`.
 * Expo web ne charge pas les variables `--e237-*` du thème web : on lui passe
 * les deux couleurs du thème ACTIF (choisi par l'app, pas seulement celui du
 * système), une fois par changement de thème.
 */
function useWebScrollbarColors() {
  const c = useE237Colors();
  useEffect(() => {
    const doc = IS_WEB ? (globalThis as { document?: WebDocument }).document : undefined;
    if (!doc) return;
    const next = `${c.accent}|${c.accentHover}`;
    if (next === webColors) return;
    webColors = next;
    const root = doc.documentElement.style;
    root.setProperty('--e237-scrollbar-thumb', c.accent);
    root.setProperty('--e237-scrollbar-thumb-hover', c.accentHover);
  }, [c.accent, c.accentHover]);
}

/* ------------------------------------------------------------------ */
/* Hook + curseur                                                      */
/* ------------------------------------------------------------------ */

export interface ScrollIndicatorState {
  /** Défilement courant, lu sur le fil UI. */
  offset: SharedValue<number>;
  /** Hauteur visible de la vue. */
  viewport: SharedValue<number>;
  /** Hauteur du contenu. */
  content: SharedValue<number>;
}

/**
 * L'état du curseur d'UNE vue défilante : à brancher sur sa `ref`, son
 * `onLayout` et son `onContentSizeChange`, puis à passer à `<ScrollIndicator>`.
 * La position est lue sur le fil UI (`useScrollOffset`), sans prendre
 * l'`onScroll` de la vue : l'appelant garde le sien.
 */
export function useScrollIndicator(): ScrollIndicatorState & {
  /** La ref d'une vue défilante quelconque (ScrollView, FlatList…). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: AnimatedRef<any>;
  onLayout: (e: LayoutChangeEvent) => void;
  onContentSizeChange: (width: number, height: number) => void;
} {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useAnimatedRef<any>();
  // Sur le web, rien n'est dessiné : inutile d'écouter le défilement.
  const offset = useScrollOffset(DRAWN ? ref : null);
  const viewport = useSharedValue(0);
  const content = useSharedValue(0);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewport.set(e.nativeEvent.layout.height);
    },
    [viewport],
  );
  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      content.set(height);
    },
    [content],
  );
  return { ref, offset, viewport, content, onLayout, onContentSizeChange };
}

export interface ScrollIndicatorProps extends ScrollIndicatorState {
  insets?: ScrollIndicatorInsets;
  /** Liste inversée : le début du contenu est en bas. */
  inverted?: boolean;
}

/**
 * Le curseur lui-même, en surimpression du bord droit de la vue défilante. Son
 * parent doit envelopper EXACTEMENT la vue (même boîte) : `ScrollView` et
 * `FlatList` ci-dessous s'en chargent.
 */
export function ScrollIndicator({
  offset,
  viewport,
  content,
  insets,
  inverted = false,
}: ScrollIndicatorProps) {
  const c = useE237Colors();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0);
  const insetStart = insets?.top ?? TRACK_INSET;
  const insetEnd = insets?.bottom ?? TRACK_INSET;

  // Allumé à chaque mouvement, éteint après un temps de lecture. Chaque
  // nouvelle image repart de « allumé » : il ne s'éteint qu'à l'arrêt.
  useAnimatedReaction(
    () => offset.value,
    (now, before) => {
      if (before === null || now === before) return;
      const thumb = scrollThumb({ viewport: viewport.value, content: content.value, offset: now });
      if (!thumb.scrollable) return;
      const t = thumbTimings(reduced);
      // `ReduceMotion.Never` : le « réduire les animations » est déjà traité
      // par `thumbTimings` (pas de fondu). Laissé au défaut (`System`),
      // Reanimated sauterait aussi l'ATTENTE et éteindrait le curseur à
      // l'instant où il s'allume — il n'apparaîtrait jamais.
      opacity.value = withSequence(
        ReduceMotion.Never,
        withTiming(1, { duration: t.fadeIn, reduceMotion: ReduceMotion.Never }),
        withDelay(
          t.hold,
          withTiming(0, { duration: t.fadeOut, reduceMotion: ReduceMotion.Never }),
          ReduceMotion.Never,
        ),
      );
    },
    [reduced],
  );

  const thumbStyle = useAnimatedStyle(() => {
    const thumb = scrollThumb({
      viewport: viewport.value,
      content: content.value,
      offset: offset.value,
      insetStart,
      insetEnd,
      inverted,
    });
    return {
      height: thumb.size,
      opacity: thumb.scrollable ? opacity.value : 0,
      transform: [{ translateY: thumb.position }],
    };
  });

  if (!DRAWN) return null;
  return (
    <Animated.View
      // Décor : ni le doigt ni le lecteur d'écran ne doivent le trouver.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.thumb, { backgroundColor: c.accent }, thumbStyle]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* ScrollView / FlatList                                               */
/* ------------------------------------------------------------------ */

/** Pose une instance sur une ref React, quelle que soit sa forme. */
function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/**
 * Branche le curseur sur une vue défilante sans rien prendre à l'appelant :
 * une seule ref pour deux destinataires (le curseur, qui lit le défilement ;
 * l'appelant, qui fait `scrollTo` / `scrollToIndex`), et ses `onLayout` /
 * `onContentSizeChange` appelés après les nôtres.
 */
function useWiredIndicator<T>(
  callerRef: Ref<T> | undefined,
  onLayout: ((e: LayoutChangeEvent) => void) | undefined,
  onContentSizeChange: ((width: number, height: number) => void) | undefined,
) {
  useWebScrollbarColors();
  const {
    ref: animatedRef,
    onLayout: measureView,
    onContentSizeChange: measureContent,
    offset,
    viewport,
    content,
  } = useScrollIndicator();

  const ref = useCallback(
    (instance: T | null) => {
      // Rien n'est rendu à React : une valeur rendue par une ref « fonction »
      // serait prise pour une fonction de nettoyage (React 19).
      animatedRef(instance);
      assignRef(callerRef, instance);
    },
    [animatedRef, callerRef],
  );
  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      measureView(e);
      onLayout?.(e);
    },
    [measureView, onLayout],
  );
  const handleContentSize = useCallback(
    (width: number, height: number) => {
      measureContent(width, height);
      onContentSizeChange?.(width, height);
    },
    [measureContent, onContentSizeChange],
  );
  return {
    ref,
    onLayout: handleLayout,
    onContentSizeChange: handleContentSize,
    state: { offset, viewport, content },
  };
}

export type ScrollViewProps = RNScrollViewProps &
  ScrollIndicatorOptions & {
    ref?: Ref<ScrollViewInstance>;
  };

/**
 * `ScrollView` de React Native, avec le curseur vert. Mêmes props, même ref.
 * Construit sur `Animated.ScrollView` : un `onScroll` de Reanimated
 * (`useAnimatedScrollHandler`) y fonctionne aussi.
 */
export function ScrollView({
  ref,
  indicator,
  indicatorInsets,
  style,
  horizontal,
  onLayout,
  onContentSizeChange,
  ...rest
}: ScrollViewProps) {
  const wired = useWiredIndicator(ref, onLayout, onContentSizeChange);
  const ours = !horizontal && indicator !== false;

  if (!DRAWN || horizontal) {
    return (
      <Animated.ScrollView
        {...rest}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={wired.ref as any}
        style={style}
        horizontal={horizontal}
        onLayout={onLayout}
        onContentSizeChange={onContentSizeChange}
        // Web, vertical : la barre du navigateur, peinte par scrollbar.css.
        showsVerticalScrollIndicator={horizontal ? rest.showsVerticalScrollIndicator : ours}
      />
    );
  }

  const { outer, inner } = splitScrollStyle(
    StyleSheet.flatten(style) as Record<string, unknown> | undefined,
  );
  return (
    <View style={outer as ViewStyle}>
      <Animated.ScrollView
        {...rest}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={wired.ref as any}
        style={inner as StyleProp<ViewStyle>}
        onLayout={wired.onLayout}
        onContentSizeChange={wired.onContentSizeChange}
        showsVerticalScrollIndicator={false}
      />
      {ours ? <ScrollIndicator {...wired.state} insets={indicatorInsets} /> : null}
    </View>
  );
}

export type FlatListProps<ItemT> = FlatListPropsWithLayout<ItemT> &
  ScrollIndicatorOptions & {
    ref?: Ref<RNFlatList<ItemT>>;
  };

/**
 * `FlatList` de React Native, avec le curseur vert. Mêmes props, même ref ;
 * construite sur `Animated.FlatList` (gestionnaire `onScroll` de Reanimated
 * accepté). Une liste `inverted` (discussion) a son curseur qui part du bas.
 */
export function FlatList<ItemT>({
  ref,
  indicator,
  indicatorInsets,
  style,
  horizontal,
  inverted,
  onLayout,
  onContentSizeChange,
  ...rest
}: FlatListProps<ItemT>) {
  // Les props d'un composant Reanimated acceptent aussi une valeur partagée ;
  // une liste ne reçoit jamais que des fonctions ici.
  const wired = useWiredIndicator(
    ref,
    onLayout as ((e: LayoutChangeEvent) => void) | undefined,
    onContentSizeChange as ((width: number, height: number) => void) | undefined,
  );
  const ours = !horizontal && indicator !== false;

  if (!DRAWN || horizontal) {
    return (
      <Animated.FlatList<ItemT>
        {...rest}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={wired.ref as any}
        style={style}
        horizontal={horizontal}
        inverted={inverted}
        onLayout={onLayout}
        onContentSizeChange={onContentSizeChange}
        showsVerticalScrollIndicator={horizontal ? rest.showsVerticalScrollIndicator : ours}
      />
    );
  }

  const { outer, inner } = splitScrollStyle(
    StyleSheet.flatten(style as StyleProp<ViewStyle>) as Record<string, unknown> | undefined,
  );
  return (
    <View style={outer as ViewStyle}>
      <Animated.FlatList<ItemT>
        {...rest}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={wired.ref as any}
        style={inner as StyleProp<ViewStyle>}
        inverted={inverted}
        onLayout={wired.onLayout}
        onContentSizeChange={wired.onContentSizeChange}
        showsVerticalScrollIndicator={false}
      />
      {ours ? (
        <ScrollIndicator {...wired.state} insets={indicatorInsets} inverted={!!inverted} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    position: 'absolute',
    top: 0,
    right: THUMB_EDGE,
    width: THUMB_WIDTH,
    borderRadius: THUMB_WIDTH / 2,
    pointerEvents: 'none',
  },
});
