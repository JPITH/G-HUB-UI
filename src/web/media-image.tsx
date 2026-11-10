"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../icons/generated/web";

import { Picture } from "./picture";

/** Rayon d'arrondi, pris dans les tokens (`--e237-radius-*`). */
export type MediaRounded = "none" | "sm" | "md" | "lg" | "xl" | "full";

const RADIUS: Record<MediaRounded, string> = {
  none: "0",
  sm: "var(--e237-radius-sm)",
  md: "var(--e237-radius-md)",
  lg: "var(--e237-radius-lg)",
  xl: "var(--e237-radius-xl)",
  full: "var(--e237-radius-full)",
};

export interface MediaImageProps {
  /** URL distante ; `null`/`undefined` → repli visuel (jamais de carré cassé). */
  src?: string | null;
  /**
   * Seconde URL, tentée UNE fois si `src` ne charge pas, avant le repli
   * illustré (jumelle du natif : variante légère demandée, URL de l'API en
   * secours).
   */
  fallbackSrc?: string | null;
  /** Texte alternatif — obligatoire (produit, événement, salle…). */
  alt: string;
  /** Ratio largeur / hauteur (défaut 16 / 9). */
  ratio?: number;
  rounded?: MediaRounded;
  /** `cover` (défaut) remplit le cadre, `contain` montre le média entier. */
  fit?: "cover" | "contain";
  /** Icône de repli (défaut : `image-off` du jeu G-HUB). */
  fallbackIcon?: ReactNode;
  /** Courte légende sous l'icône de repli (ex. « Photo à venir »). */
  fallbackLabel?: string;
  className?: string;
  style?: CSSProperties;
  /**
   * L'image du LCP (la première carte visible d'une liste) : chargée tout de
   * suite, en priorité haute. Une seule par écran, les autres restent différées.
   */
  priority?: boolean;
}

type Status = "loading" | "ready" | "error";

/**
 * Image distante réutilisable (produits, événements, salles).
 *
 * - URL absente ou en erreur → repli illustré sur `surface-raised`, pas un
 *   carré cassé ;
 * - cadre à ratio fixe : la mise en page ne saute pas pendant le chargement ;
 * - état de chargement discret (shimmer `.ui-skeleton`, coupé par
 *   `prefers-reduced-motion`).
 */
export function MediaImage({
  src: primarySrc,
  fallbackSrc,
  alt,
  ratio = 16 / 9,
  rounded = "md",
  fit = "cover",
  fallbackIcon,
  fallbackLabel,
  className = "",
  style,
  priority = false,
}: MediaImageProps) {
  // 0 = `src`, 1 = `fallbackSrc` après un échec de `src`.
  const [attempt, setAttempt] = useState<0 | 1>(0);
  const src = attempt === 1 ? fallbackSrc : primarySrc;
  const [status, setStatus] = useState<Status>(src ? "loading" : "error");

  useEffect(() => {
    setAttempt(0);
    setStatus(primarySrc || fallbackSrc ? "loading" : "error");
  }, [primarySrc, fallbackSrc]);

  const onError = () => {
    if (attempt === 0 && fallbackSrc && fallbackSrc !== primarySrc) {
      setAttempt(1);
      setStatus("loading");
      return;
    }
    setStatus("error");
  };

  const loading = Boolean(src) && status === "loading";
  const failed = !src || status === "error";

  return (
    <span
      className={`e237-media ${loading ? "ui-skeleton" : ""} ${className}`.trim()}
      style={{ aspectRatio: ratio, borderRadius: RADIUS[rounded], ...style }}
    >
      {src && !failed ? (
        <Picture
          className="e237-media__img"
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          style={{ objectFit: fit, opacity: status === "ready" ? 1 : 0 }}
          onLoad={() => setStatus("ready")}
          onError={onError}
        />
      ) : null}

      {failed ? (
        <span className="e237-media__ph" role="img" aria-label={alt}>
          {fallbackIcon ?? <Icon name="image-off" strokeWidth={1.25} />}
          {fallbackLabel ? (
            <span className="e237-media__phlabel">{fallbackLabel}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
