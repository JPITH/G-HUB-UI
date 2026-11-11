/**
 * Icône d'un bouton désactivé — PUR et testé (`button-icon.test.ts`).
 *
 * Revue du 11/11/2026 : le bouton inerte passe sur `surfaceSunken`, mais une
 * dizaine d'écrans lui donnent `icon={<Icon color={c.onAccent} />}` — blanc
 * sur fond clair, l'icône disparaissait. On la recolore quand l'élément prend
 * une `color` ; sinon on ne peut que l'atténuer (`dim`).
 */
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

export function inertIcon(icon: ReactNode, color: string): { node: ReactNode; dim: boolean } {
  if (!isValidElement(icon)) return { node: icon, dim: false };
  if ('color' in (icon.props as object)) {
    return { node: cloneElement(icon as ReactElement<{ color?: string }>, { color }), dim: false };
  }
  return { node: icon, dim: true };
}
