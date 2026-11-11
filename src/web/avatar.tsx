/**
 * Wrappers Avatar / AvatarGroup (Astryx 0.1.8).
 * Seul astryx.ts importe @astryxdesign — ici on passe par les ré-exports.
 */
'use client';

import type { ReactNode } from 'react';

import {
  AstryxAvatar,
  AstryxAvatarGroup,
  AstryxAvatarGroupOverflow,
  type AstryxAvatarSize,
} from './astryx';

export type AvatarSize = AstryxAvatarSize;

const NUMERIC_SIZES = [
  16, 20, 24, 32, 36, 40, 48, 60, 64, 72, 96, 128, 144, 180,
] as const;

/** Mappe une taille libre (ex. 56) vers la grille Astryx. */
export function toAvatarSize(size: number | AvatarSize): AvatarSize {
  if (typeof size !== 'number') return size;
  let best: (typeof NUMERIC_SIZES)[number] = 36;
  let bestDist = Infinity;
  for (const n of NUMERIC_SIZES) {
    const d = Math.abs(n - size);
    if (d < bestDist) {
      best = n;
      bestDist = d;
    }
  }
  return best;
}

export interface AvatarProps {
  name?: string | null;
  /** Photo de profil (sinon initiales). */
  src?: string | null;
  /** Taille Astryx (`md`…) ou pixels (mappés à la grille). @default 36 */
  size?: number | AvatarSize;
  alt?: string;
  status?: ReactNode;
  className?: string;
}

/** Avatar joueur — image → initiales → icône générique (Astryx). */
export function Avatar({
  name,
  src,
  size = 36,
  alt,
  status,
  className,
}: AvatarProps) {
  return (
    <AstryxAvatar
      name={name ?? undefined}
      src={src ?? undefined}
      alt={alt ?? name ?? undefined}
      size={toAvatarSize(size)}
      status={status}
      // `.e237-avatar` (components.css) : la photo remplit le cercle.
      className={className ? `e237-avatar ${className}` : 'e237-avatar'}
    />
  );
}

export interface AvatarPerson {
  name: string;
  src?: string | null;
  key?: string;
}

export interface AvatarGroupProps {
  people: AvatarPerson[];
  /** Max d'avatars visibles (le reste → +N). @default 4 */
  max?: number;
  /**
   * Effectif total (ex. `tickets_sold`) quand `people` n'est qu'un aperçu.
   * Sinon overflow = `people.length - max`.
   */
  total?: number;
  size?: AvatarSize;
  /** Libellé a11y du groupe. */
  'aria-label'?: string;
  className?: string;
}

/**
 * Facepile — participants d'événement, adversaires, etc.
 * Utilise AvatarGroup + AvatarGroupOverflow (Astryx 0.1.8).
 */
export function AvatarGroup({
  people,
  max = 4,
  total,
  size = 'md',
  'aria-label': ariaLabel,
  className,
}: AvatarGroupProps) {
  const visible = people.slice(0, max);
  const headcount = total ?? people.length;
  const overflow = Math.max(0, headcount - visible.length);

  if (people.length === 0 && overflow <= 0) return null;

  return (
    <AstryxAvatarGroup size={size} aria-label={ariaLabel} className={className}>
      {visible.map((p, i) => (
        <AstryxAvatar
          key={p.key ?? `${p.name}-${i}`}
          name={p.name}
          src={p.src ?? undefined}
          alt={p.name}
          className="e237-avatar"
        />
      ))}
      {overflow > 0 ? (
        <AstryxAvatarGroupOverflow count={overflow} />
      ) : null}
    </AstryxAvatarGroup>
  );
}
