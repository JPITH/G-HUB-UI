import type { CSSProperties } from "react";

/**
 * Pilule de division — affiche le RANG (« DIV 1 », « DIV 3 ») et non le nom
 * de la division (décision porteur : « Challenger » ne dit pas au joueur où
 * il se situe). Le nom reste porté par `aria-label` / `title` : l'information
 * n'est pas perdue pour les lecteurs d'écran ni au survol.
 */
export interface DivisionBadgeProps {
  /**
   * PALIER affiché — 1 = la division la plus haute.
   *
   * ⚠️ Ce n'est PAS `divisions.rank` en base, qui va dans l'autre sens (le
   * plus grand est le plus haut, c'est lui qui décide d'une promotion). Le
   * palier est calculé par l'API, qui seule connaît la liste complète des
   * divisions d'un jeu ; passer `divisionDisplayRank(division)` plutôt que le
   * grade brut, sinon la pilule affiche le classement à l'envers.
   */
  rank: number;
  /** Nom complet de la division (« Élite », « Challenger »…) — accessibilité. */
  name?: string;
  /** Couleur de la division fournie par le back-office (hex). */
  color?: string | null;
  /**
   * Classes supplémentaires. Passer `pcard__division` depuis la carte joueur :
   * `components.css` est chargé après `theme.css`, ses règles gagnent donc et
   * le cadre de la carte reste strictement identique.
   */
  className?: string;
  style?: CSSProperties;
}

/** Libellé court affiché dans la pilule. */
export function divisionLabel(rank: number): string {
  return `DIV ${rank}`;
}

/** Libellé long, lu par les lecteurs d'écran (garde le nom de la division). */
export function divisionAccessibleLabel(rank: number, name?: string): string {
  return name && name !== `Division ${rank}` ? `Division ${rank} : ${name}` : `Division ${rank}`;
}

export function DivisionBadge({
  rank,
  name,
  color,
  className = "",
  style,
}: DivisionBadgeProps) {
  const full = divisionAccessibleLabel(rank, name);
  // La teinte passe par une variable CSS : le fond/liseré restent pilotés par
  // la feuille de style (color-mix), donc pas d'inline qui écraserait le skin.
  const toned = color
    ? ({ ...style, color, "--e237-div-tone": color } as CSSProperties)
    : style;

  return (
    <span
      className={`e237-divbadge${color ? " e237-divbadge--toned" : ""} ${className}`.trim()}
      role="img"
      aria-label={full}
      title={full}
      style={toned}
    >
      {divisionLabel(rank)}
    </span>
  );
}
