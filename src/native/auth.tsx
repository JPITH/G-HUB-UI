/**
 * Chrome auth — layout SpeechLab-like (switch, titre, form, CTA).
 * Polices produit = web (Space Grotesk + Chivo). Néomorphisme via useNeu().
 *
 * 09/10/2026 (retour du porteur, lot M1) : plus de tuile « logo dans une
 * carte » au-dessus du titre de la connexion, du mot de passe oublié et de
 * la création de compte — elle ne disait rien de plus que l'icône de l'app
 * qu'on vient d'ouvrir et repoussait le formulaire. Le titre porte l'écran.
 */
import { forwardRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type HostInstance as ViewInstance,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { BRAND_NAME_ACCENT, BRAND_NAME_REST } from '../lib/brand-name';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { font, radius, spacing, useE237Colors, useE237Mode } from './core';
import { AppMark } from './mark';
import { haptic } from './haptics';
import { useNeu } from './neu';
import { ScrollView } from './scroll';
import { fontFamily } from './typography';

// WebP, pas PNG : ce fond s'affiche sur le PREMIER écran, avant toute
// connexion, et il pesait 1,74 Mo. Sur un forfait de données camerounais,
// c'était la partie la plus chère de l'application, payée par quelqu'un qui
// n'a encore rien vu du produit. Même image, 49 Ko. Expo décode le WebP sur
// les deux plateformes.
const DEFAULT_AUTH_BG = require('./assets/auth-bg.webp') as ImageSourcePropType;

/* ------------------------------------------------------------------ */
/* AuthScreen — layout partagé login / signup                          */
/* ------------------------------------------------------------------ */

type AuthScrollProps = {
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'handled' | 'always' | 'never';
  showsVerticalScrollIndicator?: boolean;
  bottomOffset?: number;
  extraKeyboardSpace?: number;
  children?: ReactNode;
};

export function AuthScreen({
  title,
  subtitle,
  switchLabel,
  onSwitchPress,
  children,
  footer,
  background = DEFAULT_AUTH_BG,
  ScrollComponent = ScrollView,
}: {
  title: string;
  subtitle?: string;
  /** Lien coin haut-droit (ex. « Créer un compte »). */
  switchLabel: string;
  onSwitchPress: () => void;
  children: ReactNode;
  footer?: ReactNode;
  background?: ImageSourcePropType;
  /**
   * Scroll clavier-aware (ex. KeyboardAwareScrollView).
   * Défaut : la ScrollView du design system (curseur vert).
   */
  ScrollComponent?: ComponentType<AuthScrollProps>;
}) {
  const c = useE237Colors();
  const light = useE237Mode() === 'light';
  const insets = useSafeAreaInsets();
  const Scroll = ScrollComponent;

  return (
    // `overflow: hidden` : l'image de fond (900 px de large) ne doit pas
    // élargir la page sur le web (défilement horizontal relevé le 12/10/2026).
    <View style={[styles.screenRoot, styles.clip, { backgroundColor: c.bg }]}>
      <ImageBackground
        source={background}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        {/* En clair, le voile couvre presque tout (audit du 12/10/2026) : le
            fond de nuit en dessous donnait un gris terne strié de vert, loin
            du fond clair des autres écrans. */}
        <View style={[styles.scrim, { backgroundColor: `${c.bg}${light ? 'F5' : 'D9'}` }]} />
      </ImageBackground>

      <Scroll
        style={styles.screenRoot}
        contentContainerStyle={[
          styles.screenContent,
          {
            paddingTop: insets.top + spacing['3'],
            paddingBottom: insets.bottom + spacing['6'],
          },
        ]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={48}
        extraKeyboardSpace={24}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="link"
            onPress={onSwitchPress}
            hitSlop={8}
            style={styles.switchHit}
          >
            <Text style={[styles.switchLabel, { color: c.textPrimary }]}>
              {switchLabel}
            </Text>
          </Pressable>
        </View>

        {/* Hero centré dans l'espace libre au-dessus du formulaire — le
            titre seul, sans tuile de logo (porteur, 09/10/2026). */}
        <View style={styles.centerBlock}>
          <Text style={[styles.screenTitle, { color: c.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.screenSubtitle, { color: c.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Formulaire + social collés en bas d'écran. */}
        <View style={styles.bottomCluster}>
          <View style={styles.formBlock}>{children}</View>
          {footer ? <View style={styles.footerBlock}>{footer}</View> : null}
        </View>
      </Scroll>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Legacy AuthHero (welcome)                                           */
/* ------------------------------------------------------------------ */

export function AuthHero({
  title,
  subtitle,
  compact,
  logo,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
  logo?: ImageSourcePropType;
}) {
  const c = useE237Colors();

  return (
    <View style={[styles.hero, compact && styles.heroCompact]}>
      {logo ? (
        <Image source={logo} style={styles.logo} resizeMode="contain" />
      ) : (
        <AppMark size={48} />
      )}
      <Text style={[styles.brand, { color: c.textPrimary }]}>
        <Text style={{ color: c.accent }}>{BRAND_NAME_ACCENT}</Text>
        {BRAND_NAME_REST}
      </Text>
      <Text style={[styles.heroTitle, { color: c.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.heroSubtitle, { color: c.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Carte formulaire neu (optionnelle — AuthScreen empile souvent sans carte). */
export function AuthGlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useE237Colors();
  const neu = useNeu();

  return (
    <View
      style={[
        styles.glass,
        { backgroundColor: c.surfaceRaised },
        neu.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type AuthButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** CTA primaire pill — `.btn--primary` web. */
export const GradientButton = forwardRef<ViewInstance, AuthButtonProps>(
  function GradientButton({ label, onPress, disabled, style }, ref) {
    const c = useE237Colors();
    const neu = useNeu();
    const [pressed, setPressed] = useState(false);
    const scale = useSharedValue(1);
    const anim = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    // Inactif : un gris neutre au texte lisible, plus un vert pâle à 50 %
    // sous un texte blanc (audit du 12/10/2026, contraste insuffisant).
    const fillStyle = disabled
      ? ({ backgroundColor: c.surfaceRaised, borderWidth: 1, borderColor: c.border } as ViewStyle)
      : Platform.select<ViewStyle>({
          web: {
            backgroundImage: `linear-gradient(180deg, ${c.accentBright}, ${c.accent})`,
          } as ViewStyle,
          default: {
            backgroundColor: c.accent,
          },
        });

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (!disabled) {
            haptic('medium');
            setPressed(true);
            scale.value = withSpring(0.97, { damping: 14 });
          }
        }}
        onPressOut={() => {
          setPressed(false);
          scale.value = withSpring(1, { damping: 12 });
        }}
        style={[styles.gradientBtnWrap, style]}
      >
        <Animated.View
          style={[
            styles.gradientBtn,
            fillStyle,
            disabled ? null : pressed ? neu.pressedSm : neu.primaryGlow(c.accent),
            anim,
          ]}
        >
          <Text style={[styles.gradientLabel, { color: disabled ? c.textSecondary : c.onAccent }]}>{label}</Text>
        </Animated.View>
      </Pressable>
    );
  },
);

/** CTA secondaire pill — raised-sm. */
export const OutlineButton = forwardRef<ViewInstance, AuthButtonProps>(
  function OutlineButton({ label, onPress, disabled, style }, ref) {
    const c = useE237Colors();
    const neu = useNeu();

    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => {
          if (!disabled) haptic('light');
        }}
        style={({ pressed }) => [
          styles.outlineBtn,
          {
            backgroundColor: c.surfaceRaised,
            opacity: disabled ? 0.55 : 1,
          },
          pressed ? neu.pressedSm : neu.raisedSm,
          style,
        ]}
      >
        <Text style={[styles.outlineLabel, { color: c.textPrimary }]}>{label}</Text>
      </Pressable>
    );
  },
);

export function GoogleButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const c = useE237Colors();
  const neu = useNeu();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (!disabled) haptic('light');
      }}
      style={({ pressed }) => [
        styles.googleBtn,
        {
          backgroundColor: c.surfaceRaised,
          opacity: disabled ? 0.55 : 1,
        },
        pressed ? neu.pressedSm : neu.raisedSm,
      ]}
    >
      <GoogleMark />
      <Text style={[styles.googleLabel, { color: c.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function AuthDivider({ label = 'ou' }: { label?: string }) {
  const c = useE237Colors();
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.divider, { backgroundColor: c.border }]} />
      <Text style={[styles.dividerLabel, { color: c.textMuted }]}>{label}</Text>
      <View style={[styles.divider, { backgroundColor: c.border }]} />
    </View>
  );
}

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09A6.9 6.9 0 0 1 5.47 12a6.9 6.9 0 0 1 .37-2.09V7.07H2.18A11.96 11.96 0 0 0 1 12c0 1.94.46 3.77 1.18 5.43l3.66-2.84z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
  clip: { overflow: 'hidden' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  screenContent: {
    flexGrow: 1,
    paddingHorizontal: spacing['6'],
    gap: spacing['4'],
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minHeight: 40,
    alignItems: 'center',
  },
  switchHit: {
    // 44 px : le plancher des cibles tactiles (audit du 12/10/2026).
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing['1'],
  },
  switchLabel: {
    fontFamily: fontFamily.displaySemi,
    fontSize: font.size.sm,
  },
  centerBlock: {
    // Pas de flexGrow:1 — sinon le hero mange tout l’écran et le formulaire
    // (donc le champ focus) reste sous le clavier sans marge de scroll.
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['3'],
    paddingVertical: spacing['8'],
    minHeight: 120,
  },
  screenTitle: {
    fontFamily: fontFamily.display,
    fontSize: font.size['2xl'],
    textAlign: 'center',
    letterSpacing: -0.3,
    marginTop: spacing['2'],
  },
  screenSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: font.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  bottomCluster: {
    gap: spacing['4'],
    paddingBottom: spacing['1'],
  },
  formBlock: {
    gap: spacing['4'],
  },
  footerBlock: {
    gap: spacing['2'],
  },
  hero: {
    alignItems: 'center',
    gap: spacing['2'],
    paddingVertical: spacing['8'],
  },
  heroCompact: {
    paddingVertical: spacing['3'],
    gap: spacing['1'],
  },
  logo: {
    width: 72,
    height: 72,
  },
  brand: {
    fontFamily: fontFamily.display,
    fontSize: font.size.xs,
    letterSpacing: 1.4,
  },
  heroTitle: {
    fontFamily: fontFamily.display,
    fontSize: font.size.xl,
    textAlign: 'center',
    lineHeight: 30,
    marginTop: spacing['1'],
  },
  heroSubtitle: {
    fontFamily: fontFamily.body,
    fontSize: font.size.sm,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  glass: {
    borderRadius: radius.xl,
    padding: spacing['5'],
    gap: spacing['4'],
    borderCurve: 'continuous',
  },
  gradientBtnWrap: {
    minHeight: 52,
    borderRadius: radius.full,
    borderCurve: 'continuous',
  },
  gradientBtn: {
    minHeight: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['5'],
    borderRadius: radius.full,
    borderCurve: 'continuous',
  },
  gradientLabel: {
    fontFamily: fontFamily.displaySemi,
    fontSize: font.size.sm,
  },
  outlineBtn: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderCurve: 'continuous',
    paddingHorizontal: spacing['5'],
  },
  outlineLabel: {
    fontFamily: fontFamily.displaySemi,
    fontSize: font.size.sm,
  },
  googleBtn: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing['2'],
    borderRadius: radius.full,
    borderCurve: 'continuous',
    paddingHorizontal: spacing['5'],
  },
  googleLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: font.size.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: font.size.xs,
    textTransform: 'lowercase',
  },
});
