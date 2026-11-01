/**
 * Barre d'onglets en PILULE FLOTTANTE — décision produit du 07/10/2026,
 * descendue de l'app mobile dans le design system le 08/10/2026. Elle
 * remplace `E237TabBar` (barre courbée à bouton central, pensée pour cinq
 * onglets), retirée le même jour : plus aucune app ne l'utilisait.
 *
 * Quelques onglets dans une pilule détachée du bas de l'écran. CHAQUE onglet
 * montre son icône et, dessous, son titre ; l'onglet actif s'élargit un peu
 * et prend la pastille teintée.
 *
 * 09/10/2026 (audit UX) — les onglets inactifs ne montraient que leur icône :
 * il fallait deviner que l'épée menait aux Duels, et en mode gérant qu'un
 * comptoir se cachait derrière une icône. À trois onglets la place existe ;
 * le titre se pose SOUS l'icône (et pas à côté) pour tenir « Boutique » ou
 * « Comptoir » en entier jusque sur les 360 px des Android d'entrée de gamme.
 *
 * Trois partis pris :
 *
 *  - LE TITRE N'EST JAMAIS PERDU pour un lecteur d'écran. Visible à l'œil, il
 *    reste aussi le libellé accessible de l'onglet ; chaque onglet porte le
 *    rôle `tab` et son état `selected`, la pilule le rôle `tablist`.
 *
 *  - LE MOUVEMENT CÈDE À « RÉDUIRE LES ANIMATIONS ». L'élargissement est une
 *    interpolation Reanimated (fil UI) ; si le téléphone demande moins de
 *    mouvement, l'onglet prend directement sa taille finale.
 *
 *  - LE VERRE, SEULEMENT LÀ OÙ IL EXISTE. Le design system n'embarque pas
 *    `expo-glass-effect` (règle 7 : pas de dépendance d'exécution de plus) :
 *    l'app fournit son verre natif par `renderGlass` (Liquid Glass d'iOS 26+).
 *    Sans lui — iOS plus ancien, Android, web — et quand l'utilisateur a
 *    demandé « réduire la transparence », la pilule retombe sur une surface
 *    translucide (floutée sur le web), tirée des jetons du thème : jamais une
 *    couleur écrite en dur.
 *
 * La géométrie (hauteurs, écart au bas de l'écran, réserve sous le contenu)
 * vit à part, pure et testée : `./floating-tab-bar-layout`.
 */
import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '../icons/generated/native';
import type { IconName } from '../icons/names';
import { font, radius, spacing, useE237Colors, useE237Mode, withAlpha, type ThemeMode } from './core';
import {
  ACTIVE_GROW,
  PILL_HEIGHT,
  PILL_SURFACE_OPACITY,
  PILL_ITEM_HEIGHT,
  PILL_PADDING,
  PILL_SIDE_MARGIN,
  TAB_TRANSITION_MS,
  tabBarBottomOffset,
} from './floating-tab-bar-layout';
import { haptic } from './haptics';
import { Txt } from './text';

/** Compteur posé sur l'icône d'un onglet (09/10/2026). */
export interface FloatingTabBadge {
  count: number;
  /**
   * `warning` : un geste attend l'utilisateur (« agis ») ; `info` : ça
   * avance sans lui (« patiente ») — la table des tons d'UX.md.
   */
  tone: 'warning' | 'info';
  /** Ce que le compteur veut dire, pour un lecteur d'écran (« 3 à traiter »). */
  label?: string;
}

/** Un onglet de la pilule. */
export interface FloatingTab {
  /** Nom de la route (expo-router / React Navigation) qu'il ouvre. */
  route: string;
  icon: IconName;
  /** Titre affiché sous l'icône, et libellé accessible de l'onglet. */
  label: string;
  /**
   * « À toi d'agir » hors de l'écran concerné (UX.md, onglet Duels) : rien à
   * zéro ni sans valeur. Le compte est aussi dit au lecteur d'écran.
   */
  badge?: FloatingTabBadge | null;
}

/** Ce que reçoit le verre natif fourni par l'app. */
export interface FloatingTabBarGlassProps {
  /** Forme de la pilule (taille, arrondi, liseré) — à poser telle quelle. */
  style: StyleProp<ViewStyle>;
  colorScheme: ThemeMode;
  children: ReactNode;
}

/**
 * Le strict nécessaire des props que `Tabs` (expo-router) passe à `tabBar`.
 * Expo Router 58 ne passe plus `navigation` : il fournit un `emitter` (événements
 * `tabPress`/`tabLongPress`) et `navigateToTab(routeKey)`. Méthodes en syntaxe
 * abrégée : leurs paramètres restent bivariants, donc les objets typés par
 * Expo Router restent assignables sans dépendre de ses types internes.
 */
export interface FloatingTabBarProps {
  /**
   * Les onglets RENDUS, dans l'ordre de la pilule. Une route de `state`
   * absente d'ici (masquée par `href: null`) n'apparaît pas dans la barre.
   */
  tabs: readonly FloatingTab[];
  state: {
    index: number;
    routes: { key: string; name: string; params?: object }[];
  };
  descriptors?: Record<string, { options: { title?: string; tabBarAccessibilityLabel?: string } }>;
  emitter: {
    emit(event: { type: string; target?: string; canPreventDefault?: boolean }): unknown;
  };
  /** Bascule sur l'onglet de cette CLÉ de route (pas son nom). */
  navigateToTab(routeKey: string): void;
  /** Zone sûre basse (barre d'accueil, gestes) — fournie par le layout. */
  safeAreaBottom: number;
  /**
   * Verre natif de la plateforme, s'il existe (ex. `GlassView` d'
   * `expo-glass-effect` sur iOS 26+). Ignoré sous « réduire la transparence ».
   */
  renderGlass?: (props: FloatingTabBarGlassProps) => ReactNode;
}

/**
 * « Réduire la transparence » (iOS) : le verre et le flou deviennent une
 * surface pleine. La valeur se relit à chaque changement du réglage.
 */
function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    // Réglage propre à iOS : react-native-web n'implémente même pas la
    // méthode (« is not a function »), Android n'a pas d'équivalent.
    if (Platform.OS !== 'ios') return;
    let alive = true;
    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => {
        if (alive) setReduce(value);
      })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

/**
 * Flou d'arrière-plan du web (`backdrop-filter`) : react-native-web le
 * transmet tel quel, les types de React Native ne le connaissent pas.
 */
const WEB_BLUR = { backdropFilter: 'blur(20px) saturate(160%)' } as unknown as ViewStyle;

/** Le fond de la pilule : verre natif, ou surface translucide de repli. */
function PillSurface({
  renderGlass,
  children,
}: {
  renderGlass?: FloatingTabBarProps['renderGlass'];
  children: ReactNode;
}) {
  const c = useE237Colors();
  const mode = useE237Mode();
  const reduceTransparency = useReduceTransparency();

  if (renderGlass && !reduceTransparency) {
    return renderGlass({
      style: [styles.pill, styles.glassClip, { borderColor: withAlpha(c.border, 0.6) }],
      colorScheme: mode,
      children,
    });
  }

  // Repli : la surface la plus élevée du thème, presque opaque. Sans flou
  // natif (Android), un texte qui défile dessous ne doit pas se lire à
  // travers les icônes. Le web avait 78 % sous un flou : les photos claires
  // du fil brouillaient encore « Duels » et « Boutique », et en mode gérant
  // un bouton « Confirmer » se lisait sous « Comptoir » (audit UI/UX du
  // 12/10/2026). 95 % partout ; le flou du web n'adoucit plus que le liseré.
  const opacity = reduceTransparency ? 1 : PILL_SURFACE_OPACITY;
  return (
    <View
      style={[
        styles.pill,
        styles.pillShadow,
        {
          backgroundColor: withAlpha(c.surfaceRaised, opacity),
          borderColor: c.border,
          shadowColor: c.textStrong,
        },
        Platform.OS === 'web' && !reduceTransparency ? WEB_BLUR : null,
      ]}
    >
      {children}
    </View>
  );
}

function TabItem({
  title,
  icon,
  focused,
  badge,
  onPress,
  onLongPress,
}: {
  title: string;
  icon: IconName;
  focused: boolean;
  badge?: FloatingTabBadge | null;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const c = useE237Colors();
  const shownBadge = badge && badge.count > 0 ? badge : null;
  const badgeColor = shownBadge?.tone === 'warning' ? c.warning : c.info;
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    const target = focused ? 1 : 0;
    progress.value = reduceMotion
      ? target
      : withTiming(target, { duration: TAB_TRANSITION_MS, easing: Easing.out(Easing.cubic) });
  }, [focused, reduceMotion, progress]);

  const itemStyle = useAnimatedStyle(() => ({
    flexGrow: interpolate(progress.value, [0, 1], [1, ACTIVE_GROW]),
  }));

  const tint = focused ? c.accent : c.textSecondary;

  return (
    <Animated.View style={[styles.itemSlot, itemStyle]}>
      <Pressable
        // `role` + `aria-*` plutôt que `accessibility*` : react-native-web
        // ne traduit pas `accessibilityState.selected` en `aria-selected`, et
        // un lecteur d'écran ne saurait pas quel onglet est actif.
        role="tab"
        aria-label={
          shownBadge ? `${title}, ${shownBadge.label ?? String(shownBadge.count)}` : title
        }
        aria-selected={focused}
        onPress={() => {
          haptic('selection');
          onPress();
        }}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.item,
          {
            // Pastille teintée (échelon 50 en clair, 950 en sombre) : l'accent
            // dit « tu es ici » sans devenir un aplat qui concurrencerait
            // l'action principale de l'écran.
            backgroundColor: focused ? c.accentSubtle : 'transparent',
            borderColor: focused ? c.accentBorder : 'transparent',
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        {/* Variante ACTIVE du jeu G-HUB : le trait reste le même, un aplat
            partiel de l'encre remplit la forme — l'onglet se lit « allumé »
            sans épaissir le dessin (src/icons/README.md). */}
        <View>
          <Icon name={icon} color={tint} size={22} active={focused} />
          {shownBadge ? (
            // Même pastille que les compteurs d'en-tête : surface, liseré et
            // chiffre dans le ton — jamais l'accent, qui n'exprime pas un état.
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.badge, { backgroundColor: c.surface, borderColor: badgeColor }]}
            >
              <Txt variant="label" size={10} color={badgeColor} maxFontSizeMultiplier={1.2}>
                {shownBadge.count > 9 ? '9+' : String(shownBadge.count)}
              </Txt>
            </View>
          ) : null}
        </View>
        {/* Masqué aux lecteurs d'écran, qui lisent déjà le libellé de
            l'onglet : il serait annoncé deux fois. */}
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Txt
            variant="label"
            size={font.size.xs}
            color={tint}
            numberOfLines={1}
            // La pilule a une hauteur fixe (52 px) : son titre grandit peu.
            maxFontSizeMultiplier={1.2}
            style={styles.label}
          >
            {title}
          </Txt>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function FloatingTabBar({
  tabs,
  state,
  descriptors,
  emitter,
  navigateToTab,
  safeAreaBottom,
  renderGlass,
}: FloatingTabBarProps) {
  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom: tabBarBottomOffset(safeAreaBottom) }]}>
      <PillSurface renderGlass={renderGlass}>
        <View role="tablist" style={styles.row}>
          {state.routes.map((route, index) => {
            const tab = tabs.find((candidate) => candidate.route === route.name);
            if (!tab) return null;
            const focused = state.index === index;
            const options = descriptors?.[route.key]?.options;
            const title = options?.title ?? tab.label;

            return (
              <TabItem
                key={route.key}
                title={options?.tabBarAccessibilityLabel ?? title}
                icon={tab.icon}
                focused={focused}
                badge={tab.badge}
                onPress={() => {
                  const event = emitter.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  const prevented =
                    typeof event === 'object' && event !== null && 'defaultPrevented' in event && event.defaultPrevented === true;
                  if (!focused && !prevented) navigateToTab(route.key);
                }}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              />
            );
          })}
        </View>
      </PillSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -7,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    position: 'absolute',
    left: PILL_SIDE_MARGIN,
    right: PILL_SIDE_MARGIN,
    alignItems: 'center',
  },
  pill: {
    width: '100%',
    maxWidth: 480,
    height: PILL_HEIGHT,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    padding: PILL_PADDING,
  },
  // Le verre se découpe à l'arrondi ; la surface de repli, elle, ne doit pas
  // l'être : iOS rognerait son ombre avec.
  glassClip: { overflow: 'hidden' },
  // L'ombre courte de ce qui FLOTTE (DESIGN.md, « la profondeur ») : la
  // pilule est posée sur le contenu, pas dans la page. Plus nette depuis le
  // 12/10/2026 : elle détache la pilule d'une photo de même teinte.
  pillShadow: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 10,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['1'],
  },
  itemSlot: {
    flexBasis: 0,
    height: PILL_ITEM_HEIGHT,
  },
  // Icône au-dessus du titre : 22 + 2 + ~16 px tiennent dans les 52 px de
  // l'onglet, et le titre dispose de toute la largeur de sa case.
  item: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing['2'],
  },
  label: {
    letterSpacing: 0.2,
  },
});
