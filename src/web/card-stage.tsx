/**
 * Mouvements de la carte joueur, version DOM — jumeau de
 * `src/native/card-motion.tsx`.
 *
 * - inclinaison 3D qui suit la souris (ou le doigt) et reflet holographique ;
 * - retournement recto/verso au clic, à Entrée ou à Espace ;
 * - compteur de note qui monte, avec un éclat du liseré.
 *
 * Aucun état React par image : le pointeur écrit des variables CSS
 * (`--pcs-*`) sur l'élément, une fois par image au plus (`requestAnimationFrame`),
 * et le CSS fait le reste (`.pcard-stage*` dans components.css). Le compteur
 * écrit le `textContent` de son nœud. `prefers-reduced-motion` coupe
 * l'inclinaison et le reflet, et change le retournement en fondu — côté CSS
 * pour le rendu, côté JS pour ne pas même écouter le pointeur.
 */
"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { cardShape, shapeClipPath } from "../skins/geometry";
import { skinCssVars } from "../skins/css";
import type { SkinSpec } from "../skins/spec";

const SHIELD = shapeClipPath();

function reducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Hausse de la note détectée au rendu (motif « ajuster l'état pendant le
 * rendu ») : une nouvelle `key` par progression, avec la valeur de départ —
 * jamais un état par image.
 */
export function useRise(value: number): { key: number; from: number } {
  const [last, setLast] = useState(value);
  const [rise, setRise] = useState({ key: 0, from: value });
  if (value !== last) {
    setLast(value);
    if (value > last) setRise((r) => ({ key: r.key + 1, from: last }));
  }
  return rise;
}

/** Éclat du liseré : la carte « respire » une fois, le halo du skin flashe. */
function playRise(card: Element | null) {
  if (!card || reducedMotion() || typeof (card as HTMLElement).animate !== "function") {
    return;
  }
  (card as HTMLElement).animate(
    [
      { transform: "scale(1)", filter: "drop-shadow(0 0 0 transparent)" },
      {
        transform: "scale(1.045)",
        filter:
          "drop-shadow(0 0 18px color-mix(in srgb, var(--pc-glowc, var(--pc-accent)) 70%, transparent))",
        offset: 0.3,
      },
      { transform: "scale(1)", filter: "drop-shadow(0 0 0 transparent)" },
    ],
    { duration: 900, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  );
}

/**
 * Note de carte qui monte en compteur quand `value` augmente. Le compteur
 * réécrit le nœud texte QUE REACT POSSÈDE (`nodeValue`), jamais `textContent` :
 * remplacer le nœud laisserait React mettre à jour un nœud détaché au rendu
 * suivant, et la note resterait figée.
 */
export function RisingNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const rise = useRise(value);

  useEffect(() => {
    const text = ref.current?.firstChild;
    if (!ref.current || !text || text.nodeType !== Node.TEXT_NODE) return;
    const from = rise.from;
    if (rise.key === 0 || value <= from || reducedMotion()) return;

    playRise(ref.current.closest(".pcard-stage") ?? ref.current.closest(".pcard"));
    const steps = value - from;
    const duration = Math.min(1400, 550 + steps * 110);
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      text.nodeValue = String(Math.round(from + steps * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    text.nodeValue = String(from);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      text.nodeValue = String(value);
    };
  }, [value, rise]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

export interface CardStageProps {
  spec: SkinSpec;
  interactive?: boolean;
  flippable?: boolean;
  front: ReactNode;
  back?: ReactNode;
  className?: string;
  /** Nom accessible du bouton de retournement. */
  flipLabel: string;
}

/**
 * Scène : porte l'inclinaison (élément externe), le retournement (élément
 * interne, sa propre transition) et le reflet. Deux éléments, parce qu'une
 * même propriété `transform` ne peut pas suivre la souris à l'image près ET
 * tourner en 520 ms.
 */
export function CardStage({
  spec,
  interactive = false,
  flippable = false,
  front,
  back,
  className = "",
  flipLabel,
}: CardStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  /* Découpe du reflet : le bouclier garde son `polygon()` CSS ; une autre
     forme passe par un clipPath en unités de boîte (un `path()` CSS est en
     pixels et ne suivrait pas la taille de la carte). */
  const shape = cardShape(spec.shape);
  const clipId = `pcs${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const holoClip = shape.clipUnit ? `url(#${clipId})` : SHIELD;
  const [flipped, setFlipped] = useState(false);
  const [backMounted, setBackMounted] = useState(false);
  const canFlip = flippable && back != null;

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function aim(e: PointerEvent<HTMLDivElement>) {
    if (!interactive || reducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const nx = Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - box.top) / box.height) * 2 - 1));
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.dataset.tracking = "true";
      el.style.setProperty("--pcs-x", nx.toFixed(3));
      el.style.setProperty("--pcs-y", ny.toFixed(3));
      el.style.setProperty("--pcs-glare", "1");
    });
  }

  function rest() {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    delete el.dataset.tracking;
    el.style.setProperty("--pcs-x", "0");
    el.style.setProperty("--pcs-y", "0");
    el.style.setProperty("--pcs-glare", "0");
  }

  function toggle() {
    if (!canFlip) return;
    setBackMounted(true);
    setFlipped((f) => !f);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  return (
    <div
      ref={ref}
      className={`pcard-stage ${interactive ? "pcard-stage--interactive" : ""} ${className}`}
      data-flipped={flipped ? "true" : "false"}
      style={skinCssVars(spec) as CSSProperties}
      onPointerMove={interactive ? aim : undefined}
      onPointerLeave={interactive ? rest : undefined}
      onPointerCancel={interactive ? rest : undefined}
      onPointerUp={interactive ? (e) => (e.pointerType === "mouse" ? undefined : rest()) : undefined}
      onClick={canFlip ? toggle : undefined}
      onKeyDown={canFlip ? onKeyDown : undefined}
      role={canFlip ? "button" : undefined}
      tabIndex={canFlip ? 0 : undefined}
      aria-pressed={canFlip ? flipped : undefined}
    >
      {/* Retournable : le nom du bouton est ce texte, et les faces sont
          masquées (un `aria-label` contredisait tout le texte visible de la
          carte : label-content-name-mismatch, revue du tour 3). */}
      {canFlip ? <span className="e237-visually-hidden">{flipLabel}</span> : null}
      <div className="pcard-stage__flipper">
        <div className="pcard-stage__face" aria-hidden={canFlip || flipped || undefined}>
          {front}
        </div>
        {canFlip && backMounted ? (
          <div
            className="pcard-stage__face pcard-stage__face--back"
            aria-hidden
          >
            {back}
          </div>
        ) : null}
      </div>
      {interactive && shape.clipUnit ? (
        <svg className="pcard-stage__clip" width="0" height="0" aria-hidden focusable="false">
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={shape.clipUnit} />
          </clipPath>
        </svg>
      ) : null}
      {interactive ? (
        <span className="pcard-stage__holo" style={{ clipPath: holoClip }} aria-hidden />
      ) : null}
    </div>
  );
}
