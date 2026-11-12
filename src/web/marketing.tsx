/**
 * Composants du site vitrine (`apps/marketing`, Astro).
 *
 * Contraintes propres à la vitrine, différentes du dashboard :
 *
 * 1. **Zéro JavaScript.** Ces composants sont rendus côté serveur par Astro
 *    sans directive `client:*` : aucun runtime React n'est envoyé au visiteur.
 *    Donc pas de `useState`, pas de `useEffect`, pas de gestionnaire d'événement.
 *    Les interactions se font en CSS (`:hover`, `:active`, `:focus-visible`) ou
 *    en HTML natif (`<details>` pour l'accordéon FAQ).
 * 2. **Icônes par nom.** Astro ne peut pas passer un élément React en prop
 *    depuis un `.astro` : les composants reçoivent un nom d'icône (`string`) et
 *    résolvent eux-mêmes le glyphe du jeu G-HUB. Cela permet aussi de décrire les
 *    sections dans de simples fichiers de données.
 * 3. **Relief neumorphique** composé uniquement des tokens `--e237-neu-*` —
 *    jamais de `box-shadow` littérale (cf. DESIGN.md).
 *
 * Les classes `.mkt-*` correspondantes vivent dans `src/theme/marketing.css`,
 * sauf `.mkt-rank*` (RankPreview, rendu aussi par l’accueil de l’app web) :
 * `src/theme/components.css`.
 */
import type { HTMLAttributes, ReactNode } from 'react';

import { BrandIcon, type BrandIconName } from './brand-icons';
import { AppMark } from './mark';
import { Picture } from './picture';
import { Icon } from '../icons/generated/web';
import { ICON_NAMES, type IconName as GhubIconName } from '../icons/names';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* Registre d'icônes — jeu G-HUB, jamais d'emoji (cf. DESIGN.md)      */
/* ------------------------------------------------------------------ */

/**
 * Noms historiques (ceux de Lucide, que les données de la vitrine
 * emploient) → icône du jeu G-HUB. La table de correspondance complète vit
 * dans `src/icons/README.md`.
 */
const GLYPHS = {
  ArrowRight: 'arrow-right',
  BadgeCheck: 'badge-check',
  BarChart3: 'bar-chart',
  Building2: 'building',
  CalendarCheck: 'calendar-check',
  CalendarDays: 'calendar',
  Camera: 'camera',
  Check: 'check',
  ChevronDown: 'chevron-down',
  ChevronLeft: 'chevron-left',
  ChevronRight: 'chevron-right',
  Clock: 'clock',
  Coins: 'coins',
  Crown: 'crown',
  EyeOff: 'eye-off',
  Gamepad2: 'gamepad',
  Gauge: 'gauge',
  Handshake: 'handshake',
  Info: 'info',
  Landmark: 'landmark',
  ListChecks: 'list-checks',
  Lock: 'lock',
  Mail: 'mail',
  MapPin: 'map-pin',
  Medal: 'medal',
  MonitorPlay: 'monitor-play',
  Newspaper: 'newspaper',
  Pause: 'pause',
  Percent: 'percent',
  Phone: 'phone',
  Play: 'play',
  Plus: 'plus',
  QrCode: 'qr-code',
  Radar: 'radar',
  ScrollText: 'scroll',
  Send: 'send',
  ShieldCheck: 'shield-check',
  Smartphone: 'smartphone',
  Sparkles: 'sparkles',
  Store: 'store',
  Swords: 'swords',
  Ticket: 'ticket',
  Timer: 'timer',
  TrendingUp: 'trending-up',
  Trophy: 'trophy',
  UserRound: 'user',
  Users: 'users',
  Video: 'video',
  Wallet: 'wallet',
  X: 'x',
  Zap: 'zap',
} as const satisfies Record<string, GhubIconName>;

import { BRAND_HOME_LABEL, BRAND_NAME_ACCENT, BRAND_NAME_REST } from '../lib/brand-name';

export type IconName = keyof typeof GLYPHS;

export interface GlyphProps {
  name?: string;
  size?: number;
  className?: string;
}

const GHUB_NAMES: ReadonlySet<string> = new Set(ICON_NAMES);

/**
 * Rend une icône du jeu G-HUB à partir de son nom : un nom historique du
 * registre (`Trophy`) ou directement un nom du jeu (`trophy`).
 * Nom inconnu ou absent → rien (pas de glyphe de repli hasardeux).
 */
export function Glyph({ name, size = 20, className }: GlyphProps) {
  if (!name) return null;
  const glyph: GhubIconName | undefined =
    GLYPHS[name as IconName] ?? (GHUB_NAMES.has(name) ? (name as GhubIconName) : undefined);
  if (!glyph) return null;
  return <Icon name={glyph} size={size} className={className} />;
}

/* ------------------------------------------------------------------ */
/* Marque                                                              */
/* ------------------------------------------------------------------ */

export interface BrandLogoProps {
  /** Cible du lien ; omis → rendu en simple `<span>` (footer). */
  href?: string;
  /**
   * Image de repli servie par l'app. **Omis par défaut, et c'est voulu** : le
   * signe est alors dessiné en SVG en ligne (`AppMark`), aux encres du thème.
   *
   * Servi en `<img>`, le fichier `mark.svg` perdait son monogramme en mode
   * sombre : son tracé « G/H » est en `currentColor`, et un SVG chargé comme
   * image n'hérite d'AUCUNE couleur de la page — il retombe sur le noir. Sur
   * fond nuit, il ne restait qu'un hexagone vert autour d'un trou (rapport
   * de corrections du 01/10/2026, §5.1).
   */
  src?: string;
  size?: number;
  /** Masque le mot-clé texte sous le seuil `sm` (header mobile). */
  compactWordmark?: boolean;
  className?: string;
}

/**
 * Signe + mot-symbole, aux MÊMES proportions dans l'en-tête et le pied de
 * page (36 px par défaut, les deux coquilles n'en passent pas d'autre).
 */
export function BrandLogo({
  href,
  src,
  size = 36,
  compactWordmark = false,
  className,
}: BrandLogoProps) {
  const inner = (
    <>
      {src ? (
        <Picture
          src={src}
          alt=""
          width={size}
          height={size}
          className="mkt-brand__img"
          style={{ width: size, height: size }}
          loading="eager"
          decoding="async"
        />
      ) : (
        <AppMark size={size} className="mkt-brand__img mkt-brand__mark" />
      )}
      <span className={cx('mkt-brand__word', compactWordmark && 'mkt-brand__word--compact')}>
        <span className="mkt-brand__accent">{BRAND_NAME_ACCENT}</span>
        {BRAND_NAME_REST}
      </span>
    </>
  );

  if (!href) {
    return <span className={cx('mkt-brand', className)}>{inner}</span>;
  }
  return (
    <a href={href} className={cx('mkt-brand', className)} aria-label={BRAND_HOME_LABEL}>
      {inner}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Titres de section                                                   */
/* ------------------------------------------------------------------ */

export interface SectionHeadProps {
  /** Sur-titre court en capitales (barre cyan ajoutée en CSS). */
  label?: string;
  title: ReactNode;
  lead?: ReactNode;
  /** `center` pour les sections pleine largeur. */
  align?: 'start' | 'center';
  /** Niveau de titre — `h1` réservé au hero. */
  as?: 'h1' | 'h2';
  className?: string;
}

export function SectionHead({
  label,
  title,
  lead,
  align = 'start',
  as: Tag = 'h2',
  className,
}: SectionHeadProps) {
  return (
    <header className={cx('mkt-head', align === 'center' && 'mkt-head--center', className)}>
      {label ? <span className="e237-section-label">{label}</span> : null}
      <Tag className="mkt-head__title">{title}</Tag>
      {lead ? <p className="mkt-head__lead">{lead}</p> : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Cartes de contenu                                                   */
/* ------------------------------------------------------------------ */

/* `title` est un nœud React ici, pas l'attribut HTML `title` (infobulle). */
export interface FeatureCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  icon?: string;
  title: ReactNode;
  text: ReactNode;
  /** Chiffre ou mention courte affichée en pied de carte. */
  extra?: ReactNode;
  /** Teinte du médaillon d'icône. */
  tone?: 'accent' | 'cyan' | 'gold';
  /** Rend la carte cliquable dans son ensemble. */
  href?: string;
}

/** Carte en relief : médaillon d'icône creusé, titre, texte, mention. */
export function FeatureCard({
  icon,
  title,
  text,
  extra,
  tone = 'accent',
  href,
  className,
  ...rest
}: FeatureCardProps) {
  const body = (
    <>
      {icon ? (
        <span className={cx('mkt-medallion', `mkt-medallion--${tone}`)}>
          <Glyph name={icon} size={20} />
        </span>
      ) : null}
      <h3 className="mkt-card__title">{title}</h3>
      <p className="mkt-card__text">{text}</p>
      {extra ? <span className="mkt-card__extra">{extra}</span> : null}
    </>
  );

  if (href) {
    return (
      <a href={href} className={cx('e237-card mkt-card mkt-card--link', className)}>
        {body}
        <span className="mkt-card__arrow" aria-hidden>
          <Icon name='arrow-right' size={16} />
        </span>
      </a>
    );
  }
  return (
    <article className={cx('e237-card mkt-card', className)} {...rest}>
      {body}
    </article>
  );
}

export interface StepCardProps {
  /** Rang affiché dans la pastille (1, 2, 3…). */
  step: number;
  icon?: string;
  title: ReactNode;
  text: ReactNode;
  className?: string;
}

/** Étape numérotée d'un parcours (« comment ça marche »). */
export function StepCard({ step, icon, title, text, className }: StepCardProps) {
  return (
    <article className={cx('e237-card mkt-step', className)}>
      <span className="mkt-step__num scoreboard" aria-hidden>
        {String(step).padStart(2, '0')}
      </span>
      <div className="mkt-step__body">
        <h3 className="mkt-card__title">
          {icon ? <Glyph name={icon} size={18} className="mkt-step__icon" /> : null}
          {title}
        </h3>
        <p className="mkt-card__text">{text}</p>
      </div>
    </article>
  );
}

export interface ProofLevelProps {
  /** Code du niveau : P1 → P4. */
  code: string;
  title: ReactNode;
  text: ReactNode;
  icon?: string;
  /** Remplissage de la jauge, de 1 à 4. */
  strength: number;
  className?: string;
}

/**
 * Échelon de preuve (P1 → P4). La jauge matérialise la force de la preuve :
 * piste creusée, segments remplis en relief.
 */
export function ProofLevel({ code, title, text, icon, strength, className }: ProofLevelProps) {
  return (
    <article className={cx('e237-card mkt-proof', className)}>
      <div className="mkt-proof__top">
        <span className="mkt-proof__code scoreboard">{code}</span>
        {icon ? (
          <span className="mkt-medallion mkt-medallion--cyan mkt-medallion--sm">
            <Glyph name={icon} size={16} />
          </span>
        ) : null}
      </div>
      <h3 className="mkt-card__title">{title}</h3>
      <p className="mkt-card__text">{text}</p>
      <div
        className="mkt-gauge"
        role="img"
        aria-label={`Niveau de preuve ${strength} sur 4`}
      >
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cx('mkt-gauge__seg', i <= strength && 'mkt-gauge__seg--on')} />
        ))}
      </div>
    </article>
  );
}

export interface AudienceCardProps {
  icon?: string;
  audience: ReactNode;
  title: ReactNode;
  text: ReactNode;
  bullets?: string[];
  ctaLabel?: string;
  ctaHref?: string;
  tone?: 'accent' | 'cyan' | 'gold';
  className?: string;
}

/** Panneau « pour qui » — joueur, salle partenaire, organisateur. */
export function AudienceCard({
  icon,
  audience,
  title,
  text,
  bullets = [],
  ctaLabel,
  ctaHref,
  tone = 'accent',
  className,
}: AudienceCardProps) {
  return (
    <article className={cx('e237-card mkt-audience', className)}>
      <span className={cx('mkt-medallion', `mkt-medallion--${tone}`)}>
        <Glyph name={icon} size={20} />
      </span>
      <span className="mkt-audience__tag">{audience}</span>
      <h3 className="mkt-card__title">{title}</h3>
      <p className="mkt-card__text">{text}</p>
      {bullets.length ? (
        <ul className="mkt-audience__list">
          {bullets.map((b) => (
            <li key={b}>
              <Icon name='badge-check' size={15} strokeWidth={2} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {ctaLabel && ctaHref ? (
        <a className="mkt-audience__cta" href={ctaHref}>
          {ctaLabel}
          <Icon name='arrow-right' size={15} />
        </a>
      ) : null}
    </article>
  );
}

export interface CircuitStep {
  title: string;
  text: string;
  icon?: string;
}

export interface CircuitTrackProps {
  steps: CircuitStep[];
  className?: string;
}

/**
 * Parcours en jetons posés dans une rainure — « du défi au point inscrit ».
 *
 * Grammaire de relief tenue sur toute la page : la piste est CREUSÉE
 * (enregistré, immuable), les jetons sont BOMBÉS (les étapes que l'on
 * traverse). Horizontal à partir de 1000 px, vertical en dessous : la rainure
 * bascule via `writing-mode` en CSS, sans média-query en JS.
 */
export function CircuitTrack({ steps, className }: CircuitTrackProps) {
  return (
    <ol className={cx('mkt-circuit', className)}>
      {steps.map((step, i) => (
        <li key={step.title} className="mkt-circuit__step">
          <span className="mkt-circuit__token scoreboard" aria-hidden>
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="mkt-circuit__body">
            <h3 className="mkt-circuit__title">
              {step.icon ? <Glyph name={step.icon} size={16} /> : null}
              {step.title}
            </h3>
            <p className="mkt-card__text">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface NoteCardProps {
  icon?: string;
  title: ReactNode;
  text: ReactNode;
  /** `limit` pour les limites assumées, `info` pour une précision neutre. */
  tone?: 'info' | 'limit';
  className?: string;
}

/**
 * Encart d'honnêteté : ce que le produit ne fait pas (encore).
 *
 * Volontairement CREUSÉ, pas bombé — ce n'est pas une action, c'est une règle
 * gravée. Sert à annoncer les limites de la bêta plutôt qu'à les taire.
 */
export function NoteCard({ icon, title, text, tone = 'info', className }: NoteCardProps) {
  return (
    <div className={cx('mkt-note', tone === 'limit' && 'mkt-note--limit', className)}>
      <span className="mkt-note__icon">
        <Glyph name={icon ?? 'Info'} size={16} />
      </span>
      <div>
        <strong className="mkt-note__title">{title}</strong>
        <p className="mkt-note__text">{text}</p>
      </div>
    </div>
  );
}

export interface RankLine {
  rank: number;
  username: string;
  city: string;
  division: string;
}

export interface RankPreviewProps {
  lines: RankLine[];
  /** Ligne fantôme finale : « ta place est encore libre ». */
  ghostLabel?: string;
  className?: string;
}

/**
 * Extrait de classement — lignes en pilules creusées (motif `.e237-rank-row`
 * du dashboard, transposé sans dépendance aux données).
 *
 * `ghostLabel` ajoute une ligne en pointillés : la place du visiteur.
 */
export function RankPreview({ lines, ghostLabel, className }: RankPreviewProps) {
  return (
    <div className={cx('mkt-rank', className)}>
      {lines.map((line) => (
        <div key={line.username} className="mkt-rank__row">
          <span
            className={cx('mkt-rank__pos', line.rank <= 3 && `mkt-rank__pos--${line.rank}`)}
          >
            {line.rank}
          </span>
          <span className="mkt-rank__name">{line.username}</span>
          <span className="mkt-rank__city">{line.city}</span>
          <span className="mkt-rank__div">{line.division}</span>
        </div>
      ))}
      {ghostLabel ? (
        <div className="mkt-rank__row mkt-rank__row--ghost">
          <span className="mkt-rank__pos">?</span>
          <span className="mkt-rank__name">{ghostLabel}</span>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Chiffres                                                            */
/* ------------------------------------------------------------------ */

export interface StatBandItem {
  value: string;
  label: string;
  icon?: string;
}

export interface StatBandProps {
  items: StatBandItem[];
  className?: string;
}

/** Bandeau de chiffres — piste creusée, tuiles en relief. */
export function StatBand({ items, className }: StatBandProps) {
  return (
    <div className={cx('mkt-statband', className)}>
      {items.map((item) => (
        <div key={item.label} className="mkt-statband__item">
          {item.icon ? (
            <span className="mkt-statband__icon">
              <Glyph name={item.icon} size={18} />
            </span>
          ) : null}
          <strong className="mkt-statband__value scoreboard">{item.value}</strong>
          <span className="mkt-statband__label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ — accordéon natif, sans JavaScript                              */
/* ------------------------------------------------------------------ */

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface FaqAccordionProps {
  items: FaqEntry[];
  /** Ouvre la première question (utile sur l'extrait de la landing). */
  openFirst?: boolean;
  /**
   * Regroupe les `<details>` : n'en laisse qu'un ouvert à la fois.
   * Fonctionne sans JS (attribut `name`, natif sur les navigateurs récents).
   */
  exclusiveName?: string;
  className?: string;
}

export function FaqAccordion({
  items,
  openFirst = false,
  exclusiveName,
  className,
}: FaqAccordionProps) {
  return (
    <div className={cx('mkt-faq', className)}>
      {items.map((item, i) => (
        <details
          key={item.question}
          className="mkt-faq__item"
          name={exclusiveName}
          open={openFirst && i === 0}
        >
          <summary className="mkt-faq__q">
            <span>{item.question}</span>
            <Icon name='chevron-down' size={18} className="mkt-faq__chevron" />
          </summary>
          <div className="mkt-faq__a">
            <p>{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Appel à l'action                                                    */
/* ------------------------------------------------------------------ */

export interface CtaBandProps {
  label?: string;
  title: ReactNode;
  text?: ReactNode;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Mention discrète sous les boutons (ex. « Gratuit pendant la bêta »). */
  note?: ReactNode;
  className?: string;
}

export function CtaBand({
  label,
  title,
  text,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  note,
  className,
}: CtaBandProps) {
  return (
    <section className={cx('mkt-cta', className)}>
      <div className="mkt-cta__inner">
        {label ? <span className="e237-section-label">{label}</span> : null}
        <h2 className="mkt-cta__title">{title}</h2>
        {text ? <p className="mkt-cta__text">{text}</p> : null}
        <div className="mkt-cta__actions">
          <a className="btn btn--primary btn--lg" href={primaryHref}>
            {primaryLabel}
            <Icon name='arrow-right' size={18} />
          </a>
          {secondaryLabel && secondaryHref ? (
            <a className="btn btn--secondary btn--lg" href={secondaryHref}>
              {secondaryLabel}
            </a>
          ) : null}
        </div>
        {note ? <p className="mkt-cta__note">{note}</p> : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Chrome — en-tête et pied de page                                    */
/* ------------------------------------------------------------------ */

export interface MarketingNavItem {
  label: string;
  href: string;
}

export interface MarketingHeaderProps {
  navItems: MarketingNavItem[];
  /**
   * Liens de second rang, montrés seulement dans le menu du téléphone, sous
   * la navigation principale (« Comment ça marche », « Contact »…).
   */
  menuItems?: MarketingNavItem[];
  ctaLabel: string;
  ctaHref: string;
  /** Chemin courant (`Astro.url.pathname`) pour marquer le lien actif. */
  currentPath?: string;
  logoSrc?: string;
  className?: string;
}

/**
 * En-tête collant, fondu dans la page : aucun fond ni séparateur, seuls les
 * éléments portent le relief (règle « barre du haut » de DESIGN.md).
 *
 * Le bouton de thème est rendu ici mais câblé par le script inline de
 * `Base.astro` (via son `id`) : aucun îlot React n'est hydraté.
 */
export function MarketingHeader({
  navItems,
  menuItems = [],
  ctaLabel,
  ctaHref,
  currentPath = '/',
  logoSrc,
  className,
}: MarketingHeaderProps) {
  const isActive = (href: string) =>
    href === '/' ? currentPath === '/' : currentPath.startsWith(href);

  return (
    <header className={cx('mkt-header', className)}>
      <div className="mkt-header__inner">
        <BrandLogo href="/" src={logoSrc} compactWordmark />

        <nav className="mkt-nav" aria-label="Navigation principale">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cx('mkt-nav__link', isActive(item.href) && 'mkt-nav__link--on')}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mkt-header__actions">
          {/*
            Soleil en thème clair, lune en sombre : l'icône dit le thème
            ACTUEL, et se transforme de l'un à l'autre (cœur qui grossit,
            croissant qui mord, rayons qui rentrent). L'état est lu en CSS
            seul — `data-theme` sur <html>, ou la préférence système quand
            il est absent — donc juste dès la première peinture.
            Le clic (et la View Transition circulaire) est câblé par l'app.
          */}
          <button
            id="theme-toggle"
            type="button"
            className="mkt-themetoggle"
            title="Changer de thème"
            aria-label="Changer de thème"
          >
            <svg viewBox="0 0 24 24" className="mkt-themetoggle__icon" aria-hidden focusable="false">
              <mask id="mkt-themetoggle-bite">
                <rect x="0" y="0" width="24" height="24" fill="#fff" />
                <circle className="mkt-themetoggle__bite" cx="24" cy="6" r="7" fill="#000" />
              </mask>
              <circle
                className="mkt-themetoggle__core"
                cx="12"
                cy="12"
                r="5"
                fill="currentColor"
                mask="url(#mkt-themetoggle-bite)"
              />
              <g
                className="mkt-themetoggle__rays"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="12" y1="1.5" x2="12" y2="3.5" />
                <line x1="12" y1="20.5" x2="12" y2="22.5" />
                <line x1="1.5" y1="12" x2="3.5" y2="12" />
                <line x1="20.5" y1="12" x2="22.5" y2="12" />
                <line x1="4.6" y1="4.6" x2="6" y2="6" />
                <line x1="18" y1="18" x2="19.4" y2="19.4" />
                <line x1="4.6" y1="19.4" x2="6" y2="18" />
                <line x1="18" y1="6" x2="19.4" y2="4.6" />
              </g>
            </svg>
          </button>
          <a className="btn btn--primary btn--sm mkt-header__cta" href={ctaHref}>
            {ctaLabel}
          </a>
          {/*
            Menu du téléphone et de la tablette — sous 1 080 px, la pilule de
            navigation disparaît : sans ce bouton, un visiteur sur téléphone
            n'avait AUCUN moyen d'atteindre le classement ou les tournois
            (retour du 01/10/2026). API Popover native : aucun script, Échap
            et le toucher hors du panneau le referment.
          */}
          <button
            type="button"
            className="mkt-menubtn"
            popoverTarget="mkt-menu"
            aria-label="Ouvrir le menu"
          >
            <Icon name='menu' size={22} />
          </button>
        </div>
      </div>

      <div id="mkt-menu" popover="auto" className="mkt-menu">
        <div className="mkt-menu__top">
          <BrandLogo href="/" src={logoSrc} compactWordmark />
          <button
            type="button"
            className="mkt-menu__close"
            popoverTarget="mkt-menu"
            popoverTargetAction="hide"
            aria-label="Fermer le menu"
          >
            <Icon name='x' size={22} />
          </button>
        </div>
        <nav className="mkt-menu__nav" aria-label="Menu">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cx('mkt-menu__link', isActive(item.href) && 'mkt-menu__link--on')}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {menuItems.length ? (
          <nav className="mkt-menu__more" aria-label="Plus de liens">
            {menuItems.map((item) => (
              <a key={item.href} href={item.href} className="mkt-menu__sublink">
                {item.label}
              </a>
            ))}
          </nav>
        ) : null}
        <a className="btn btn--primary btn--lg btn--block mkt-menu__cta" href={ctaHref}>
          {ctaLabel}
        </a>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Boutons des stores                                                  */
/* ------------------------------------------------------------------ */

export type StoreId = 'appstore' | 'googleplay';

const STORE_COPY: Record<StoreId, { icon: BrandIconName; kicker: string; name: string }> = {
  appstore: { icon: 'apple', kicker: 'Télécharger dans', name: "l'App Store" },
  googleplay: { icon: 'googleplay', kicker: 'Disponible sur', name: 'Google Play' },
};

export interface StoreBadgeProps {
  store: StoreId;
  /**
   * Lien de la fiche. **Absent = pas encore publiée** : le bouton est rendu
   * inerte, marqué « Bientôt », et n'est pas un lien. Un badge cliquable qui
   * mène nulle part coûte plus cher qu'un badge qui dit la vérité (rapport du
   * 01/10/2026, §6 : « tous les CTA mènent vers une action disponible »).
   */
  href?: string;
  /** Mention du badge inerte. */
  soonLabel?: string;
  className?: string;
}

/**
 * Bouton de store maison — inversé sur le thème (encre forte en fond, fond de
 * page en texte) : noir en clair, blanc en sombre, comme les badges officiels.
 *
 * Pas le badge officiel en image : il n'existe qu'en noir ou blanc figés, et
 * l'image d'Apple n'est pas atteignable depuis la chaîne de build.
 */
export function StoreBadge({ store, href, soonLabel = 'Bientôt', className }: StoreBadgeProps) {
  const copy = STORE_COPY[store];
  const body = (
    <>
      <BrandIcon name={copy.icon} size={22} className="mkt-store__icon" />
      <span className="mkt-store__text">
        <span className="mkt-store__kicker">{copy.kicker}</span>
        <span className="mkt-store__name">{copy.name}</span>
      </span>
    </>
  );
  if (!href) {
    return (
      <span
        className={cx('mkt-store mkt-store--soon', className)}
        aria-label={`${copy.kicker} ${copy.name} (${soonLabel.toLowerCase()})`}
        data-store={store}
      >
        {body}
        <span className="mkt-store__soon" aria-hidden>
          {soonLabel}
        </span>
      </span>
    );
  }
  return (
    <a
      className={cx('mkt-store', className)}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-store={store}
    >
      {body}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Pied de page                                                        */
/* ------------------------------------------------------------------ */

export interface MarketingFooterLink {
  label: string;
  /** Absent → rubrique annoncée mais pas encore en ligne (« Bientôt »). */
  href?: string;
  /** Lien hors du site vitrine (dashboard, mail) : nouvel onglet. */
  external?: boolean;
}

export interface MarketingFooterColumn {
  title: string;
  links: MarketingFooterLink[];
}

export interface MarketingSocialLink {
  network: BrandIconName;
  /** Nom affiché à l'infobulle et lu par les lecteurs d'écran. */
  label: string;
  /** Absent → compte pas encore ouvert : pastille inerte « Bientôt ». */
  href?: string;
}

export interface MarketingStoreLink {
  store: StoreId;
  href?: string;
}

export interface MarketingFooterProps {
  columns: MarketingFooterColumn[];
  /** Ligne légale, sous le séparateur. */
  legal?: ReactNode;
  /** Image de repli du signe ; omis = SVG aux encres du thème (défaut). */
  logoSrc?: string;
  /** Phrase d'identité sous le logo. */
  tagline?: ReactNode;
  socials?: MarketingSocialLink[];
  stores?: MarketingStoreLink[];
  /** Titre et texte du bandeau « télécharger l'app » en tête du pied. */
  appTitle?: ReactNode;
  appText?: ReactNode;
  className?: string;
}

/**
 * Pied de page complet : bandeau des stores, identité + réseaux, quatre
 * colonnes, ligne légale, retour en haut et grand mot-symbole.
 *
 * Rendu statique comme le reste de la vitrine. Ce qui bouge — projecteur qui
 * suit le pointeur sur le mot-symbole, anneau de défilement du bouton « haut
 * de page », aimantation des réseaux — est posé par le script de l'app sur
 * les attributs `data-footer-*` ; sans lui, tout reste lisible et cliquable.
 */
export function MarketingFooter({
  columns,
  legal,
  logoSrc,
  tagline = 'Chaque match construit une carrière.',
  socials = [],
  stores = [],
  appTitle,
  appText,
  className,
}: MarketingFooterProps) {
  const anySocial = socials.some((s) => s.href);
  return (
    <footer className={cx('mkt-footer', className)} data-footer>
      <div className="mkt-footer__shell">
        {stores.length ? (
          <div className="mkt-footer__app" data-reveal>
            <div className="mkt-footer__app-copy">
              <span className="mkt-footer__app-icon">
                <Icon name='smartphone' size={20} strokeWidth={1.75} />
              </span>
              <div>
                <p className="mkt-footer__app-title">{appTitle ?? "L'app G-HUB, dans ta poche."}</p>
                {appText ? <p className="mkt-footer__app-text">{appText}</p> : null}
              </div>
            </div>
            <div className="mkt-footer__stores">
              {stores.map((s) => (
                <StoreBadge key={s.store} store={s.store} href={s.href} />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mkt-footer__inner">
          <div className="mkt-footer__brand">
            <BrandLogo src={logoSrc} />
            <p className="mkt-footer__slogan">{tagline}</p>
            <p className="mkt-footer__place">
              <Icon name='map-pin' size={14} strokeWidth={2} />
              <span>Yaoundé · Douala · Cameroun</span>
            </p>
            {socials.length ? (
              <div className="mkt-footer__social">
                <span className="mkt-footer__coltitle">Suis G-HUB</span>
                <ul className="mkt-footer__socials" aria-label="Réseaux sociaux">
                  {socials.map((s) => (
                    <li key={s.network}>
                      {s.href ? (
                        <a
                          className="mkt-social"
                          href={s.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={s.label}
                          data-tip={s.label}
                          data-footer-magnet
                        >
                          <BrandIcon name={s.network} size={18} />
                        </a>
                      ) : (
                        <span
                          className="mkt-social mkt-social--soon"
                          role="img"
                          aria-label={`${s.label} (bientôt)`}
                          data-tip={`${s.label} · bientôt`}
                        >
                          <BrandIcon name={s.network} size={18} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {anySocial ? null : (
                  <span className="mkt-footer__hint">Comptes officiels bientôt en ligne.</span>
                )}
              </div>
            ) : null}
          </div>

          {/*
            Toujours dépliées, sur téléphone aussi (retour du 01/10/2026 :
            repliées en accordéon, les quatre colonnes ne montraient que
            quatre titres, et le pied de page passait pour « trop simple »).
            Deux colonnes sur téléphone, quatre au large.
          */}
          <div className="mkt-footer__cols">
            {columns.map((col) => (
              <div key={col.title} className="mkt-footer__col">
                <h2 className="mkt-footer__coltitle">{col.title}</h2>
                <nav className="mkt-footer__links" aria-label={col.title}>
                {col.links.map((link) =>
                  link.href ? (
                    <a
                      key={link.label}
                      href={link.href}
                      className="mkt-footer__link"
                      {...(link.external ? { target: '_blank', rel: 'noopener' } : {})}
                    >
                      <span>{link.label}</span>
                      <Icon name='arrow-right' size={13} className="mkt-footer__link-arrow" />
                    </a>
                  ) : (
                    <span key={link.label} className="mkt-footer__link mkt-footer__link--soon">
                      <span>{link.label}</span>
                      <span className="mkt-footer__soon">Bientôt</span>
                    </span>
                  ),
                )}
                </nav>
              </div>
            ))}
          </div>
        </div>

        <div className="mkt-footer__legal">
          <span>{legal}</span>
          {/*
            L'emplacement garde sa place dans la ligne légale : le bouton peut
            s'en DÉTACHER (il flotte en bas à droite une fois la page bien
            entamée) puis y RENTRER quand le pied de page arrive à l'écran —
            comportement posé par l'app (`data-footer-top-slot`). Sans script,
            il reste simplement ici.
          */}
          <span className="mkt-footer__top-slot" data-footer-top-slot>
            <a className="mkt-footer__top" href="#" data-footer-top aria-label="Revenir en haut de la page">
              <svg viewBox="0 0 44 44" className="mkt-footer__top-ring" aria-hidden focusable="false">
                <circle cx="22" cy="22" r="20" pathLength={1} className="mkt-footer__top-track" />
                <circle cx="22" cy="22" r="20" pathLength={1} className="mkt-footer__top-progress" data-footer-progress />
              </svg>
              <Icon name='arrow-up' size={16} strokeWidth={2.25} />
            </a>
          </span>
        </div>
      </div>

      {/*
        Mot-symbole géant, décoratif : le nom est déjà porté par le logo.

        En SVG, pas en texte CSS masqué : la première version (texte HTML +
        `mask-image` dont le centre était une propriété animée en continu)
        était repeinte à chaque image, et Chrome la rastérisait en basse
        résolution pendant l'animation — le mot paraissait pixelisé. Ici le
        contour est un trait vectoriel (`vector-effect: non-scaling-stroke`,
        1,5 px à toute taille) et le projecteur un dégradé radial SVG dont
        l'app déplace le centre (`data-footer-spot`) : rien n'est rastérisé.
        `textLength` cale le mot sur toute la largeur quelle que soit la
        police chargée ; le `viewBox` (206 de haut, ligne de base à 222)
        rogne le pied des lettres — le mot « sort » de la page sans déborder
        du pied de page.
      */}
      <div className="mkt-footer__giant" aria-hidden data-footer-giant>
        <svg
          className="mkt-footer__giant-svg"
          viewBox="0 0 1000 206"
          preserveAspectRatio="xMidYMax meet"
          focusable="false"
        >
          <defs>
            <radialGradient
              id="mkt-footer-spot"
              gradientUnits="userSpaceOnUse"
              cx="500"
              cy="150"
              r="230"
              data-footer-spot
            >
              <stop offset="0" className="mkt-footer__spot-stop" />
              <stop offset="1" className="mkt-footer__spot-stop mkt-footer__spot-stop--end" />
            </radialGradient>
          </defs>
          <text
            x="500"
            y="222"
            textAnchor="middle"
            textLength="980"
            lengthAdjust="spacingAndGlyphs"
            className="mkt-footer__giant-outline"
          >
            <tspan className="mkt-footer__giant-g">{BRAND_NAME_ACCENT}</tspan>
            {BRAND_NAME_REST}
          </text>
          <text
            x="500"
            y="222"
            textAnchor="middle"
            textLength="980"
            lengthAdjust="spacingAndGlyphs"
            className="mkt-footer__giant-fill"
          >
            {BRAND_NAME_ACCENT}
            {BRAND_NAME_REST}
          </text>
        </svg>
      </div>
    </footer>
  );
}
