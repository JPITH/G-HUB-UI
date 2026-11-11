/**
 * Chrome dashboard web (structure type Fragbet, hors betting).
 * Parité native : à suivre — layouts restent dans les apps.
 */
'use client';

import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { Icon } from '../icons/generated/web';

import { Avatar } from './avatar';
import { SearchField } from './fields';
import { Picture, localImageSet } from './picture';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** View Transition + flushSync pour que React committe le DOM dans le callback. */
function withViewTransition(update: () => void) {
  const doc = typeof document !== 'undefined' ? document : null;
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const apply = () => flushSync(update);
  if (!doc?.startViewTransition || reduce) {
    apply();
    return;
  }
  doc.startViewTransition(apply);
}

/* ------------------------------------------------------------------ */
/* GameRail                                                            */
/* ------------------------------------------------------------------ */

export interface GameRailItem {
  id: string;
  name: string;
  /** URL icône / logo jeu. */
  iconUrl?: string;
  status?: 'active' | 'coming_soon';
}

/** Nombre de top jeux dans la pilule ; au-delà → flèche + popup flottant. */
export const GAME_RAIL_MAX_VISIBLE = 6;

export interface GameRailProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  /**
   * Liste ordonnée par popularité (« top jeux » en tête).
   * Les `maxVisible` premiers s’affichent dans la pilule.
   */
  games: GameRailItem[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  /** Top jeux visibles (défaut 6). */
  maxVisible?: number;
  /** Contrôle externe du popup (sinon état interne). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Slot haut : actions (accueil, recherche globale…). */
  top?: ReactNode;
  /** Slot bas : déconnexion uniquement. */
  bottom?: ReactNode;
}

/**
 * Rail en trois sections : actions (haut), pilule de top jeux (milieu),
 * déconnexion (bas). Si plus de `maxVisible` jeux, une flèche ouvre un
 * **popup flottant** au-dessus du contenu (pas d’élargissement du rail).
 * Clic extérieur / Échap → referme.
 */
export function GameRail({
  games,
  activeId,
  onSelect,
  maxVisible = GAME_RAIL_MAX_VISIBLE,
  expanded: expandedProp,
  onExpandedChange,
  top,
  bottom,
  className,
  ...rest
}: GameRailProps) {
  const [expandedLocal, setExpandedLocal] = useState(false);
  const middleRef = useRef<HTMLDivElement>(null);
  const expanded = expandedProp ?? expandedLocal;

  function setExpanded(next: boolean) {
    withViewTransition(() => {
      if (expandedProp === undefined) setExpandedLocal(next);
      onExpandedChange?.(next);
    });
  }

  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setExpanded(false);
    }
    function onPointerDown(e: MouseEvent) {
      const root = middleRef.current;
      if (!root?.contains(e.target as Node)) setExpanded(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Images de jeu tombées : une icône cassée dans le rail est plus laide que
  // pas d'icône du tout, et `onError` est le seul signal fiable — l'URL peut
  // être parfaitement formée et le fichier absent.
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const hasMore = games.length > maxVisible;
  const topGames = games.slice(0, maxVisible);
  if (activeId) {
    const activeGame = games.find((g) => g.id === activeId);
    if (activeGame && !topGames.some((g) => g.id === activeGame.id)) {
      topGames[maxVisible - 1] = activeGame;
    }
  }

  return (
    <aside className={cx('e237-game-rail', className)} {...rest}>
      <div className="e237-game-rail__top">{top}</div>

      <div ref={middleRef} className="e237-game-rail__middle">
        {expanded ? (
          /* Même `view-transition-name` que la pilule : la pilule *devient*
             la carte (morph) et la recherche apparaît dedans. */
          <GamePicker
            className="e237-game-rail__pill e237-game-rail__pill--open"
            games={games}
            activeId={activeId}
            onSelect={(id) => {
              onSelect?.(id);
              setExpanded(false);
            }}
            onClose={() => setExpanded(false)}
          />
        ) : (
          <nav className="e237-game-rail__pill" aria-label="Jeux">
            <div className="e237-game-rail__games">
              {topGames.map((g) => {
                const coming = g.status === 'coming_soon';
                const active = g.id === activeId;
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={cx(
                      'e237-game-rail__btn',
                      active && 'e237-game-rail__btn--active',
                      coming && 'e237-game-rail__btn--soon',
                    )}
                    aria-label={coming ? `${g.name} (bientôt)` : g.name}
                    aria-current={active ? 'true' : undefined}
                    disabled={coming}
                    onClick={() => onSelect?.(g.id)}
                  >
                    {/* Info-bulle IMMÉDIATE (survol et focus clavier) : le
                        `title` natif n'apparaissait qu'après une seconde, et
                        cinq vignettes sans nom ne disaient pas ce que le rail
                        pilote (audit du 12/10/2026). */}
                    <span className="e237-game-rail__tip" aria-hidden>
                      <span className="e237-game-rail__tip-name">
                        {coming ? `${g.name} (bientôt)` : g.name}
                      </span>
                      {coming ? null : (
                        <span className="e237-game-rail__tip-hint">
                          {active
                            ? 'Ta discipline : carte, classement et accueil la suivent'
                            : 'Passer ta carte, le classement et l’accueil sur ce jeu'}
                        </span>
                      )}
                    </span>
                    {g.iconUrl && !broken[g.id] ? (
                      <Picture
                        src={g.iconUrl}
                        alt=""
                        className="e237-game-rail__icon"
                        onError={() =>
                          setBroken((prev) => ({ ...prev, [g.id]: true }))
                        }
                      />
                    ) : (
                      <span className="e237-game-rail__fallback" aria-hidden>
                        {g.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {hasMore ? (
              <button
                type="button"
                className="e237-game-rail__more"
                aria-label="Tous les jeux"
                title="Tous les jeux"
                aria-expanded={false}
                onClick={() => setExpanded(true)}
              >
                <Icon name='chevron-right' size={24} strokeWidth={2.75} />
              </button>
            ) : null}
          </nav>
        )}
      </div>

      <div className="e237-game-rail__bottom">{bottom}</div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* GamePicker — popup flottant « tous les jeux »                       */
/* ------------------------------------------------------------------ */

export interface GamePickerProps
  extends Omit<HTMLAttributes<HTMLElement>, 'onSelect' | 'title'> {
  games: GameRailItem[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onClose?: () => void;
  title?: ReactNode;
}

/** Carte flottante : recherche + liste complète des jeux. */
export function GamePicker({
  games,
  activeId,
  onSelect,
  onClose,
  title = 'Tous les jeux',
  className,
  ...rest
}: GamePickerProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const results = q
    ? games.filter((g) => g.name.toLowerCase().includes(q))
    : games;

  return (
    <div
      className={cx('e237-game-picker', className)}
      role="dialog"
      aria-label={typeof title === 'string' ? title : 'Tous les jeux'}
      {...rest}
    >
      <div className="e237-game-picker__head">
        <h3 className="e237-game-picker__title">{title}</h3>
        <button
          type="button"
          className="e237-game-picker__close"
          aria-label="Fermer"
          onClick={onClose}
        >
          <Icon name='x' size={16} />
        </button>
      </div>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Rechercher un jeu…"
        className="e237-game-picker__search"
        autoFocus
      />
      <div className="e237-game-picker__list">
        {results.length === 0 ? (
          <p className="e237-game-picker__empty">Aucun jeu trouvé.</p>
        ) : (
          results.map((g) => {
            const coming = g.status === 'coming_soon';
            return (
              <button
                key={g.id}
                type="button"
                disabled={coming}
                className={cx(
                  'e237-game-picker__item',
                  g.id === activeId && 'e237-game-picker__item--active',
                  coming && 'e237-game-picker__item--soon',
                )}
                onClick={() => onSelect?.(g.id)}
              >
                {g.iconUrl ? (
                  <Picture src={g.iconUrl} alt="" className="e237-game-picker__icon" />
                ) : (
                  <span className="e237-game-picker__icon" aria-hidden />
                )}
                <span className="e237-game-picker__name">{g.name}</span>
                {coming ? (
                  <span className="e237-game-picker__soon">Bientôt</span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DashboardHeader                                                     */
/* ------------------------------------------------------------------ */

export interface DashboardHeaderProps extends HTMLAttributes<HTMLElement> {
  logo?: ReactNode;
  nav?: ReactNode;
  actions?: ReactNode;
}

export function DashboardHeader({
  logo,
  nav,
  actions,
  className,
  ...rest
}: DashboardHeaderProps) {
  return (
    <header className={cx('e237-dash-header', className)} {...rest}>
      <div className="e237-dash-header__logo">{logo}</div>
      {nav ? <nav className="e237-dash-header__nav">{nav}</nav> : null}
      {actions ? <div className="e237-dash-header__actions">{actions}</div> : null}
    </header>
  );
}

export interface DashboardNavLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  href: string;
  active?: boolean;
  children: ReactNode;
}

/** Lien de nav header — l’app peut wrapper via `asChild` pattern ou styler Link. */
export function DashboardNavLink({
  href,
  active,
  className,
  children,
  ...rest
}: DashboardNavLinkProps) {
  return (
    <a
      href={href}
      className={cx(
        'e237-dash-nav-link',
        active && 'e237-dash-nav-link--active',
        className,
      )}
      aria-current={active ? 'page' : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* FeaturedHero                                                        */
/* ------------------------------------------------------------------ */

export interface FeaturedHeroProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  imageUrl?: string;
  cta?: ReactNode;
  /** Rangée basse (ex. logos équipes). */
  footer?: ReactNode;
}

export function FeaturedHero({
  title,
  subtitle,
  eyebrow,
  imageUrl,
  cta,
  footer,
  className,
  ...rest
}: FeaturedHeroProps) {
  const [broken, setBroken] = useState(false);
  // La source EFFECTIVE, pas un booléen : `showImage ? …` ne rétrécissait pas
  // `imageUrl` et `Picture` exige une source non nulle.
  const shownImage = broken ? undefined : imageUrl;

  useEffect(() => {
    setBroken(false);
  }, [imageUrl]);

  return (
    <section className={cx('e237-featured-hero', className)} {...rest}>
      {shownImage ? (
        <>
          <div
            className="e237-featured-hero__media"
            style={{ backgroundImage: localImageSet(shownImage) }}
            role="img"
            aria-hidden
          />
          {/*
            Détection d'échec de chargement (background-image ne déclenche pas
            onError). La sonde passe par `Picture` et NON par un <img> brut :
            sinon elle télécharge le PNG d'origine pendant que le fond charge
            l'AVIF, et le visuel le plus lourd de l'écran serait payé deux fois.
            Même composant des deux côtés = même URL retenue = une seule requête.
          */}
          <Picture
            src={shownImage}
            alt=""
            hidden
            onError={() => setBroken(true)}
          />
        </>
      ) : (
        <div
          className="e237-featured-hero__media e237-featured-hero__media--empty"
          aria-hidden
        />
      )}
      <div className="e237-featured-hero__veil" aria-hidden />
      <div className="e237-featured-hero__body">
        {eyebrow ? <p className="e237-featured-hero__eyebrow">{eyebrow}</p> : null}
        <h2 className="e237-featured-hero__title">{title}</h2>
        {subtitle ? <p className="e237-featured-hero__subtitle">{subtitle}</p> : null}
        {cta ? <div className="e237-featured-hero__cta">{cta}</div> : null}
      </div>
      {footer ? <div className="e237-featured-hero__footer">{footer}</div> : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MatchRow / MatchList                                                */
/* ------------------------------------------------------------------ */

export interface MatchSide {
  name: string;
  logoUrl?: string;
}

export interface MatchRowProps extends HTMLAttributes<HTMLElement> {
  timeLabel: ReactNode;
  sideA: MatchSide;
  sideB: MatchSide;
  format?: ReactNode;
  /** Statut / badge (droite). */
  meta?: ReactNode;
  /** Favori / action gauche. */
  leading?: ReactNode;
  href?: string;
}

export function MatchRow({
  timeLabel,
  sideA,
  sideB,
  format,
  meta,
  leading,
  href,
  className,
  ...rest
}: MatchRowProps) {
  const inner = (
    <>
      {leading ? <div className="e237-match-row__leading">{leading}</div> : null}
      <div className="e237-match-row__time">{timeLabel}</div>
      <div className="e237-match-row__sides">
        <MatchSideView side={sideA} />
        <span className="e237-match-row__vs" aria-hidden>
          vs
        </span>
        <MatchSideView side={sideB} align="end" />
      </div>
      {format ? <div className="e237-match-row__format">{format}</div> : null}
      {meta ? <div className="e237-match-row__meta">{meta}</div> : null}
    </>
  );

  if (href) {
    return (
      <a href={href} className={cx('e237-match-row', 'e237-match-row--link', className)} {...rest}>
        {inner}
      </a>
    );
  }

  return (
    <div className={cx('e237-match-row', className)} {...rest}>
      {inner}
    </div>
  );
}

function MatchSideView({
  side,
  align = 'start',
}: {
  side: MatchSide;
  align?: 'start' | 'end';
}) {
  return (
    <div className={cx('e237-match-side', align === 'end' && 'e237-match-side--end')}>
      <span className="e237-match-side__logo">
        <Avatar name={side.name} src={side.logoUrl} size="sm" />
      </span>
      <span className="e237-match-side__name">{side.name}</span>
    </div>
  );
}

export interface MatchListProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  /** Occupe l’espace restant (liste seule = longue ; deux listes = partagent). */
  fill?: boolean;
  /** Encadre le contenu dans une carte locale (sections détail). */
  inset?: boolean;
}

export function MatchList({
  title,
  headerRight,
  children,
  fill,
  inset,
  className,
  ...rest
}: MatchListProps) {
  return (
    <section
      className={cx('e237-match-list', fill && 'e237-match-list--fill', className)}
      {...rest}
    >
      {title || headerRight ? (
        <div className="e237-match-list__head">
          {title ? <h3 className="e237-match-list__title">{title}</h3> : <span />}
          {headerRight}
        </div>
      ) : null}
      <div
        className={cx('e237-match-list__body', inset && 'e237-match-list__body--inset')}
      >
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* EventRow — ligne d’événement à venir                                */
/* ------------------------------------------------------------------ */

export interface EventRowProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  timeLabel: ReactNode;
  eyebrow?: ReactNode;
  imageUrl?: string;
  meta?: ReactNode;
  href?: string;
}

export function EventRow({
  title,
  timeLabel,
  eyebrow,
  imageUrl,
  meta,
  href,
  className,
  ...rest
}: EventRowProps) {
  const [broken, setBroken] = useState(false);
  // La source EFFECTIVE, pas un booléen : `showImage ? …` ne rétrécissait pas
  // `imageUrl` et `Picture` exige une source non nulle.
  const shownImage = broken ? undefined : imageUrl;

  useEffect(() => {
    setBroken(false);
  }, [imageUrl]);

  const inner = (
    <>
      {shownImage ? (
        <Picture
          src={shownImage}
          alt=""
          loading="lazy"
          decoding="async"
          className="e237-event-row__thumb"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="e237-event-row__thumb e237-event-row__thumb--fallback" aria-hidden />
      )}
      <div className="e237-event-row__text">
        {eyebrow ? <span className="e237-event-row__eyebrow">{eyebrow}</span> : null}
        <span className="e237-event-row__title">{title}</span>
        <span className="e237-event-row__time">{timeLabel}</span>
      </div>
      {meta ? <div className="e237-event-row__meta">{meta}</div> : null}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={cx('e237-event-row', 'e237-event-row--link', className)}
        {...rest}
      >
        {inner}
      </a>
    );
  }

  return (
    <div className={cx('e237-event-row', className)} {...rest}>
      {inner}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RankRow — ligne de classement                                       */
/* ------------------------------------------------------------------ */

export interface RankRowProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  rank: number;
  name: ReactNode;
  /** Ligne secondaire (ville, jeux joués…). */
  subtitle?: ReactNode;
  avatarUrl?: string | null;
  /** Initiale de repli quand `name` n’est pas une chaîne (nom + badge vérifié…). */
  initial?: string;
  /** Valeur principale à droite (points, score…). */
  score: ReactNode;
  /** Libellé sous le score (« pts », « V / D »…). */
  scoreLabel?: ReactNode;
  /** Badge division / discipline. */
  meta?: ReactNode;
  /** Met la ligne en évidence (joueur courant, sélection). */
  active?: boolean;
  onSelect?: () => void;
}

/** Ligne de classement en pilule inset — même langage que MatchRow / EventRow. */
export function RankRow({
  rank,
  name,
  subtitle,
  avatarUrl,
  initial,
  score,
  scoreLabel,
  meta,
  active,
  onSelect,
  className,
  ...rest
}: RankRowProps) {
  const podium = rank <= 3;
  const inner = (
    <>
      <span
        className={cx(
          'e237-rank-row__rank',
          podium && `e237-rank-row__rank--${rank}`,
        )}
      >
        {rank}
      </span>
      <span className="e237-rank-row__avatar">
        <Avatar
          name={
            initial ??
            (typeof name === 'string' ? name : undefined) ??
            '?'
          }
          src={avatarUrl}
          size={32}
        />
      </span>
      <span className="e237-rank-row__text">
        <span className="e237-rank-row__name">{name}</span>
        {subtitle ? <span className="e237-rank-row__sub">{subtitle}</span> : null}
      </span>
      {meta ? <span className="e237-rank-row__meta">{meta}</span> : null}
      <span className="e237-rank-row__score">
        <span className="e237-rank-row__score-value">{score}</span>
        {scoreLabel ? (
          <span className="e237-rank-row__score-label">{scoreLabel}</span>
        ) : null}
      </span>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={cx(
          'e237-rank-row',
          'e237-rank-row--link',
          active && 'e237-rank-row--active',
          className,
        )}
        {...(rest as HTMLAttributes<HTMLButtonElement>)}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={cx('e237-rank-row', active && 'e237-rank-row--active', className)}
      {...rest}
    >
      {inner}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ContextPanel                                                        */
/* ------------------------------------------------------------------ */

export interface ContextPanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function ContextPanel({
  title,
  action,
  children,
  className,
  ...rest
}: ContextPanelProps) {
  return (
    <section className={cx('e237-context-panel', className)} {...rest}>
      {title || action ? (
        <div className="e237-context-panel__head">
          {/* h2 : la colonne passe souvent juste sous le h1 (au téléphone, avant le contenu). */}
          {title ? <h2 className="e237-context-panel__title">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      <div className="e237-context-panel__body">{children}</div>
    </section>
  );
}
