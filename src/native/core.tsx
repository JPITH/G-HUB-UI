/**
 * Composants React Native ESPORT 237 HUB (Expo).
 *
 * Mêmes tokens que le web (src/tokens) ; le mode light/dark suit
 * useColorScheme(). API volontairement parallèle à ./web pour que les
 * écrans mobiles et web se ressemblent trait pour trait.
 */
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  color,
  font,
  pill,
  radius,
  ramp,
  ROLE,
  spacing,
  withAlpha,
  type ColorScale,
  type RampName,
  type ThemeMode,
} from '../tokens';
import type { Tone } from '../lib/tone';
import { widenAmountGaps } from '../lib/money';
import { inertIcon } from './button-icon';
import { haptic } from './haptics';
import { useNeu } from './neu';
import { fontFamily } from './typography';

export { color, font, pill, radius, spacing, withAlpha };
export type { ColorScale, ThemeMode };
export { useNeu, createNeu } from './neu';
export type { NeuShadows, NeuMode, NeuStyle } from './neu';
export { fontFamily } from './typography';

/** Mode actif (dark par défaut, ADN de la marque). */
export function useE237Mode(): ThemeMode {
  return useColorScheme() === 'light' ? 'light' : 'dark';
}

/** Palette active selon le mode système (dark par défaut, ADN de la marque). */
export function useE237Colors(): ColorScale {
  return useE237Mode() === 'light' ? color.light : color.dark;
}

/**
 * Fond + liseré d'une pilule teintée, dosés selon le mode (cf. `pill` dans
 * les tokens). À utiliser partout où le web pose un
 * `color-mix(in srgb, <teinte> N%, transparent)`.
 */
export function useToneSurface(tone: string): {
  backgroundColor: string;
  borderColor: string;
} {
  const mode = useE237Mode();
  return {
    backgroundColor: withAlpha(tone, pill.fill[mode]),
    borderColor: withAlpha(tone, pill.stroke[mode]),
  };
}

/**
 * Fond + liseré OPAQUES d'un encart teinté, pris dans la rampe aux échelons
 * de `ROLE` (`tint` : 50 en clair, 950 en sombre ; `tintBorder` : 200 / 800).
 * Jumeau natif de `--e237-<ton>-subtle` / `--e237-<ton>-border` du web.
 * Remplace les teintes inventées (`${c.danger}18`, `${c.danger}66`) :
 * DESIGN.md, « un échelon dans une rampe, jamais une nuance inventée ».
 */
export function useToneTint(name: RampName): {
  backgroundColor: string;
  borderColor: string;
} {
  const role = ROLE[useE237Mode()];
  return {
    backgroundColor: ramp[name][role.tint],
    borderColor: ramp[name][role.tintBorder],
  };
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  /**
   * Action en cours : le bouton se verrouille et affiche un indicateur.
   *
   * Le jumeau web l'avait depuis toujours, pas le natif. Chaque écran
   * réinventait donc l'attente à la main — `disabled={busy}` plus un libellé
   * « Enregistrement… » traduit une fois par action, soit une vingtaine de
   * clés d'i18n qui disent toutes la même chose. Et un libellé qui change de
   * longueur fait sauter la largeur du bouton sous le doigt.
   */
  loading?: boolean;
  /** Pleine largeur — pour un CTA en bas de formulaire ou de feuille. */
  block?: boolean;
  /** Pictogramme avant le libellé ; masqué pendant le chargement. */
  icon?: ReactNode;
  /** Pictogramme après le libellé ; masqué pendant le chargement. */
  iconRight?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  block = false,
  icon,
  iconRight,
  style,
}: ButtonProps) {
  const c = useE237Colors();
  const neu = useNeu();
  const locked = disabled || loading;
  /* Désactivé (pas en chargement) : un style NEUTRE, pas l'aplat de la variante
     à moitié transparent, qui ressemblait encore à un bouton actif et se lisait
     mal en clair (revue du 11/11/2026). Texte atténué, contraste vérifié
     (`textMuted`, tokens/contrast.test.ts). */
  const inert = disabled && !loading;
  const containerStyle: ViewStyle[] = [styles.btn];
  const labelStyle: TextStyle[] = [styles.btnLabel];

  if (inert) {
    if (variant !== 'ghost') {
      containerStyle.push(styles.btnInert, { backgroundColor: c.surfaceSunken, borderColor: c.border });
    }
    labelStyle.push({ color: c.textMuted });
  } else if (variant === 'primary') {
    containerStyle.push({ backgroundColor: c.accent });
    labelStyle.push({ color: c.onAccent });
  } else if (variant === 'secondary') {
    containerStyle.push({ backgroundColor: c.surfaceRaised });
    labelStyle.push({ color: c.textPrimary });
  } else {
    labelStyle.push({ color: c.accent });
  }

  const spinnerColor = variant === 'primary' ? c.onAccent : c.accent;
  // Inerte : l'icône suit le libellé atténué, sinon `onAccent` disparaît sur `surfaceSunken`.
  const renderIcon = (node: ReactNode) => {
    if (!node || !inert) return node;
    const out = inertIcon(node, c.textMuted);
    return out.dim ? <View style={styles.iconDim}>{out.node}</View> : out.node;
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: locked, busy: loading }}
      onPress={onPress}
      onPressIn={() => {
        if (!locked) haptic(variant === 'primary' ? 'medium' : 'light');
      }}
      disabled={locked}
      style={({ pressed }) => [
        containerStyle,
        block && styles.btnBlock,
        inert
          ? null
          : variant === 'primary'
          ? pressed
            ? neu.pressedSm
            : neu.primaryGlow(c.accent)
          : variant === 'secondary'
            ? pressed
              ? neu.pressedSm
              : neu.raisedSm
            : null,
        pressed && variant === 'ghost' && styles.pressed,
        loading && styles.disabled,
        style,
      ]}
    >
      {/*
        Le libellé RESTE monté pendant le chargement, rendu invisible, et
        l'indicateur se pose par-dessus. Le remplacer ferait rétrécir le bouton
        au moment précis où le doigt est encore dessus — et un bouton qui change
        de taille sous le doigt donne l'impression d'avoir raté sa cible.
      */}
      {loading ? (
        <View style={styles.btnSpinner} pointerEvents="none">
          <ActivityIndicator size="small" color={spinnerColor} />
        </View>
      ) : null}
      {!loading && icon ? renderIcon(icon) : null}
      {/* Montant lisible : espace pleine insécable à la place de l'espace fine (webB-20). */}
      <Text style={[...labelStyle, loading && styles.btnLabelHidden]}>
        {widenAmountGaps(label)}
      </Text>
      {!loading && iconRight ? renderIcon(iconRight) : null}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

export interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: CardProps) {
  const c = useE237Colors();
  const neu = useNeu();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surfaceRaised },
        neu.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

/** Même vocabulaire que le web — voir `lib/tone.ts`. */
export type BadgeTone = Tone;

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /** `sm` : pastille compacte (11 px) pour une case dense — parité web. */
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  /** Surcharge du libellé (taille/police) — le cadre reste celui du DS. */
  textStyle?: StyleProp<TextStyle>;
}

/** Résout un ton sémantique en couleur de la palette active. */
export function useToneColor(tone: BadgeTone): string {
  const c = useE237Colors();
  const byTone: Record<BadgeTone, string> = {
    accent: c.accent,
    cyan: c.cyan,
    success: c.success,
    info: c.info,
    gold: c.gold,
    danger: c.danger,
    warning: c.warning,
    neutral: c.textSecondary,
  };
  return byTone[tone];
}

/**
 * Pilule d'état (parité `.e237-badge`). Le fond teinté est plus appuyé que
 * sur le web et un liseré de la même teinte dessine la forme : sans lui la
 * pilule disparaissait sur un téléphone en plein jour (retour porteur).
 */
export function Badge({ children, tone = 'accent', size = 'md', style, textStyle }: BadgeProps) {
  const toneColor = useToneColor(tone);
  const surface = useToneSurface(toneColor);
  const sm = size === 'sm';

  return (
    <View style={[styles.badge, sm && styles.badgeSm, surface, style]}>
      <Text style={[styles.badgeLabel, sm && styles.badgeLabelSm, { color: toneColor }, textStyle]}>
        {children}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Stat                                                                */
/* ------------------------------------------------------------------ */

export interface StatProps {
  value: string | number;
  label: string;
  /** À droite de la valeur, sur la même ligne (mini-courbe, icône) — parité web. */
  aside?: ReactNode;
  /** Lignes complémentaires sous le libellé (variation, précision). */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Stat({ value, label, aside, children, style }: StatProps) {
  const c = useE237Colors();
  const valueNode = <Text style={[styles.statValue, { color: c.textPrimary }]}>{value}</Text>;
  return (
    <View style={style}>
      {aside != null ? (
        <View style={styles.statRow}>
          {valueNode}
          {aside}
        </View>
      ) : (
        valueNode
      )}
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
      {children != null ? <View style={styles.statMeta}>{children}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* SectionLabel                                                        */
/* ------------------------------------------------------------------ */

export interface SectionLabelProps {
  children: ReactNode;
  /** `cyan` (défaut) : titre de section ; `muted` : intertitre discret ; `gold` : palmarès. */
  tone?: 'cyan' | 'muted' | 'gold';
  style?: StyleProp<TextStyle>;
}

export function SectionLabel({ children, tone = 'cyan', style }: SectionLabelProps) {
  const c = useE237Colors();
  const ink = tone === 'muted' ? c.textMuted : tone === 'gold' ? c.gold : c.cyan;
  return (
    <Text style={[styles.sectionLabel, { color: ink }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing['2'],
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: spacing['5'],
    borderRadius: radius.full,
    borderCurve: 'continuous',
  },
  btnLabel: {
    fontFamily: fontFamily.displaySemi,
    fontSize: font.size.sm,
    // Beaucoup de libellés portent un montant (« Payer 4 000 FCFA », « Billet à
    // partir de 2 000 FCFA ») et il change sous le doigt quand on règle une
    // quantité : sans chasse fixe, le bouton danse à chaque chiffre.
    fontVariant: ['tabular-nums'] as const,
  },
  pressed: {
    opacity: 0.85,
  },
  btnBlock: { alignSelf: 'stretch' },
  btnSpinner: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabelHidden: { opacity: 0 },
  // Même hauteur que les autres : 1 px de bord pris sur le rembourrage.
  btnInert: { borderWidth: 1, paddingVertical: 9 },
  iconDim: { opacity: 0.5 },
  disabled: {
    opacity: 0.5,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing['5'],
    borderCurve: 'continuous',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: 1,
    /* -1 px de padding vertical pour compenser le liseré : hauteur inchangée. */
    paddingVertical: 2,
    paddingHorizontal: 9,
  },
  badgeLabel: {
    fontFamily: fontFamily.displaySemi,
    fontSize: font.size.xs,
  },
  badgeSm: { paddingVertical: 0, paddingHorizontal: 6 },
  badgeLabelSm: { fontSize: 11 },
  statValue: {
    fontFamily: fontFamily.bodyBlack,
    fontSize: font.size.xl,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: fontFamily.body,
    fontSize: font.size.xs,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing['2'],
  },
  statMeta: { marginTop: spacing['1'], gap: 2 },
  sectionLabel: {
    fontFamily: fontFamily.display,
    fontSize: font.size.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
