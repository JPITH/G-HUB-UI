/**
 * Carrousel horizontal — UN SEUL pour toute l'app, descendu de l'app mobile
 * dans le design system le 08/10/2026 : le bandeau de l'Accueil refaisait sa
 * propre piste calée et ses pastilles à côté de celui-ci, et sa carte de
 * bandeau était la sœur de celle de la Boutique. Un composant, une carte.
 *
 * CE QU'IL FAIT, ET POURQUOI
 *
 *   • Il CALE sur un élément (`snapToInterval`). Un défilement libre laisse
 *     l'écran sur une position bâtarde — moitié carte A, moitié carte B — et
 *     personne ne sait plus ce qu'il regarde.
 *   • Il laisse DÉPASSER le suivant (`peek` < 1), ou cale les éléments sur la
 *     gouttière de la page (`gutter`). Une vignette pleine largeur sans débord
 *     ne dit pas qu'il y en a d'autres.
 *   • Il DIT où l'on en est : pastilles jusqu'à huit éléments, compteur
 *     « 3 / 15 » au-delà, où la frise de pastilles ne serait plus que du bruit.
 *   • Il peut DÉFILER TOUT SEUL (`autoplayMs`), lentement et en boucle — mais
 *     jamais sous « réduire les animations », jamais quand l'écran le met en
 *     pause (`paused` : hors de vue, écran en arrière-plan), et plus jamais
 *     après un premier toucher : quelqu'un qui lit ne doit pas voir le texte
 *     partir sous ses yeux.
 *   • Il reste ATTEIGNABLE au lecteur d'écran. Une `ScrollView` (et non une
 *     `FlatList`) monte TOUS ses enfants : le balayage d'exploration les
 *     traverse tous, et la vue suit. Les listes sont courtes — quelques
 *     formules, quelques bandeaux — la virtualisation n'achèterait rien.
 *   • Il ne PIÈGE pas le défilement vertical de la page : React Native
 *     verrouille le geste sur son axe dominant.
 *
 * À NE PAS CONFONDRE avec `SwipeDeck` : celle-là est une pile de cartes qu'on
 * écarte une à une. Ici on parcourt une liste, dans les deux sens.
 */
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { useDsT } from '../i18n';
import { Icon } from '../icons/generated/native';
import type { Tone } from '../lib/tone';
import { carouselIndexAt, nextCarouselIndex } from './carousel-model';
import { radius, spacing, useE237Colors, useToneColor, useToneSurface } from './core';
import { Txt } from './text';

/** Au-delà, la frise de pastilles devient illisible : on compte. */
const MAX_DOTS = 8;

/** Écart entre deux éléments — il entre dans le pas de calage. */
const GAP = spacing['3'];

export interface CarouselProps {
  /** Un enfant = un élément calé. Les `null` des rendus conditionnels sautent. */
  children: ReactNode;
  /**
   * Ce que le lecteur d'écran annonce avant la position — « Abonnements »,
   * « Bandeaux de l'accueil », « Offres de la boutique ».
   */
  label: string;
  /**
   * Part de la largeur utile qu'occupe un élément. En dessous de 1, le
   * suivant dépasse : c'est ce débord qui donne envie de balayer. 0,45 pour
   * des éléments courts, 0,86 pour des cartes ou des photos ; 1 avec une
   * `gutter` pour des bandeaux calés sur la gouttière de la page.
   */
  peek?: number;
  /**
   * Gouttière horizontale de la piste : le carrousel occupe toute la largeur
   * (le bandeau voisin dépasse jusqu'au bord de l'écran) et chaque élément se
   * cale à `gutter` du bord, comme le reste de la page. 0 par défaut.
   */
  gutter?: number;
  /** Défilement automatique, en ms par élément (6 000 : le temps de lire). */
  autoplayMs?: number;
  /** Suspend le défilement automatique (écran en arrière-plan, carrousel hors de vue). */
  paused?: boolean;
  /** Le doigt a touché le carrousel — le défilement automatique s'arrête pour de bon. */
  onUserInteract?: () => void;
  /** L'élément courant a changé (balayage ou défilement automatique). */
  onIndexChange?: (index: number) => void;
  /** Hauteur réservée avant la mesure de la largeur : la page ne saute pas. */
  estimatedHeight?: number;
  style?: StyleProp<ViewStyle>;
  /** Identifiant de test du carrousel ; chaque élément reçoit `<testID>:<sa clé>`. */
  testID?: string;
}

export function Carousel({
  children,
  label,
  peek = 0.86,
  gutter = 0,
  autoplayMs,
  paused = false,
  onUserInteract,
  onIndexChange,
  estimatedHeight,
  style,
  testID,
}: CarouselProps) {
  const c = useE237Colors();
  const t = useDsT();
  const reduced = useReducedMotion();
  const scroller = useRef<ScrollViewInstance>(null);
  // La largeur est MESURÉE, pas déduite de l'écran : le carrousel sert aussi
  // bien dans une carte à padding que dans une feuille modale.
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  /** Le doigt a touché le carrousel : il ne repart plus tout seul. */
  const [held, setHeld] = useState(false);

  // `forEach` et non `toArray` : les clés restent celles de l'écran, qui
  // servent aussi d'identifiants de test (`<testID>:<clé>`).
  const items: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (child !== null && child !== undefined && typeof child !== 'boolean') items.push(child);
  });
  const count = items.length;
  const itemWidth = Math.max(0, Math.round((width - gutter * 2) * peek));
  const step = itemWidth + GAP;
  // La liste peut raccourcir sous les doigts (une formule retirée, une
  // campagne finie) : l'index gardé en état ne doit pas annoncer « 4 sur 3 ».
  const current = Math.min(index, Math.max(0, count - 1));

  useEffect(() => {
    onIndexChange?.(current);
  }, [current, onIndexChange]);

  useEffect(() => {
    if (!autoplayMs || reduced || held || paused || count < 2 || step <= 0) return;
    const timer = setTimeout(() => {
      const next = nextCarouselIndex(current, count);
      scroller.current?.scrollTo({ x: next * step, animated: true });
      setIndex(next);
    }, autoplayMs);
    return () => clearTimeout(timer);
  }, [autoplayMs, reduced, held, paused, count, step, current]);

  const hold = () => {
    if (!held) setHeld(true);
    onUserInteract?.();
  };

  // Un seul élément : ni piste, ni pastille, ni mesure — la carte occupe toute
  // la largeur utile.
  if (count <= 1) {
    return (
      <View style={[gutter ? { paddingHorizontal: gutter } : null, style]} testID={testID}>
        {items}
      </View>
    );
  }

  return (
    <View
      style={[styles.root, style]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      testID={testID}
    >
      {/* Tant que la largeur n'est pas connue, des éléments de 0 px n'auraient
          rien à montrer : on attend la mesure (une trame), hauteur réservée. */}
      {width > 0 ? (
        <>
          <ScrollView
            ref={scroller}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={step}
            snapToAlignment="start"
            decelerationRate="fast"
            // Un geste = un élément. Sans ça, une chiquenaude en saute trois et
            // l'on perd le fil de ce qu'on venait de voir.
            disableIntervalMomentum
            // 32 ms suffisent pour une position qui ne sert qu'à l'indicateur ;
            // reposer le même index ne redessine rien.
            scrollEventThrottle={32}
            onTouchStart={hold}
            onScrollBeginDrag={hold}
            onScroll={(e) => setIndex(carouselIndexAt(e.nativeEvent.contentOffset.x, step, count))}
            contentContainerStyle={[styles.track, gutter ? { paddingHorizontal: gutter } : null]}
          >
            {items.map((item, i) => {
              const key = isValidElement(item) && item.key != null ? String(item.key) : String(i);
              return (
                <View
                  key={key}
                  style={{ width: itemWidth }}
                  testID={testID ? `${testID}:${key}` : undefined}
                >
                  {item}
                </View>
              );
            })}
          </ScrollView>

          {/* Un seul nœud accessible : le lecteur d'écran annonce la position,
              pas huit pastilles décoratives l'une après l'autre. Pas de région
              vivante sous défilement automatique : elle parlerait toutes les
              six secondes. */}
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={t('ui.carousel.position', { label, index: current + 1, total: count })}
            accessibilityLiveRegion={autoplayMs ? 'none' : 'polite'}
            style={styles.indicator}
          >
            {count <= MAX_DOTS ? (
              items.map((_, i) => (
                <View
                  // Des pastilles identiques et jamais réordonnées : l'index
                  // EST leur identité.
                  key={i}
                  style={[
                    styles.dot,
                    i === current
                      ? { width: 16, backgroundColor: c.accent }
                      : { backgroundColor: c.borderStrong },
                  ]}
                />
              ))
            ) : (
              <Txt variant="label" size={11} tone="muted" style={styles.counter}>
                {`${current + 1} / ${count}`}
              </Txt>
            )}
          </View>
        </>
      ) : estimatedHeight ? (
        <View style={{ height: estimatedHeight }} />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* PromoSlideCard — la carte d'un bandeau (Accueil, Boutique)          */
/* ------------------------------------------------------------------ */

/** Ton d'un bandeau : une couleur de la couche 3, ou neutre (partenaire). */
export type PromoSlideTone = Exclude<Tone, 'accent'>;

/**
 * Deux gabarits, et pas un de plus : `md` pour le bandeau de l'Accueil, qui
 * passe AVANT le fil et doit rester court (136 px) ; `lg` pour la Boutique,
 * dont les bandeaux portent une phrase de plus (156 px).
 */
const SLIDE_SIZE = {
  md: { height: 136, visual: 96, title: 17, bodyLines: 2, gap: 3 },
  lg: { height: 156, visual: 112, title: 18, bodyLines: 3, gap: spacing['1'] },
} as const;

export type PromoSlideSize = keyof typeof SLIDE_SIZE;

/** Hauteur d'un bandeau, par gabarit — pour réserver la place avant la mesure. */
export const PROMO_SLIDE_HEIGHT: Readonly<Record<PromoSlideSize, number>> = {
  md: SLIDE_SIZE.md.height,
  lg: SLIDE_SIZE.lg.height,
};

export interface PromoSlideCardProps {
  /**
   * Le SENS du bandeau, jamais l'accent (réservé à l'interactif) : partenaire
   * en `neutral` (« Sponsorisé » reste lisible), saison en `info` (ça
   * avance), grand tournoi et skins en `gold` (décoratif)…
   */
  tone: PromoSlideTone;
  overline?: string;
  title: string;
  body?: string | null;
  cta: string;
  /** Le visuel de droite : une image carrée ou une `PromoSlideTile`. */
  visual: ReactNode;
  onPress: () => void;
  /** Premier contact du doigt — un carrousel automatique s'y arrête. */
  onPressIn?: () => void;
  /** Libellé accessible ; par défaut « surtitre. titre. texte. action ». */
  accessibilityLabel?: string;
  size?: PromoSlideSize;
  testID?: string;
}

/**
 * Un bandeau : texte à gauche, visuel à droite, carte TEINTÉE (fond et liseré
 * dosés par le design system selon le mode) — lisible en clair comme en
 * sombre, sans voile peint sur une photo. Hauteur FIXE : passer d'un bandeau
 * à l'autre ne fait rien sauter.
 */
export function PromoSlideCard({
  tone,
  overline,
  title,
  body,
  cta,
  visual,
  onPress,
  onPressIn,
  accessibilityLabel,
  size = 'md',
  testID,
}: PromoSlideCardProps) {
  const c = useE237Colors();
  const toneColor = useToneColor(tone);
  const surface = useToneSurface(toneColor);
  const neutral = tone === 'neutral';
  const dims = SLIDE_SIZE[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? [overline, title, body, cta].filter(Boolean).join('. ')
      }
      onPress={onPress}
      onPressIn={onPressIn}
      testID={testID}
      style={({ pressed }) => [
        styles.slide,
        {
          height: dims.height,
          backgroundColor: c.surface,
          borderColor: neutral ? c.border : surface.borderColor,
        },
        pressed && styles.pressed,
      ]}
    >
      {/* La teinte est une COUCHE sur la surface : elle reste dosée par le
          design system, quel que soit le fond de page. */}
      {!neutral ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: surface.backgroundColor }]} />
      ) : null}
      <View style={[styles.text, { gap: dims.gap }]}>
        {overline ? (
          <Txt
            variant="overline"
            size={11}
            numberOfLines={1}
            style={{ color: neutral ? c.textMuted : toneColor }}
          >
            {overline}
          </Txt>
        ) : null}
        <Txt variant="heading" size={dims.title} numberOfLines={2} style={{ color: c.textStrong }}>
          {title}
        </Txt>
        {body ? (
          <Txt variant="body" size={13} tone="secondary" numberOfLines={dims.bodyLines}>
            {body}
          </Txt>
        ) : null}
        <View style={styles.cta}>
          <Txt variant="label" size={13} numberOfLines={1} style={{ color: c.textStrong }}>
            {cta}
          </Txt>
          <Icon name="chevron-right" size={16} color={c.textStrong} />
        </View>
      </View>
      <View style={{ width: dims.visual }}>{visual}</View>
    </Pressable>
  );
}

/**
 * Le visuel d'un bandeau sans image : une tuile carrée teintée du ton du
 * bandeau (neutre : le fond du cadre), qui porte une icône ou un chiffre.
 */
export function PromoSlideTile({
  tone,
  size = 'md',
  children,
}: {
  tone: PromoSlideTone;
  size?: PromoSlideSize;
  children: ReactNode;
}) {
  const c = useE237Colors();
  const toneColor = useToneColor(tone);
  const surface = useToneSurface(toneColor);
  const side = SLIDE_SIZE[size].visual;
  return (
    <View
      style={[
        styles.tile,
        { width: side, height: side },
        tone === 'neutral' ? { backgroundColor: c.frame, borderColor: c.border } : surface,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing['2'] },
  track: { gap: GAP },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['1'],
    // Hauteur figée : le passage pastilles → compteur ne doit pas faire sauter
    // ce qui suit dans la page.
    minHeight: 12,
  },
  dot: { width: 6, height: 6, borderRadius: radius.full },
  counter: {
    // Un compteur qui change de chiffre ne doit pas changer de largeur.
    fontVariant: ['tabular-nums'] as const,
  },
  slide: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing['4'],
    gap: spacing['3'],
  },
  pressed: { opacity: 0.9 },
  text: { flex: 1, justifyContent: 'center', minWidth: 0 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  tile: {
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
