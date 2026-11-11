import { Platform } from 'react-native';

/**
 * Sur le WEB (export Expo), Chivo et Space Grotesk n'ont pas d'emoji : sans
 * repli nommé, « Le match retour 🔥 » sortait en carré vide là où le système
 * n'en fournit pas (revue du 11/11/2026). Le navigateur prend la première
 * police qui a le glyphe ; l'app native, elle, n'accepte qu'UN nom de famille.
 */
const EMOJI_FALLBACK = `'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`;
const family = (name: string): string =>
  Platform.OS === 'web' ? `${name}, ${EMOJI_FALLBACK}` : name;

/**
 * Familles chargées par l'app mobile (expo-font) — miroir web :
 * display = Space Grotesk, corps = Chivo (globals.css bannit Inter).
 */
export const fontFamily = {
  body: family('Chivo_400Regular'),
  bodyMedium: family('Chivo_500Medium'),
  /** Graisses intermédiaires : servent au `Text` de l'app, qui traduit un
   *  `fontWeight` en famille (la graisse est dans le nom du fichier). */
  bodySemi: family('Chivo_600SemiBold'),
  bodyBold: family('Chivo_700Bold'),
  bodyExtraBold: family('Chivo_800ExtraBold'),
  bodyBlack: family('Chivo_900Black'),
  display: family('SpaceGrotesk_700Bold'),
  displaySemi: family('SpaceGrotesk_600SemiBold'),
  displayMedium: family('SpaceGrotesk_500Medium'),
  displayRegular: family('SpaceGrotesk_400Regular'),
} as const;
