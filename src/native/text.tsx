/**
 * Typographie native — un seul point d'entrée pour tout texte de l'app.
 *
 * Les familles sont des faces nommées (Chivo_700Bold…) : on ne pose JAMAIS
 * `fontWeight` à côté, sinon Android synthétise une graisse et la police
 * produit saute. Utiliser `<Txt variant>` partout plutôt que `<Text>` brut.
 */
import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { font, useE237Colors } from './core';
import { fontFamily } from './typography';

export type TxtVariant =
  /** Titre d'accueil / hero — Space Grotesk 700. */
  | 'display'
  /** Titre d'écran. */
  | 'title'
  /** Titre de section ou de carte. */
  | 'heading'
  /** Sous-titre / intertitre. */
  | 'subtitle'
  /** Corps de texte. */
  | 'body'
  /** Corps appuyé (valeurs, noms). */
  | 'bodyMedium'
  /** Corps gras. */
  | 'bodyBold'
  /** Libellé de contrôle (bouton, onglet, pilule). */
  | 'label'
  /** Métadonnée, aide, légende. */
  | 'caption'
  /** Micro-titre capitalisé et espacé (labels de section). */
  | 'overline'
  /** Chiffres proéminents (KPI, score, solde). */
  | 'numeric';

export type TxtTone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'accent'
  | 'cyan'
  | 'gold'
  | 'success'
  | 'danger'
  | 'warning'
  | 'onAccent'
  | 'inherit';

const VARIANTS: Record<TxtVariant, TextStyle> = {
  display: {
    fontFamily: fontFamily.display,
    fontSize: font.size['3xl'],
    lineHeight: font.size['3xl'] * 1.15,
    letterSpacing: -0.6,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: font.size.xl,
    lineHeight: font.size.xl * 1.2,
    letterSpacing: -0.3,
  },
  heading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: font.size.md,
    lineHeight: font.size.md * 1.3,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontFamily: fontFamily.displayMedium,
    fontSize: font.size.sm,
    lineHeight: font.size.sm * 1.35,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: font.size.sm,
    lineHeight: font.size.sm * 1.45,
  },
  bodyMedium: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: font.size.sm,
    lineHeight: font.size.sm * 1.45,
  },
  bodyBold: {
    fontFamily: fontFamily.bodyBold,
    fontSize: font.size.sm,
    lineHeight: font.size.sm * 1.45,
  },
  label: {
    fontFamily: fontFamily.displaySemi,
    fontSize: font.size.sm,
    lineHeight: font.size.sm * 1.2,
  },
  caption: {
    fontFamily: fontFamily.body,
    fontSize: font.size.xs,
    lineHeight: font.size.xs * 1.4,
  },
  overline: {
    fontFamily: fontFamily.display,
    fontSize: font.size.xs - 1,
    lineHeight: font.size.xs * 1.25,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  numeric: {
    fontFamily: fontFamily.bodyBlack,
    fontSize: font.size.xl,
    lineHeight: font.size.xl * 1.1,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.4,
  },
};

/**
 * Styles d'une variante — pour les rares cas où un `Text` est imposé
 * (composants tiers). Préférer `<Txt>`.
 */
export function typeStyle(variant: TxtVariant): TextStyle {
  return VARIANTS[variant];
}

export interface TxtProps extends Omit<TextProps, 'style'> {
  children?: ReactNode;
  variant?: TxtVariant;
  tone?: TxtTone;
  /** Écrase la taille de la variante (l'interligne suit). */
  size?: number;
  /** Couleur littérale — réservée aux surfaces peintes (cartes, gradients). */
  color?: string;
  align?: TextStyle['textAlign'];
  uppercase?: boolean;
  style?: StyleProp<TextStyle>;
}

/**
 * Plafond d'agrandissement du texte (réglage « grande police » du
 * téléphone), 31/10/2026 : sans lui, les cartes et la barre d'onglets se
 * cassaient à 200 %. 1,6 garde le texte nettement plus grand pour qui en a
 * besoin ; un appelant peut passer sa propre valeur (`maxFontSizeMultiplier`).
 */
export const TXT_MAX_FONT_SCALE = 1.6;

/** Texte produit : police, taille et couleur issues des tokens. */
export function Txt({
  children,
  variant = 'body',
  tone = 'primary',
  size,
  color,
  align,
  uppercase,
  style,
  ...rest
}: TxtProps) {
  const c = useE237Colors();

  const tones: Record<Exclude<TxtTone, 'inherit'>, string> = {
    primary: c.textPrimary,
    secondary: c.textSecondary,
    muted: c.textMuted,
    accent: c.accent,
    cyan: c.cyan,
    gold: c.gold,
    success: c.success,
    danger: c.danger,
    warning: c.warning,
    onAccent: c.onAccent,
  };

  const base = VARIANTS[variant];
  const scaled =
    size != null
      ? { fontSize: size, lineHeight: size * (variantLineRatio(variant)) }
      : null;

  return (
    <Text
      maxFontSizeMultiplier={TXT_MAX_FONT_SCALE}
      {...rest}
      style={[
        base,
        tone !== 'inherit' && { color: tones[tone] },
        scaled,
        color ? { color } : null,
        align ? { textAlign: align } : null,
        uppercase ? styles.upper : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

function variantLineRatio(variant: TxtVariant): number {
  const v = VARIANTS[variant];
  const fs = typeof v.fontSize === 'number' ? v.fontSize : font.size.sm;
  const lh = typeof v.lineHeight === 'number' ? v.lineHeight : fs * 1.4;
  return lh / fs;
}

const styles = StyleSheet.create({
  upper: { textTransform: 'uppercase' },
});
