'use client';

/**
 * Champs de saisie web ESPORT 237 HUB (React 19) — famille complète.
 *
 * Entrypoint CLIENT séparé (`@esport237hub/ui/web/fields`) : ces composants
 * utilisent des hooks d'état, à ne pas entraîner dans le graphe RSC des pages
 * serveur Next (le reste de `./web` reste sans état, importable côté serveur).
 *
 * Stylés par les classes .e237-field* de theme.css : importer
 * `@esport237hub/ui/css` une fois dans l'application. Aucune dépendance
 * d'icônes : les icônes internes (œil, recherche, ±) sont des SVG inline.
 */
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

// Le drapeau était recopié à l'identique ici : une seule source, './flag'.
import { CameroonFlag, Flag } from './flag';
import { useDsT } from '../i18n';
import {
  findPhoneCountry,
  formatPhoneDigits,
  phoneDigits,
  type PhoneCountry,
} from '../lib/phone-countries';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/* ------------------------------------------------------------------ */
/* Icônes internes (SVG inline, style « trait » — pas de dépendance)   */
/* ------------------------------------------------------------------ */

type IconProps = { className?: string };

function svgProps(className?: string) {
  return {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

function IconEye({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeOff({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

function IconSearch({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconX({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function IconMinus({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M5 12h14" />
    </svg>
  );
}

function IconChevronDown({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconCheck({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconPlus({ className }: IconProps) {
  return (
    <svg {...svgProps(className)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Label                                                               */
/* ------------------------------------------------------------------ */

/**
 * Libellé d'un champ, et l'astérisque quand il est obligatoire.
 *
 * C'est le SEUL marqueur d'obligation de l'interface — pas de phrase
 * « tel champ est obligatoire » sous le formulaire, pas de légende : la
 * convention se comprend sans mode d'emploi, et l'astérisque est à l'endroit
 * où la question se pose.
 *
 * L'astérisque visible est `aria-hidden` : « * » se lit « étoile » ou ne se
 * lit pas du tout. Ce qui porte l'information à l'oral, c'est `required` sur
 * le champ lui-même (donc `aria-required`), que les appelants passent déjà à
 * l'élément natif.
 */
function Label({
  id,
  required,
  children,
}: {
  id: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="e237-field-label">
      {children}
      {required ? (
        <span aria-hidden className="e237-field-label__req">
          {'\u00a0*'}
        </span>
      ) : null}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  icon?: ReactNode;
  /**
   * Erreur du champ, écrite SOUS lui en rouge, à la place de l'aide (audit
   * du 12/10/2026 : plus de bulle native seule). Pose `aria-invalid` et
   * relie le message au champ (`aria-describedby`).
   */
  error?: string | null;
}

/**
 * Champ texte maison (jamais l'input natif brut). Icône optionnelle, focus ring.
 * Un champ `type="password"` reçoit TOUJOURS le bouton œil afficher/masquer —
 * inutile d'y penser à chaque usage.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, icon, error, className, id, type = 'text', ...rest }, ref) => {
    const t = useDsT();
    const autoId = useId();
    const fieldId = id ?? autoId;
    const noteId = `${fieldId}-note`;
    const note = error || hint;
    const [revealed, setRevealed] = useState(false);
    const isPassword = type === 'password';
    // Révélé → on bascule en `text` pour montrer le mot de passe.
    const effectiveType = isPassword && revealed ? 'text' : type;
    return (
      <div className="e237-field-group">
        {label ? (
          /* `rest.required` : l'astérisque suit l'attribut natif déjà posé sur
             l'input, donc il ne peut pas mentir sur ce que le champ exige. */
          <Label id={fieldId} required={rest.required}>
            {label}
          </Label>
        ) : null}
        <div className="e237-field-box">
          {icon ? <span className="e237-field-icon">{icon}</span> : null}
          <input
            ref={ref}
            id={fieldId}
            type={effectiveType}
            className={cx(
              'e237-field',
              !!icon && 'e237-field--pad-icon',
              isPassword && 'e237-field--pad-toggle',
              className,
            )}
            {...rest}
            aria-invalid={error ? true : rest['aria-invalid']}
            aria-describedby={note ? noteId : rest['aria-describedby']}
          />
          {isPassword ? (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              aria-label={
                revealed
                  ? t('form.field.password.hide')
                  : t('form.field.password.show')
              }
              aria-pressed={revealed}
              className="e237-field-toggle"
            >
              {revealed ? <IconEyeOff /> : <IconEye />}
            </button>
          ) : null}
        </div>
        {note ? (
          <span
            id={noteId}
            className={cx('e237-field-hint', !!error && 'e237-field-hint--error')}
            aria-live={error ? 'polite' : undefined}
          >
            {note}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

/* ------------------------------------------------------------------ */
/* Textarea                                                            */
/* ------------------------------------------------------------------ */

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  /**
   * Compteur visible « 212 / 280 » sous le champ. Par défaut : dès que
   * `maxLength` atteint 200 caractères (`FIELD_COUNTER_FROM` de
   * `@esport237hub/types`) — un texte qu'on rédige, pas une ville.
   */
  showCount?: boolean;
}

/** Seuil du compteur par défaut — miroir de `FIELD_COUNTER_FROM` (types). */
const COUNTER_FROM = 200;

/**
 * Le compteur d'un champ borné (09/10/2026, « limitations de caractères ») :
 * neutre, ambre dans les derniers 10 %, rouge à la borne. Le texte dit le
 * nombre — la couleur n'est jamais le seul signal — et le lecteur d'écran
 * entend « 212 sur 280 caractères ».
 */
export function FieldCounter({ length, maxLength }: { length: number; maxLength: number }) {
  const t = useDsT();
  const used = Math.max(0, Math.min(length, maxLength));
  const tone = used >= maxLength ? 'danger' : used >= maxLength * 0.9 ? 'warning' : null;
  return (
    <span
      className={cx('e237-field-counter', tone && `e237-field-counter--${tone}`)}
      aria-label={t('ui.field.counter', { used, max: maxLength })}
    >
      {used} / {maxLength}
    </span>
  );
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, className, id, rows = 3, showCount, onChange, ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    // Longueur tapée, pour un champ non contrôlé ; un champ contrôlé la donne
    // par sa `value`.
    const [typed, setTyped] = useState(() => String(rest.defaultValue ?? '').length);
    const length = typeof rest.value === 'string' ? rest.value.length : typed;
    const max = rest.maxLength;
    const counter =
      typeof max === 'number' && max > 0 && (showCount ?? max >= COUNTER_FROM);
    return (
      <div className="e237-field-group">
        {label ? (
          <Label id={fieldId} required={rest.required}>
            {label}
          </Label>
        ) : null}
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className={cx('e237-field', 'e237-field--area', className)}
          onChange={(e) => {
            setTyped(e.target.value.length);
            onChange?.(e);
          }}
          {...rest}
        />
        {hint || counter ? (
          <div className="e237-field-foot">
            {hint ? <span className="e237-field-hint">{hint}</span> : null}
            {counter ? <FieldCounter length={length} maxLength={max as number} /> : null}
          </div>
        ) : null}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

/* ------------------------------------------------------------------ */
/* NumberInput                                                         */
/* ------------------------------------------------------------------ */

export interface NumberInputProps {
  label?: string;
  /** Champ obligatoire : un astérisque suit le libellé. */
  required?: boolean;
  hint?: string;
  /** null = champ vide (le placeholder s'affiche). */
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Saisie de nombre maison : boutons − / + de part et d'autre d'un champ
 * centré qui reste éditable au clavier. Jamais les spinners natifs.
 */
export function NumberInput({
  label,
  required,
  hint,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder,
  disabled,
  className,
  id,
}: NumberInputProps) {
  const t = useDsT();
  const autoId = useId();
  const fieldId = id ?? autoId;
  // Texte local : autorise le champ vide ou une frappe partielle sans
  // renvoyer de valeur invalide au parent.
  const [text, setText] = useState(value === null ? '' : String(value));
  useEffect(() => {
    setText(value === null ? '' : String(value));
  }, [value]);

  const clamp = (n: number) => {
    let next = Math.max(min, n);
    if (max !== undefined) next = Math.min(max, next);
    return next;
  };

  const commitText = (raw: string) => {
    const digits = raw.replace(/[^0-9-]/g, '');
    if (digits === '' || digits === '-') {
      onChange(null);
      setText('');
      return;
    }
    const next = clamp(Number(digits));
    onChange(next);
    setText(String(next));
  };

  const nudge = (dir: 1 | -1) => {
    const base = value ?? (dir === 1 ? min - step : min + step);
    onChange(clamp(base + dir * step));
  };

  const canMinus = !disabled && (value === null || value > min);
  const canPlus =
    !disabled && (max === undefined || value === null || value < max);

  return (
    <div className={cx('e237-field-group', className)}>
      {label ? (
        <Label id={fieldId} required={required}>
          {label}
        </Label>
      ) : null}
      <div
        className={cx(
          'e237-field',
          'e237-field-composite',
          disabled && 'e237-field--muted',
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          aria-label={t('form.field.number.decrease')}
          disabled={!canMinus}
          onClick={() => nudge(-1)}
          className="e237-stepper-btn e237-stepper-btn--minus"
        >
          <IconMinus />
        </button>
        <input
          id={fieldId}
          inputMode="numeric"
          disabled={disabled}
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText(text);
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              nudge(1);
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              nudge(-1);
            }
          }}
          className="e237-field-inner e237-field-inner--center"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={t('form.field.number.increase')}
          disabled={!canPlus}
          onClick={() => nudge(1)}
          className="e237-stepper-btn e237-stepper-btn--plus"
        >
          <IconPlus />
        </button>
      </div>
      {hint ? <span className="e237-field-hint">{hint}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PhoneInput                                                          */
/* ------------------------------------------------------------------ */

export interface PhoneInputProps {
  label?: string;
  /** Champ obligatoire : un astérisque suit le libellé. */
  required?: boolean;
  hint?: string;
  /** Chiffres du numéro national, sans l'indicatif. */
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /**
   * Pays proposés dans le menu d'indicatif (`PHONE_COUNTRIES` de `./lib`).
   * ABSENT = comportement historique : préfixe verrouillé sur +237 — c'est ce
   * que veut le Mobile Money, qui n'opère qu'au Cameroun.
   */
  countries?: PhoneCountry[];
  /** Code ISO du pays choisi (« CM » par défaut). */
  country?: string;
  onCountryChange?: (code: string) => void;
  /** Erreur affichée par le parent : bordure d'erreur + `aria-invalid`. */
  invalid?: boolean;
  /** Identifiants d'éléments qui décrivent le champ (erreur, aide). */
  describedBy?: string;
  onBlur?: () => void;
}

/**
 * Téléphone — indicatif + numéro national formaté au fil de la frappe.
 *
 * Avec `countries`, l'indicatif devient un menu déroulant maison (drapeau,
 * pays, indicatif ; flèches, Entrée, Échap, saisie d'une lettre pour sauter
 * au pays) — jamais un `<select>` natif. Le panneau vit HORS du conteneur
 * composite, qui coupe ce qui déborde (`overflow: hidden`).
 *
 * Parité native : le jumeau `./native` reste verrouillé sur +237 tant que
 * l'app mobile n'en a pas l'usage (seul le Mobile Money y saisit un numéro).
 */
export function PhoneInput({
  label,
  required,
  hint,
  value,
  onChange,
  placeholder,
  disabled,
  className,
  id,
  countries,
  country = 'CM',
  onCountryChange,
  invalid,
  describedBy,
  onBlur,
}: PhoneInputProps) {
  const t = useDsT();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const listId = `${fieldId}-pays`;
  const fieldLabel = label ?? t('form.field.phone.label');
  const selectable = !!countries && countries.length > 1;
  const current = selectable
    ? (countries.find((c) => c.code === country) ?? countries[0]!)
    : findPhoneCountry('CM');

  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const list = countries ?? [];
  const openMenu = () => {
    setHi(Math.max(0, list.findIndex((c) => c.code === current.code)));
    setOpen(true);
  };
  const pick = (c: PhoneCountry) => {
    onCountryChange?.(c.code);
    // Le numéro saisi est recoupé à la longueur du nouveau pays.
    onChange(phoneDigits(value, c));
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHi((h) => Math.min(list.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHi(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHi(list.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (list[hi]) pick(list[hi]);
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (/^[a-z]$/i.test(e.key)) {
      // Une lettre saute au premier pays qui commence par elle.
      const at = list.findIndex((c) =>
        c.name.normalize('NFD').toLowerCase().startsWith(e.key.toLowerCase()),
      );
      if (at >= 0) setHi(at);
    }
  };

  return (
    <div className={cx('e237-field-group', className)}>
      {fieldLabel ? (
        <Label id={fieldId} required={required}>
          {fieldLabel}
        </Label>
      ) : null}
      <div ref={wrapRef} className="e237-phone">
        <div
          className={cx(
            'e237-field',
            'e237-field-composite',
            disabled && 'e237-field--muted',
            invalid && 'e237-field--invalid',
          )}
        >
          {selectable ? (
            <button
              ref={triggerRef}
              type="button"
              className="e237-field-affix e237-field-affix--button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={open ? listId : undefined}
              aria-activedescendant={open && list[hi] ? `${listId}-${list[hi].code}` : undefined}
              aria-label={`+${current.dial}, indicatif ${current.name}`}
              disabled={disabled}
              onClick={() => (open ? setOpen(false) : openMenu())}
              onKeyDown={onMenuKey}
            >
              <Flag country={current.code} className="e237-affix-flag" decorative />
              +{current.dial}
              <IconChevronDown
                className={cx('e237-affix-chevron', open && 'e237-affix-chevron--open')}
              />
            </button>
          ) : (
            <span className="e237-field-affix">
              <CameroonFlag className="e237-affix-flag" />
              +237
            </span>
          )}
          <input
            id={fieldId}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            disabled={disabled}
            value={formatPhoneDigits(value, current)}
            placeholder={placeholder ?? current.placeholder}
            onChange={(e) => onChange(phoneDigits(e.target.value, current))}
            onBlur={onBlur}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className="e237-field-inner"
          />
        </div>

        {selectable && open ? (
          <div className="ui-popover ui-animate-pop e237-phone__menu">
            <div id={listId} role="listbox" aria-label="Indicatif du pays" className="e237-phone__list">
              {list.map((c, i) => (
                <button
                  key={c.code}
                  id={`${listId}-${c.code}`}
                  type="button"
                  role="option"
                  aria-selected={c.code === current.code}
                  tabIndex={-1}
                  className={cx(
                    'e237-phone__option',
                    i === hi && 'e237-phone__option--hi',
                    c.code === current.code && 'e237-phone__option--on',
                  )}
                  onClick={() => pick(c)}
                  onPointerMove={() => setHi(i)}
                >
                  <Flag country={c.code} className="e237-affix-flag" decorative />
                  <span className="e237-phone__name">{c.name}</span>
                  <span className="e237-phone__dial">+{c.dial}</span>
                  {c.code === current.code ? <IconCheck className="e237-phone__check" /> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      {hint ? <span className="e237-field-hint">{hint}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SearchField                                                         */
/* ------------------------------------------------------------------ */

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  loading?: boolean;
  className?: string;
  /** Prend le focus à l'affichage (panneaux/popups de recherche). */
  autoFocus?: boolean;
}

/** Barre de recherche animée : icône, spinner pendant la requête, effacement. */
export function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder,
  loading = false,
  className,
  autoFocus = false,
}: SearchFieldProps) {
  const t = useDsT();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldPlaceholder = placeholder ?? t('form.field.search.placeholder');

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className={cx('e237-search', className)}>
      <span
        className={cx('e237-search-icon', focused && 'e237-search-icon--focused')}
      >
        {loading ? <span className="e237-spinner" /> : <IconSearch />}
      </span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit?.();
        }}
        placeholder={fieldPlaceholder}
        className="e237-field"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('form.action.clear')}
          className="e237-search-clear"
        >
          <IconX />
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ComposerField — champ à icônes INTÉRIEURES                          */
/* ------------------------------------------------------------------ */

export interface ComposerFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  /** Icônes à gauche du texte (joindre, partager une salle). */
  leading?: ReactNode;
  /** Icônes à droite (envoyer — `ComposerFieldButton tone="accent"`). */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Champ dont les actions vivent DANS le cadre (porteur, 09/10/2026 :
 * « comme le champ de commentaire du fil »). Jumeau du `ComposerField`
 * natif : même hauteur (44 px), icônes calées en bas quand le texte prend
 * plusieurs lignes, focus sur le cadre entier. Une seule ligne au départ,
 * jusqu'à 8 rem avant de défiler.
 */
export const ComposerField = forwardRef<HTMLTextAreaElement, ComposerFieldProps>(
  ({ leading, trailing, className, rows = 1, ...rest }, ref) => (
    <div
      className={cx(
        'e237-inline-field',
        !leading && 'e237-inline-field--bare-start',
        !trailing && 'e237-inline-field--bare-end',
        className,
      )}
    >
      {leading ? <div className="e237-inline-field__slot">{leading}</div> : null}
      <textarea ref={ref} rows={rows} className="e237-inline-field__input" {...rest} />
      {trailing ? <div className="e237-inline-field__slot">{trailing}</div> : null}
    </div>
  ),
);
ComposerField.displayName = 'ComposerField';

/** Bouton rond posé dans un `ComposerField` ; `label` obligatoire (accessibilité). */
export function ComposerFieldButton({
  label,
  tone = 'plain',
  type = 'button',
  children,
  onClick,
  disabled,
}: {
  label: string;
  tone?: 'plain' | 'accent';
  type?: 'button' | 'submit';
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cx('e237-inline-field__btn', tone === 'accent' && 'e237-inline-field__btn--accent')}
    >
      {children}
    </button>
  );
}
