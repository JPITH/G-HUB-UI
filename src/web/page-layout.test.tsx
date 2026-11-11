import { describe, expect, it } from 'bun:test';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  AlertBanner,
  PageAlerts,
  PageHeader,
  PageLayout,
  SectionHeader,
  nodeText,
} from './page-layout';
import { SettingsLayout, SettingsRow, SettingsSection } from './settings-layout';
import { ContextPanel } from './dashboard';

const html = (el: ReactElement) => renderToStaticMarkup(el);

/**
 * Les briques de page du lot R (09/10/2026). Rendu serveur : on vérifie la
 * STRUCTURE que les règles du porteur imposent — une rangée d'en-tête, pas
 * de surtitre, des alertes accessibles, un conteneur unique.
 */
describe('PageHeader — la rangée unique (règle 1)', () => {
  it('pose titre et actions dans le MÊME en-tête, actions après le titre', () => {
    const out = html(
      <PageHeader
        title="Notifications"
        subtitle="3 non lues"
        actions={<button type="button">Tout marquer comme lu</button>}
      />,
    );
    expect(out.startsWith('<header class="e237-page-header"')).toBe(true);
    expect(out).toContain('<h1 class="e237-page-header__title" title="Notifications">Notifications</h1>');
    expect(out).toContain('e237-page-header__subtitle');
    expect(out.indexOf('Notifications</h1>')).toBeLessThan(out.indexOf('Tout marquer comme lu'));
    expect(out.match(/<header/g)).toHaveLength(1);
  });

  it('n’affiche plus le surtitre `section` (règle 2), mais l’accepte encore', () => {
    const out = html(<PageHeader section="Mon espace" title="Profil" />);
    expect(out).not.toContain('Mon espace');
    expect(out).toContain('Profil');
  });

  it('met le retour à GAUCHE du titre, nommé pour les lecteurs d’écran', () => {
    const out = html(<PageHeader title="Ludo" back={{ href: '/nos-jeux', label: 'Nos jeux' }} />);
    expect(out).toContain('href="/nos-jeux"');
    expect(out).toContain('aria-label="Nos jeux"');
    expect(out.indexOf('e237-page-header__back')).toBeLessThan(out.indexOf('<h1'));
  });

  it('garde l’ancien couple backHref/backLabel et les enfants comme actions', () => {
    const out = html(
      <PageHeader title="Salle" backHref="/salles" backLabel="Salles">
        <span>Action</span>
      </PageHeader>,
    );
    expect(out).toContain('href="/salles"');
    expect(out).toContain('e237-page-header__actions');
    expect(out).toContain('<span>Action</span>');
  });

  it('rend les secondaires en ligne ET dans « … » (la CSS choisit selon la largeur)', () => {
    const out = html(
      <PageHeader
        title="Évènement"
        actions={<button type="button">Publier</button>}
        more={[
          { label: 'Dupliquer', icon: 'copy', onClick: () => undefined },
          { label: 'Supprimer', tone: 'danger', onClick: () => undefined },
        ]}
      />,
    );
    expect(out).toContain('e237-page-header__more-inline');
    expect(out).toContain('e237-page-header__more-menu');
    expect(out).toContain('aria-haspopup="menu"');
    expect(out).toContain('btn--tone-danger');
    // La principale reste la dernière de la rangée.
    expect(out.lastIndexOf('Publier')).toBeGreaterThan(out.lastIndexOf('Dupliquer'));
  });
});

describe('SectionHeader', () => {
  it('titre, compteur et actions sur une rangée', () => {
    const out = html(<SectionHeader title="Mes duels" count={3} actions={<a href="/duels">Voir tout</a>} />);
    expect(out).toContain('<h2 class="e237-section-header__title">Mes duels</h2>');
    expect(out).toContain('e237-section-header__count">3<');
    expect(out).toContain('e237-section-header__actions');
  });

  it('montre « 0 » à zéro et rien quand le compte est inconnu', () => {
    expect(html(<SectionHeader title="A" count={0} />)).toContain('count">0<');
    expect(html(<SectionHeader title="A" />)).not.toContain('count');
  });
});

describe('AlertBanner — les alertes fermables (règle 3)', () => {
  it('une alerte fermable ne s’affiche pas tant que la mémoire n’est pas lue (pas de clignotement)', () => {
    expect(html(<AlertBanner id="x" title="Choisis tes jeux" />)).toBe('');
  });

  it('une alerte NON fermable s’affiche, sans croix', () => {
    const out = html(<AlertBanner id="pay" tone="warning" title="Paiement en attente" dismissible={false} />);
    expect(out).toContain('role="status"');
    expect(out).toContain('e237-alert--warning');
    expect(out).not.toContain('e237-alert__close');
  });

  it('« danger » est annoncée tout de suite (role="alert")', () => {
    const out = html(<AlertBanner id="ban" tone="danger" title="Compte suspendu" dismissible={false} />);
    expect(out).toContain('role="alert"');
  });

  it('la pile est une région nommée, vide quand tout est fermé', () => {
    const out = html(<PageAlerts>{null}</PageAlerts>);
    expect(out).toContain('role="region"');
    expect(out).toContain('aria-label="Alertes"');
  });
});

describe('nodeText — la signature suit le TEXTE affiché', () => {
  it('lit les chaînes, nombres et enfants des éléments', () => {
    const node = createElement('span', null, 'Paiement de ', createElement('b', null, 2000), ' FCFA');
    expect(nodeText(node)).toBe('Paiement de  2000  FCFA');
    expect(nodeText(null)).toBe('');
    expect(nodeText(false)).toBe('');
  });
});

describe('PageLayout — UN conteneur pour tout le web', () => {
  it('sans colonne latérale : en-tête, alertes, contenu', () => {
    const out = html(
      <PageLayout header={<PageHeader title="T" />} alerts={<span>a</span>}>
        <p>contenu</p>
      </PageLayout>,
    );
    expect(out.startsWith('<div class="e237-page">')).toBe(true);
    expect(out).toContain('e237-page-alerts');
    expect(out).toContain('<div class="e237-page__main"><p>contenu</p></div>');
    expect(out).not.toContain('e237-page__rail');
  });

  it('colonne latérale et zone gauche → trois zones', () => {
    const out = html(
      <PageLayout start={<span>carte</span>} aside={<span>duels</span>}>
        <p>fil</p>
      </PageLayout>,
    );
    expect(out).toContain('e237-page__body--rail');
    expect(out).toContain('e237-page__body--three');
    expect(out).toContain('<aside class="e237-page__aside">');
  });

  it('`full` est la seule autre largeur', () => {
    expect(html(<PageLayout width="full">x</PageLayout>)).toContain('e237-page e237-page--full');
  });
});

describe('SettingsLayout', () => {
  const nav = [
    { href: '/profil', label: 'Profil', icon: 'user' as const, group: 'Mon compte' },
    { href: '/profil/notifications', label: 'Notifications', icon: 'bell' as const, group: 'Réglages' },
  ];

  it('marque la section ouverte (aria-current) et propose le retour au téléphone', () => {
    const out = html(
      <SettingsLayout nav={nav} activeHref="/profil/notifications" indexHref="/profil" indexLabel="Profil">
        <p>section</p>
      </SettingsLayout>,
    );
    expect(out).toContain('aria-current="page"');
    expect(out).toContain('e237-settings__back');
    expect(out).not.toContain('e237-settings--index');
    expect(out).toContain('Mon compte');
  });

  it('page d’entrée : pas de retour, la liste suit le contenu au téléphone', () => {
    const out = html(
      <SettingsLayout nav={nav} activeHref="/profil" isIndex indexHref="/profil">
        <p>profil</p>
      </SettingsLayout>,
    );
    expect(out).toContain('e237-settings e237-settings--index');
    expect(out).not.toContain('e237-settings__back');
  });

  it('rangée de réglage : libellé relié au champ, réglage à droite', () => {
    const out = html(
      <SettingsSection title="Rappels" id="rappels">
        <SettingsRow label="Rappels d’évènements" htmlFor="r1" control={<input id="r1" />} />
      </SettingsSection>,
    );
    expect(out).toContain('aria-labelledby="rappels-title"');
    expect(out).toContain('<label class="e237-settings-row__label" for="r1">');
    expect(out).toContain('e237-settings-row__control');
  });
});

describe('ContextPanel — titre de la colonne', () => {
  it('titre en h2 : posé juste sous le h1 (colonne d’abord au téléphone), il ne saute pas de niveau', () => {
    const out = html(
      <ContextPanel title="Filtres">
        <p>Contenu</p>
      </ContextPanel>,
    );
    expect(out).toContain('<h2 class="e237-context-panel__title">Filtres</h2>');
    expect(out).not.toContain('<h3');
  });
});
