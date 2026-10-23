import type { ComponentType, ReactNode } from 'react';
import { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing, useE237Colors } from './core';
import { ScrollView, type ScrollIndicatorInsets } from './scroll';
import { SHEET_MAX_HEIGHT, decideSnap, sheetCaps } from './sheet-snap';
import { useDsT } from '../i18n';
import { Txt } from './text';

type SheetScrollProps = {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never';
  showsVerticalScrollIndicator?: boolean;
  bottomOffset?: number;
  extraKeyboardSpace?: number;
  /** Curseur vert du design system (`ScrollView` de `./scroll`). */
  indicatorInsets?: ScrollIndicatorInsets;
  children?: ReactNode;
};

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Sous-titre optionnel sous le titre. */
  subtitle?: string;
  children: ReactNode;
  /**
   * Contenu défilant — VRAI par défaut.
   *
   * Avant, le défaut était `false` : une feuille dont le contenu dépassait
   * était simplement COUPÉE, sans rien annoncer, et seul l'appelant qui y avait
   * pensé s'en sortait. Un défaut qui ment coûte plus cher qu'un défaut
   * verbeux : le comportement normal est donc de défiler.
   *
   * Passe `false` UNIQUEMENT si tu poses ta propre vue défilante dans le corps
   * — deux vues défilantes verticales imbriquées, et celle du dessous avale le
   * geste : la partie basse de la feuille devient inatteignable.
   */
  scrollable?: boolean;
  /**
   * Contenu collé en bas (CTA) — hors défilement, et au-dessus du clavier.
   * C'est ici que va l'action principale : dans le corps, elle part au
   * défilement au moment précis où l'on veut valider.
   */
  footer?: ReactNode;
  /**
   * Défilement clavier-aware (ex. KeyboardAwareScrollView). Défaut : la
   * `ScrollView` du design system (curseur vert). N'a d'effet que si
   * `scrollable`.
   */
  ScrollComponent?: ComponentType<SheetScrollProps>;
  /**
   * Plafond de hauteur AU REPOS, en fraction de l'écran (0,88 par défaut).
   * La feuille épouse son contenu jusque-là, puis le corps défile à
   * l'intérieur. Une conversation (commentaires) passe plus bas, ~0,8 : la
   * carte commentée reste visible au-dessus, et un long fil défile dans la
   * feuille au lieu de la pousser contre le haut de l'écran.
   *
   * Quel que soit ce plafond, la feuille ne dépasse JAMAIS la place libre
   * entre l'encoche et le clavier ouvert.
   */
  maxHeight?: number;
}

const SPRING = { damping: 20, stiffness: 220 } as const;

/**
 * La feuille doit à la fois s'animer (hauteur, glissement) et intercepter les
 * appuis pour ne pas fermer le backdrop sous le doigt : un `Animated.View` ne
 * fait que le premier, un `Pressable` que le second.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Châssis de feuille modale (ouverte par le bas) : backdrop, poignée, titre.
 * Base commune de SelectSheet, DateField, TimeField et des formulaires
 * multi-étapes (création d'évènement, salle, recharge).
 *
 * La poignée du haut n'est plus décorative : elle a la forme d'une poignée de
 * glissement dans toutes les applications, le porteur a tiré dessus, il ne se
 * passait rien. Elle agrandit maintenant la feuille (deux positions d'arrêt :
 * hauteur du contenu, puis presque plein écran) et la referme sur un geste
 * franc vers le bas.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  scrollable = true,
  footer,
  ScrollComponent,
  maxHeight = SHEET_MAX_HEIGHT,
}: SheetProps) {
  const c = useE237Colors();
  const t = useDsT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Position basse : la feuille prend la hauteur de son contenu, plafonnée.
  // Position haute : plein écran MOINS une marge. Le backdrop doit rester
  // visible et cliquable — c'est la seule sortie au doigt d'une feuille qui
  // n'offre pas de bouton « fermer ».
  const { collapsedMax, expandedMax } = sheetCaps(height, maxHeight);
  /** Au-dessus de la feuille, toujours : l'encoche, plus de quoi toucher le fond. */
  const roomPaddingTop = insets.top + spacing['2'];
  /**
   * La place RÉELLEMENT libre pour la feuille : de l'encoche au clavier (ou au
   * bas de l'écran). Mesurée, pas calculée : iOS la réduit par le rembourrage
   * du `KeyboardAvoidingView`, Android en rétrécissant la fenêtre. Les deux
   * plafonds ci-dessus sont des fractions de l'ÉCRAN ; sans cette mesure, un
   * long fil de commentaires plus le clavier poussaient le haut de la feuille
   * — titre et poignée compris — hors de l'écran. 0 = pas encore mesurée.
   */
  const room = useSharedValue(0);

  /**
   * Une seule valeur pour les deux moitiés du geste : au-dessus de zéro, ce
   * sont les pixels AJOUTÉS à la hauteur naturelle ; en dessous, les pixels
   * dont la feuille est descendue vers sa sortie.
   */
  const pos = useSharedValue(0);
  const start = useSharedValue(0);
  const natural = useSharedValue(0);

  useEffect(() => {
    // Une feuille rouverte à la taille de la fois d'avant surprend : chaque
    // ouverture repart de la hauteur de son contenu.
    if (open) pos.value = 0;
  }, [open, pos]);

  function onSheetLayout(e: LayoutChangeEvent) {
    // Mesuré SEULEMENT au repos : pendant le glissement la hauteur mesurée est
    // celle qu'on impose, la relire ferait diverger le geste de lui-même.
    if (pos.value === 0) natural.value = e.nativeEvent.layout.height;
  }

  /** Ce qu'il reste à gagner en hauteur depuis la position basse. */
  function headroom() {
    'worklet';
    const top = room.value > 0 ? Math.min(expandedMax, room.value) : expandedMax;
    return Math.max(0, top - natural.value);
  }

  function onRoomLayout(e: LayoutChangeEvent) {
    room.value = Math.max(0, e.nativeEvent.layout.height - roomPaddingTop);
  }

  const pan = Gesture.Pan()
    .onBegin(() => {
      start.value = pos.value;
    })
    .onUpdate((e) => {
      pos.value = Math.min(start.value - e.translationY, headroom());
    })
    .onEnd((e) => {
      const decision = decideSnap(pos.value, e.velocityY, headroom());
      if (decision.close) {
        // L'animation de sortie est celle du Modal (`animationType="slide"`) :
        // rien à jouer ici, sinon la feuille remonterait pour redescendre.
        runOnJS(onClose)();
        return;
      }
      pos.value = withSpring(decision.to, SPRING);
    });

  const sheetStyle = useAnimatedStyle(() => {
    const grown = natural.value + Math.max(0, pos.value);
    // La place libre l'emporte sur tout : clavier ouvert, la feuille rétrécit
    // et c'est son corps qui défile.
    const fit = room.value > 0 ? room.value : Number.POSITIVE_INFINITY;
    return {
      // `minHeight` seulement quand on a agrandi : à zéro, la feuille garde son
      // comportement d'origine — elle épouse son contenu.
      minHeight: pos.value > 0 ? Math.min(grown, fit) : 0,
      maxHeight: Math.min(Math.max(collapsedMax, grown), fit),
      transform: [{ translateY: Math.max(0, -pos.value) }],
    };
  });

  const Scroll = ScrollComponent ?? ScrollView;
  /*
    `bottomOffset` / `extraKeyboardSpace` appartiennent à
    react-native-keyboard-controller. Sur une ScrollView nue — le défaut, donc
    le cas le plus fréquent — React Native les transmettrait à la vue native,
    qui ne les connaît pas.
  */
  const keyboardProps = ScrollComponent ? { bottomOffset: 24, extraKeyboardSpace: 16 } : {};

  const body = scrollable ? (
    <Scroll
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
      style={styles.scroll}
      {...keyboardProps}
    >
      {children}
    </Scroll>
  ) : (
    children
  );

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      {/* Obligatoire : un Modal est une fenêtre à part, les gestes n'y
          remontent pas jusqu'à la racine de l'app (Android). */}
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          {/*
            iOS ne redimensionne pas un Modal à l'ouverture du clavier : sans
            ça, l'action collée en bas passerait DERRIÈRE le clavier. Android
            est exclu volontairement — `softwareKeyboardLayoutMode: "resize"`
            rétrécit déjà la fenêtre, et c'est cette seconde compensation qui a
            déjà rendu un bouton intouchable dans ce projet.
          */}
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.avoider}
          >
            {/* La place libre, mesurée : de l'encoche (plus un peu d'air, pour
                que le backdrop reste touchable au-dessus) jusqu'au clavier. */}
            <View
              onLayout={onRoomLayout}
              style={[styles.room, { paddingTop: roomPaddingTop }]}
            >
              <AnimatedPressable
                onLayout={onSheetLayout}
                style={[
                  styles.sheet,
                  {
                    backgroundColor: c.surfaceRaised,
                    borderColor: c.border,
                    // L'action vit maintenant en pied de feuille : elle ne doit
                    // pas finir sous la barre de navigation gestuelle.
                    paddingBottom: spacing['4'] + insets.bottom,
                  },
                  sheetStyle,
                ]}
                onPress={(e) => e.stopPropagation()}
              >
                <GestureDetector gesture={pan}>
                  <View
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityLabel={t('ui.sheet.handle')}
                    accessibilityHint={t('ui.sheet.handleHint')}
                    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                    onAccessibilityAction={(e) => {
                      // Au doigt c'est un glissement ; au lecteur d'écran, deux
                      // actions. Sans elles la poignée redeviendrait décorative
                      // pour qui ne peut pas viser une barre de 4 px.
                      pos.value = withSpring(
                        e.nativeEvent.actionName === 'increment'
                          ? Math.max(0, expandedMax - natural.value)
                          : 0,
                        SPRING,
                      );
                    }}
                    style={styles.handleZone}
                  >
                    <View style={[styles.handle, { backgroundColor: c.border }]} />
                  </View>
                </GestureDetector>
                {title ? (
                  <View style={styles.header}>
                    <Txt variant="heading">{title}</Txt>
                    {subtitle ? (
                      <Txt variant="caption" tone="secondary">
                        {subtitle}
                      </Txt>
                    ) : null}
                  </View>
                ) : null}
                {body}
                {footer ? <View style={styles.footer}>{footer}</View> : null}
              </AnimatedPressable>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000099' },
  avoider: { flex: 1 },
  room: { flex: 1, justifyContent: 'flex-end', pointerEvents: 'box-none' },
  sheet: {
    // C'est elle qui rend la main quand la place manque (clavier ouvert) : son
    // corps défilant rétrécit, la poignée, le titre et le pied restent.
    flexShrink: 1,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing['4'],
    paddingTop: spacing['4'],
    gap: spacing['3'],
  },
  // La barre fait 4 px de haut ; le doigt en réclame quarante. Le débord
  // remonte dans le rembourrage de la feuille pour ne rien déplacer à l'œil.
  handleZone: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing['2'],
    marginTop: -spacing['2'],
  },
  handle: { width: 40, height: 4, borderRadius: radius.full },
  header: { gap: 2 },
  // `flexShrink` : c'est cette vue qui rend la main sous le plafond de hauteur,
  // sinon le pied de page serait poussé hors de l'écran. `flexGrow` : elle
  // absorbe la place gagnée quand on agrandit la feuille à la poignée.
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    // La zone qui défile va jusqu'aux BORDS de la feuille, et c'est son
    // contenu qui reprend la gouttière : le curseur vert longe le bord, il ne
    // vient pas se poser contre les compteurs de j'aime d'un commentaire.
    marginHorizontal: -spacing['4'],
  },
  scrollContent: {
    gap: spacing['3'],
    paddingBottom: spacing['2'],
    paddingHorizontal: spacing['4'],
  },
  footer: { gap: spacing['2'], paddingTop: spacing['1'] },
});
