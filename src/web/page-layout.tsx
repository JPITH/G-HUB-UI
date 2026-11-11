"use client";

/**
 * Briques de page du web — refonte du lot R (09/10/2026).
 *
 * La demande du porteur, mot pour mot : « là où il y a le titre les actions
 * doivent être sur la mm row, ce sont seulement les alerts qui doivent
 * s'afficher en haut avec une croix ; bcp d'espace vide sur l'app web à
 * combler ». D'où quatre règles, que ces briques rendent impossibles à
 * enfreindre par mégarde :
 *
 *  1. `PageHeader` — UNE rangée : retour, titre (méta discrète dessous),
 *     actions à droite. Au téléphone, les actions secondaires passent dans
 *     « … » et la principale reste sur la rangée.
 *  2. Pas de surtitre (« Mon espace » au-dessus de « Profil ») : l'ancienne
 *     prop `section` est encore ACCEPTÉE (compatibilité) mais n'est plus
 *     affichée.
 *  3. `PageAlerts` + `AlertBanner` — seules les alertes passent au-dessus du
 *     contenu, fermables (×), mémorisées par identifiant ET par contenu.
 *  4. `PageLayout` — UN conteneur de page pour tout le web (même largeur
 *     maximale, mêmes gouttières, même comportement aux petites largeurs) et
 *     une colonne latérale utile à partir de 1 280 px, une troisième zone à
 *     gauche à partir de 1 440 px.
 *
 * Références Mobbin retenues (docs/refonte-web.md, « Briques ») : Shopify
 * « Pages » (titre + action sur la même rangée, bandeau d'alerte dessous),
 * Square « Purchase funnel » (bandeau fermable par ×), Perplexity
 * « Discover » (encart de personnalisation fermable, colonne de droite),
 * Higgsfield « Community feed » (trois zones).
 */

import {
  createContext,
  isValidElement,
  useContext,
  useState,
  useSyncExternalStore,
  type ElementType,
  type ReactNode,
} from "react";

import { Icon } from "../icons/generated/web";
import type { IconName } from "../icons/names";
import { useDsT } from "../i18n/hooks";
import {
  ALERT_DISMISSAL_KEY,
  alertSignature,
  alertVisible,
  readDismissed,
  rememberAlertByDefault,
  withDismissed,
  writeDismissed,
  type AlertStorage,
  type DismissedAlerts,
} from "../lib/alert-dismissal";
import { LinkButton, type LinkButtonProps } from "./button";
import { DropdownMenu, MenuItem } from "./menu";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Lien du routeur                                                     */
/* ------------------------------------------------------------------ */

/**
 * Le composant de lien de l'application (`next/link` sur le web). Le design
 * system ne dépend d'aucun routeur : l'application le fournit UNE fois
 * (`<DsLinkProvider component={Link}>` dans son cadre) et les briques qui
 * naviguent — retour de l'en-tête, actions « … », navigation des réglages —
 * l'utilisent. Sans fournisseur, un `<a>` ordinaire.
 */
const DsLinkContext = createContext<ElementType>("a");

export function DsLinkProvider({
  component,
  children,
}: {
  component: ElementType;
  children: ReactNode;
}) {
  return <DsLinkContext.Provider value={component}>{children}</DsLinkContext.Provider>;
}

/** Le lien fourni par l'application (ou `<a>`), surchargé au besoin par `linkAs`. */
export function useDsLink(override?: ElementType): ElementType {
  const fromContext = useContext(DsLinkContext);
  return override ?? fromContext;
}

export type ButtonLinkProps = Omit<LinkButtonProps, "as"> & {
  href: string;
  /** Lien du routeur, si l'application n'a pas posé de `DsLinkProvider`. */
  linkAs?: ElementType;
};

/**
 * Un LIEN qui a l'air d'un bouton — les variantes et tailles de `Button`,
 * la navigation du routeur de l'application (`DsLinkProvider`). Remplace les
 * `<Link className="btn btn--…">` écrits à la main et les `<Link><Button>`
 * (un bouton dans un lien : deux cibles imbriquées pour le clavier). Lot R,
 * 09/10/2026 (audit RA, C7).
 */
export function ButtonLink({ linkAs, ...rest }: ButtonLinkProps) {
  const Link = useDsLink(linkAs);
  return <LinkButton as={Link} {...rest} />;
}

/* ------------------------------------------------------------------ */
/* PageHeader                                                          */
/* ------------------------------------------------------------------ */

/** Une action secondaire de l'en-tête : bouton discret au large, ligne de « … » au téléphone. */
export interface PageHeaderAction {
  label: string;
  icon?: IconName;
  /** Navigation (lien du routeur) — sinon `onClick`. */
  href?: string;
  onClick?: () => void;
  /** `danger` : une action destructive (rouge, jamais l'accent). */
  tone?: "default" | "danger";
  disabled?: boolean;
}

export interface PageHeaderProps {
  title: ReactNode;
  /** Méta discrète SOUS le titre (une ligne : ville, date, compteur). Jamais un paragraphe. */
  subtitle?: ReactNode;
  /** Retour, à GAUCHE du titre, sur la même rangée. Le libellé sert d'info-bulle et de nom accessible. */
  back?: { href: string; label: string };
  /**
   * Action(s) PRINCIPALE(S) — toujours sur la rangée, à droite, à toutes les
   * largeurs. Une seule en général (UX.md : une action principale par écran).
   */
  actions?: ReactNode;
  /**
   * Actions SECONDAIRES : boutons discrets à côté de la principale au large,
   * regroupées dans un menu « … » au téléphone (< 640 px).
   */
  more?: PageHeaderAction[];
  /** À côté du titre, sur sa ligne : une pastille de statut, une marque « vérifié ». */
  meta?: ReactNode;
  /** Niveau du titre : `h1` (défaut) pour une page, `h2` dans un panneau. */
  level?: "h1" | "h2";
  /** Lien du routeur, si l'application n'a pas posé de `DsLinkProvider`. */
  linkAs?: ElementType;
  className?: string;
  /** @deprecated Surtitre — n'est plus affiché (règle 2 : pas de surtitre redondant). */
  section?: string;
  /** @deprecated Utiliser `back={{ href, label }}`. */
  backHref?: string;
  /** @deprecated Utiliser `back={{ href, label }}`. */
  backLabel?: string;
  /** @deprecated Utiliser `actions`. Rendu comme des actions principales. */
  children?: ReactNode;
}

/**
 * En-tête de page — la rangée unique de la règle 1.
 *
 * ```
 * [←]  Titre  [méta]                      [secondaire] [secondaire] [Principale]
 *      sous-titre discret
 * ```
 *
 * Le titre se tronque (avec son texte complet en info-bulle) plutôt que de
 * pousser les actions sous lui : sur desktop, les actions ne tombent jamais.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  more,
  meta,
  level = "h1",
  linkAs,
  className,
  backHref,
  backLabel,
  children,
}: PageHeaderProps) {
  const t = useDsT();
  const Link = useDsLink(linkAs);
  const Heading = level;
  const resolvedBack = back ?? (backHref ? { href: backHref, label: backLabel ?? t("ui.page.back") } : null);
  const primary = actions ?? children;
  const secondary = (more ?? []).filter(Boolean);
  const hasActions = primary != null || secondary.length > 0;

  return (
    <header className={cx("e237-page-header", className)}>
      {resolvedBack ? (
        <Link
          href={resolvedBack.href}
          className="e237-page-header__back"
          aria-label={resolvedBack.label}
          title={resolvedBack.label}
        >
          <Icon name="arrow-left" size={20} />
        </Link>
      ) : null}

      <div className="e237-page-header__text">
        <div className="e237-page-header__title-row">
          <Heading
            className="e237-page-header__title"
            title={typeof title === "string" ? title : undefined}
          >
            {title}
          </Heading>
          {meta != null ? <span className="e237-page-header__meta">{meta}</span> : null}
        </div>
        {subtitle != null ? <p className="e237-page-header__subtitle">{subtitle}</p> : null}
      </div>

      {hasActions ? (
        <div className="e237-page-header__actions">
          {secondary.length > 0 ? (
            <>
              <span className="e237-page-header__more-inline">
                {secondary.map((a) =>
                  a.href && !a.disabled ? (
                    <Link
                      key={a.label}
                      href={a.href}
                      className={cx("btn btn--ghost btn--sm", a.tone === "danger" && "btn--tone-danger")}
                    >
                      {a.icon ? <Icon name={a.icon} size={16} /> : null}
                      {a.label}
                    </Link>
                  ) : (
                    <button
                      key={a.label}
                      type="button"
                      onClick={a.onClick}
                      disabled={a.disabled}
                      className={cx("btn btn--ghost btn--sm", a.tone === "danger" && "btn--tone-danger")}
                    >
                      {a.icon ? <Icon name={a.icon} size={16} /> : null}
                      {a.label}
                    </button>
                  ),
                )}
              </span>
              <DropdownMenu
                className="e237-page-header__more-menu"
                triggerClassName="e237-page-header__more-trigger"
                label={t("ui.page.more")}
                trigger={<Icon name="more" size={20} />}
              >
                {secondary.map((a) =>
                  a.href && !a.disabled ? (
                    <MenuItem
                      key={a.label}
                      as={Link}
                      href={a.href}
                      icon={a.icon ? <Icon name={a.icon} size={16} /> : undefined}
                      tone={a.tone}
                    >
                      {a.label}
                    </MenuItem>
                  ) : (
                    <MenuItem
                      key={a.label}
                      onClick={a.onClick}
                      disabled={a.disabled}
                      icon={a.icon ? <Icon name={a.icon} size={16} /> : undefined}
                      tone={a.tone}
                    >
                      {a.label}
                    </MenuItem>
                  ),
                )}
              </DropdownMenu>
            </>
          ) : null}
          {primary}
        </div>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* SectionHeader                                                       */
/* ------------------------------------------------------------------ */

export interface SectionHeaderProps {
  title: ReactNode;
  /** Compteur à côté du titre (« Mes duels · 3 »). Rien à `undefined`, « 0 » à zéro. */
  count?: number;
  /** Action(s) de la section, sur la même rangée, à droite (« Voir tout », un filtre). */
  actions?: ReactNode;
  /** Ligne discrète sous le titre. */
  subtitle?: ReactNode;
  /** `h2` par défaut ; `h3` pour une section dans une section. */
  level?: "h2" | "h3";
  id?: string;
  className?: string;
}

/**
 * Titre de section + actions sur la MÊME rangée — la règle 1 à l'échelle
 * d'un bloc. Remplace le `SectionLabel` en capitales cyan quand le bloc a un
 * vrai titre (le `SectionLabel` reste pour un intertitre dans une carte).
 */
export function SectionHeader({
  title,
  count,
  actions,
  subtitle,
  level = "h2",
  id,
  className,
}: SectionHeaderProps) {
  const Heading = level;
  return (
    <div className={cx("e237-section-header", className)}>
      <div className="e237-section-header__text">
        <div className="e237-section-header__title-row">
          <Heading id={id} className="e237-section-header__title">
            {title}
          </Heading>
          {count != null ? <span className="e237-section-header__count">{count}</span> : null}
        </div>
        {subtitle != null ? <p className="e237-section-header__subtitle">{subtitle}</p> : null}
      </div>
      {actions != null ? <div className="e237-section-header__actions">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Alertes                                                             */
/* ------------------------------------------------------------------ */

/**
 * Le texte d'un contenu React (chaînes et enfants des éléments), pour signer
 * une alerte : si son titre ou son corps change, elle revient.
 */
export function nodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
    return String(node);
  }
  if (Array.isArray(node)) return node.map((n) => nodeText(n as ReactNode)).join(" ");
  if (isValidElement(node)) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/*
 * La mémoire des alertes fermées, partagée par toutes les bannières de
 * l'onglet : un store externe (`useSyncExternalStore`). Côté serveur — et
 * pendant l'hydratation — rien n'est fermé : la bannière part dans le HTML
 * (elle ne pousse plus la page en arrivant après l'hydratation) et le script
 * inline `DISMISSED_ALERTS_SCRIPT` masque avant la première peinture celles
 * que ce navigateur a fermées ; l'hydratation les retire ensuite du DOM.
 */
const dismissListeners = new Set<() => void>();
let dismissedCache: DismissedAlerts | null = null;

function browserStorage(): AlertStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Stockage bloqué par le navigateur : l'accès lui-même lève.
    return null;
  }
}

function dismissedSnapshot(): DismissedAlerts {
  if (dismissedCache === null) dismissedCache = readDismissed(browserStorage());
  return dismissedCache;
}

const NOTHING_DISMISSED: DismissedAlerts = {};

function serverSnapshot(): DismissedAlerts {
  return NOTHING_DISMISSED;
}

function subscribeDismissed(listener: () => void): () => void {
  dismissListeners.add(listener);
  // Un autre onglet ferme la même alerte : celui-ci suit.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== ALERT_DISMISSAL_KEY) return;
    dismissedCache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    dismissListeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function rememberDismissal(id: string, signature: string) {
  dismissedCache = withDismissed(dismissedSnapshot(), id, signature);
  // Refus du stockage (quota, navigation privée) : la fermeture tient pour
  // la page, c'est tout ce qu'on peut faire.
  writeDismissed(browserStorage(), dismissedCache);
  dismissListeners.forEach((l) => l());
}

export type AlertTone = "info" | "success" | "warning" | "danger";

const ALERT_ICON: Record<AlertTone, IconName> = {
  info: "info",
  success: "check-circle",
  warning: "alert-triangle",
  danger: "alert-circle",
};

export interface AlertBannerProps {
  /** Identifiant STABLE (« choose-games », « pending-payment »…) : c'est lui qu'on mémorise. */
  id: string;
  tone?: AlertTone;
  title: ReactNode;
  body?: ReactNode;
  /** Le geste qui règle l'alerte (un bouton ou un lien du DS, taille `sm`). */
  action?: ReactNode;
  /** Croix de fermeture, mémorisée. Défaut : vrai. Faux pour ce qui DOIT rester (un paiement bloquant). */
  dismissible?: boolean;
  /** Icône du jeu G-HUB ; défaut : celle du ton. */
  icon?: IconName;
  /**
   * Signature explicite du contenu. Par défaut, le TEXTE du titre et du
   * corps : une alerte fermée revient quand ce texte change.
   */
  version?: string;
  /**
   * La fermeture est-elle MÉMORISÉE dans le navigateur ? Défaut : oui, sauf
   * pour `danger` (audit web du 15/10/2026, WA1). Une erreur est une
   * occurrence : fermée, elle se cache pour cet écran, et un nouvel échec
   * (même texte) s'affiche à nouveau. Faux aussi pour tout message qui suit
   * un geste (« Duel validé »), qui n'a rien à faire dans la mémoire.
   */
  remember?: boolean;
  /**
   * Numéro de l'occurrence (un compteur, l'instant de l'échec) : une
   * nouvelle valeur fait revenir l'alerte même fermée, même mémorisée.
   */
  occurrence?: string | number;
  /** Appelé après la fermeture (mesure, analytics). */
  onDismiss?: () => void;
  className?: string;
}

/**
 * Bandeau d'alerte — fond et liseré « subtle » du ton (jamais translucide),
 * titre en gras, corps discret, action à droite, croix à l'extrême droite.
 *
 * - `danger` est annoncé tout de suite (`role="alert"`), les autres tons
 *   poliment (`role="status"`).
 * - Fermer ne perd pas le focus : il passe à la croix de l'alerte suivante
 *   (ou précédente), sinon au titre de la page.
 */
export function AlertBanner({
  id,
  tone = "info",
  title,
  body,
  action,
  dismissible = true,
  icon,
  version,
  remember,
  occurrence,
  onDismiss,
  className,
}: AlertBannerProps) {
  const t = useDsT();
  const dismissed = useSyncExternalStore(subscribeDismissed, dismissedSnapshot, serverSnapshot);
  // Fermée DANS cet écran (occurrence non mémorisée) : sa signature.
  const [closedHere, setClosedHere] = useState<string | null>(null);
  const content = version ?? alertSignature(`${nodeText(title)}\n${nodeText(body)}`);
  const signature = occurrence === undefined ? content : `${content}#${occurrence}`;
  const remembered = remember ?? rememberAlertByDefault(tone);

  // Alerte déjà fermée (mémoire du navigateur, ou ICI) : rien.
  if (!alertVisible({ id, signature, dismissible, remember: remembered, dismissed, closedHere })) {
    return null;
  }

  const titleText = nodeText(title);

  function close(button: HTMLButtonElement) {
    moveFocusAway(button);
    if (remembered) rememberDismissal(id, signature);
    else setClosedHere(signature);
    onDismiss?.();
  }

  return (
    <div
      className={cx("e237-alert", `e237-alert--${tone}`, className)}
      role={tone === "danger" ? "alert" : "status"}
      data-alert-id={id}
      data-alert-sig={dismissible && remembered ? signature : undefined}
    >
      <span className="e237-alert__icon">
        <Icon name={icon ?? ALERT_ICON[tone]} size={18} />
      </span>
      <div className="e237-alert__text">
        <p className="e237-alert__title">{title}</p>
        {body != null ? <div className="e237-alert__body">{body}</div> : null}
      </div>
      {action != null ? <div className="e237-alert__action">{action}</div> : null}
      {dismissible ? (
        <button
          type="button"
          className="e237-alert__close"
          aria-label={t("ui.alert.dismiss", { title: titleText })}
          title={t("ui.alert.dismiss", { title: titleText })}
          onClick={(e) => close(e.currentTarget)}
        >
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Le focus ne doit pas tomber sur `<body>` quand la croix disparaît : il va
 * à la croix voisine dans la même pile, sinon au titre de la page.
 */
function moveFocusAway(button: HTMLButtonElement) {
  if (typeof document === "undefined") return;
  const stack = button.closest(".e237-page-alerts");
  const closes = stack
    ? Array.from(stack.querySelectorAll<HTMLButtonElement>(".e237-alert__close"))
    : [];
  const index = closes.indexOf(button);
  const next = closes[index + 1] ?? closes[index - 1];
  if (next) {
    next.focus();
    return;
  }
  const scope = button.closest(".e237-page") ?? document;
  const heading = scope.querySelector<HTMLElement>("h1, .e237-page-header__title");
  if (heading) {
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus();
  }
}

/**
 * La pile d'alertes de la règle 3 — sous l'en-tête, au-dessus du contenu.
 * Vide (toutes fermées), elle ne prend aucune place.
 */
export function PageAlerts({ children, className }: { children?: ReactNode; className?: string }) {
  const t = useDsT();
  return (
    <div className={cx("e237-page-alerts", className)} role="region" aria-label={t("ui.alert.region")}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PageLayout                                                          */
/* ------------------------------------------------------------------ */

/**
 * Les DEUX largeurs de page du web — il n'y en a pas d'autre :
 * - `default` : toutes les pages (contenu + colonne latérale), 1 600 px au plus ;
 * - `full` : consoles et plateaux qui ont besoin de toute la fenêtre.
 */
export type PageWidth = "default" | "full";

export interface PageLayoutProps {
  /** La rangée d'en-tête (`PageHeader`). */
  header?: ReactNode;
  /** Les bandeaux (`AlertBanner`), empilés sous l'en-tête. */
  alerts?: ReactNode;
  /**
   * Colonne latérale DROITE à partir de 1 280 px (carte, prochain duel,
   * solde, raccourcis — ce que le mobile montre ailleurs). Plus étroit : sous
   * le contenu.
   */
  aside?: ReactNode;
  /**
   * Zone GAUCHE à partir de 1 440 px (trois zones). Entre 1 280 et 1 439 px
   * elle rejoint la colonne de droite, au-dessus de `aside` ; plus étroit,
   * elle suit le contenu.
   */
  start?: ReactNode;
  /** `default` (défaut) ou `full`. */
  width?: PageWidth;
  /** Colonnes latérales collées pendant le défilement (défaut : vrai). */
  stickyAside?: boolean;
  /** Au téléphone, la colonne latérale passe AVANT le contenu. */
  asideFirst?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Le conteneur de TOUTE page du web : une largeur maximale, des gouttières
 * qui viennent du cadre (`.e237-app__content`), un `min-width: 0` partout
 * pour qu'aucun enfant n'impose de défilement horizontal à 390 px.
 *
 * ```
 * ≥ 1 440 (avec start)   ┌start──┬main─────────────┬aside──┐
 * ≥ 1 280                ┌main──────────────┬start+aside─┐
 * < 1 280                main / start / aside, l'un sous l'autre
 * ```
 */
export function PageLayout({
  header,
  alerts,
  aside,
  start,
  width = "default",
  stickyAside = true,
  asideFirst = false,
  className,
  children,
}: PageLayoutProps) {
  const hasAside = aside != null && aside !== false;
  const hasStart = start != null && start !== false;
  const hasRail = hasAside || hasStart;
  return (
    <div className={cx("e237-page", width === "full" && "e237-page--full", className)}>
      {header}
      {alerts != null && alerts !== false ? <PageAlerts>{alerts}</PageAlerts> : null}
      {hasRail ? (
        <div
          className={cx(
            "e237-page__body",
            "e237-page__body--rail",
            hasStart && "e237-page__body--start",
            hasStart && hasAside && "e237-page__body--three",
            stickyAside && "e237-page__body--sticky",
            asideFirst && "e237-page__body--aside-first",
          )}
        >
          <div className="e237-page__main">{children}</div>
          <div className="e237-page__rail">
            {hasStart ? <div className="e237-page__start">{start}</div> : null}
            {hasAside ? <aside className="e237-page__aside">{aside}</aside> : null}
          </div>
        </div>
      ) : (
        <div className="e237-page__main">{children}</div>
      )}
    </div>
  );
}
