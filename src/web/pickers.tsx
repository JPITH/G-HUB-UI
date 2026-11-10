"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon } from "../icons/generated/web";

import { useDsT, type DsKey } from "../i18n";

/* ------------------------------------------------------------------ */
/* Socle commun des menus déroulants maison (aucun contrôle natif).    */
/* ------------------------------------------------------------------ */

export interface SelectOption {
  value: string;
  label: string;
}

/** Ferme le popover au clic extérieur et à Escape. */
function useDismiss(
  ref: React.RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, onClose]);
}

/**
 * Libellé d'un déclencheur de liste, et l'astérisque quand il est
 * obligatoire — même convention que `./fields` : l'astérisque SEUL marque
 * l'obligation, jamais une phrase sous le formulaire.
 *
 * L'astérisque visible est `aria-hidden` (« * » se lit « étoile » ou pas du
 * tout) ; c'est `aria-required` sur le déclencheur qui porte l'information.
 */
function FieldLabel({
  id,
  required,
  children,
}: {
  id: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label htmlFor={id} className="text-xs font-medium text-secondary">
      {children}
      {required ? (
        <span aria-hidden className="e237-field-label__req">
          {"\u00a0*"}
        </span>
      ) : null}
    </label>
  );
}

/** Panneau flottant sous le déclencheur. */
function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ui-popover ui-animate-pop ${className}`}>
      {children}
    </div>
  );
}

function OptionRow({
  active,
  highlighted,
  onSelect,
  onHover,
  children,
}: {
  active: boolean;
  highlighted: boolean;
  onSelect: () => void;
  onHover: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onSelect}
      onPointerMove={onHover}
      className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
        highlighted ? "bg-raised" : ""
      } ${active ? "font-semibold text-accent" : "text-primary"}`}
    >
      <span className="truncate">{children}</span>
      {active ? <Icon name="check" size={16} className="shrink-0" /> : null}
    </button>
  );
}

/**
 * Un panneau déroulant ancré sous son déclencheur : son état ouvert, et sa
 * fermeture au clic extérieur et à Escape. Commun aux quatre champs.
 */
function usePopover() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useDismiss(wrapRef, open, () => setOpen(false));
  return { wrapRef, open, setOpen };
}

/** Le cadre d'un champ à panneau : libellé (et astérisque), puis l'ancre du panneau. */
function PickerField({
  id,
  label,
  required,
  className,
  wrapRef,
  children,
}: {
  id: string;
  label?: string;
  required?: boolean;
  className: string;
  wrapRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <FieldLabel id={id} required={required}>
          {label}
        </FieldLabel>
      ) : null}
      <div ref={wrapRef} className="relative">
        {children}
      </div>
    </div>
  );
}

/**
 * Le déclencheur d'un champ à panneau. Une liste (`listbox`) porte un chevron
 * à droite ; un calendrier ou une horloge (`dialog`), son icône à gauche.
 */
function PickerTrigger({
  id,
  popup,
  disabled,
  required,
  open,
  onClick,
  onKeyDown,
  leading,
  text,
  empty,
  textClassName = "",
}: {
  id: string;
  popup: "listbox" | "dialog";
  disabled?: boolean;
  required?: boolean;
  open: boolean;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  leading?: ReactNode;
  text: ReactNode;
  /** Rien de choisi : le texte est l'invite, en `text-muted`. */
  empty: boolean;
  textClassName?: string;
}) {
  const list = popup === "listbox";
  return (
    <button
      type="button"
      id={id}
      disabled={disabled}
      // « combobox » (liste) porte aria-required ; un simple bouton ne le peut pas (axe aria-allowed-attr).
      role={list ? "combobox" : undefined}
      aria-haspopup={popup}
      aria-required={(list && required) || undefined}
      aria-expanded={open}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`ui-field flex h-11 w-full cursor-pointer items-center ${
        list ? "justify-between gap-2" : "gap-2.5"
      } px-3.5 text-left text-base`}
    >
      {leading}
      <span className={`${textClassName ? `${textClassName} ` : ""}truncate ${empty ? "text-muted" : ""}`}>
        {text}
      </span>
      {list ? (
        <Icon
          name="chevron-down"
          className={`size-4 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      ) : null}
    </button>
  );
}

/** La liste d'options d'un panneau (Select, Combobox) : la ligne surlignée suit le clavier et la souris. */
function OptionList({
  options,
  value,
  highlighted,
  onHighlight,
  onSelect,
  className,
  emptyText,
}: {
  options: SelectOption[];
  value: string;
  highlighted: number;
  onHighlight: (index: number) => void;
  onSelect: (option: SelectOption) => void;
  /** Hauteur maximale de la liste (`max-h-*`). */
  className: string;
  /** Liste vide (recherche sans résultat) : ce qui est dit à la place. */
  emptyText?: string;
}) {
  return (
    <div role="listbox" className={`${className} overflow-y-auto p-1`}>
      {options.length === 0 && emptyText ? (
        <p className="px-3 py-3 text-sm text-muted">{emptyText}</p>
      ) : (
        options.map((o, i) => (
          <OptionRow
            key={o.value}
            active={o.value === value}
            highlighted={i === highlighted}
            onSelect={() => onSelect(o)}
            onHover={() => onHighlight(i)}
          >
            {o.label}
          </OptionRow>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Select maison — listbox custom, plus aucun <select> natif.          */
/* ------------------------------------------------------------------ */

export interface SelectProps {
  label?: string;
  /** Champ obligatoire : un astérisque suit le libellé. */
  required?: boolean;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Select({
  label,
  required,
  options,
  value,
  onChange,
  placeholder,
  disabled,
  className = "",
  id,
}: SelectProps) {
  const t = useDsT();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const fieldPlaceholder = placeholder ?? t("form.select.placeholder");
  const { wrapRef, open, setOpen } = usePopover();
  const [hi, setHi] = useState(-1);

  const selected = options.find((o) => o.value === value) ?? null;

  const openAt = () => {
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const commit = (o: SelectOption) => {
    onChange(o.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      openAt();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHi(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHi(options.length - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (options[hi]) commit(options[hi]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <PickerField id={fieldId} label={label} required={required} className={className} wrapRef={wrapRef}>
      <PickerTrigger
        id={fieldId}
        popup="listbox"
        disabled={disabled}
        required={required}
        open={open}
        onClick={() => (open ? setOpen(false) : openAt())}
        onKeyDown={onKeyDown}
        text={selected?.label ?? fieldPlaceholder}
        empty={!selected}
      />

      {open ? (
        <Panel>
          <OptionList
            options={options}
            value={value}
            highlighted={hi}
            onHighlight={setHi}
            onSelect={commit}
            className="max-h-64"
          />
        </Panel>
      ) : null}
    </PickerField>
  );
}

/* ------------------------------------------------------------------ */
/* Combobox — Select avec recherche intégrée (listes longues).         */
/* ------------------------------------------------------------------ */

export interface ComboboxProps extends Omit<SelectProps, "placeholder"> {
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
}

export function Combobox({
  label,
  required,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled,
  className = "",
  id,
}: ComboboxProps) {
  const t = useDsT();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const fieldPlaceholder = placeholder ?? t("form.select.placeholder");
  const fieldSearchPlaceholder =
    searchPlaceholder ?? t("form.field.search.placeholder");
  const fieldEmptyText = emptyText ?? t("form.noResults");
  const { wrapRef, open, setOpen } = usePopover();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset du panneau à l'ouverture
      setQuery("");
      setHi(0);
      // Focus après le rendu du panneau.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commit = (o: SelectOption) => {
    onChange(o.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[hi]) commit(filtered[hi]);
    }
  };

  return (
    <PickerField id={fieldId} label={label} required={required} className={className} wrapRef={wrapRef}>
      <PickerTrigger
        id={fieldId}
        popup="listbox"
        disabled={disabled}
        required={required}
        open={open}
        onClick={() => setOpen((o) => !o)}
        text={selected?.label ?? fieldPlaceholder}
        empty={!selected}
      />

      {open ? (
        <Panel>
          {/* Recherche en encart : le focus reste CONTENU dans le panneau
              (fond teinté + bordure interne, aucun ring qui déborde). */}
          <div className="border-b border-edge p-2">
            <div className="flex items-center gap-2 rounded-lg border border-edge bg-raised px-2.5 transition-colors focus-within:border-accent">
              <Icon name="search" size={16} className="shrink-0 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHi(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={fieldSearchPlaceholder}
                className="h-9 w-full bg-transparent text-sm text-primary outline-none placeholder:text-muted"
              />
            </div>
          </div>
          <OptionList
            options={filtered}
            value={value}
            highlighted={hi}
            onHighlight={setHi}
            onSelect={commit}
            className="max-h-60"
            emptyText={fieldEmptyText}
          />
        </Panel>
      ) : null}
    </PickerField>
  );
}

/* ------------------------------------------------------------------ */
/* DatePicker — calendrier maison (évènements, tournois…).             */
/* ------------------------------------------------------------------ */

// Clés de traduction, pas des libellés rendus : ce composant s'affiche sur
// des apps bilingues (cf. DUEL_STATUS_META dans src/lib/duel-status.ts).
const WEEKDAY_KEYS: DsKey[] = [
  "form.date.weekday.mon",
  "form.date.weekday.tue",
  "form.date.weekday.wed",
  "form.date.weekday.thu",
  "form.date.weekday.fri",
  "form.date.weekday.sat",
  "form.date.weekday.sun",
];
const MONTH_KEYS: DsKey[] = [
  "form.date.month.january",
  "form.date.month.february",
  "form.date.month.march",
  "form.date.month.april",
  "form.date.month.may",
  "form.date.month.june",
  "form.date.month.july",
  "form.date.month.august",
  "form.date.month.september",
  "form.date.month.october",
  "form.date.month.november",
  "form.date.month.december",
];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export interface DatePickerProps {
  label?: string;
  /** Champ obligatoire : un astérisque suit le libellé. */
  required?: boolean;
  /** ISO `YYYY-MM-DD`, ou null si vide. */
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  /** Date minimale sélectionnable (ISO). */
  min?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function DatePicker({
  label,
  required,
  value,
  onChange,
  placeholder,
  min,
  disabled,
  className = "",
  id,
}: DatePickerProps) {
  const t = useDsT();
  const MONTHS = MONTH_KEYS.map((key) => t(key));
  const WEEKDAYS = WEEKDAY_KEYS.map((key) => t(key));
  const fieldPlaceholder = placeholder ?? t("form.date.placeholder");
  const autoId = useId();
  const fieldId = id ?? autoId;
  const { wrapRef, open, setOpen } = usePopover();

  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const base = value ? new Date(`${value}T12:00:00`) : today;
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  // Lundi = première colonne.
  const firstDay = new Date(view.y, view.m, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const shift = (delta: number) => {
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const display = value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <PickerField id={fieldId} label={label} required={required} className={className} wrapRef={wrapRef}>
      <PickerTrigger
        id={fieldId}
        popup="dialog"
        disabled={disabled}
        required={required}
        open={open}
        onClick={() => setOpen((o) => !o)}
        leading={<Icon name="calendar" size={18} className="shrink-0 text-muted" />}
        text={display ?? fieldPlaceholder}
        empty={!display}
      />

      {open ? (
        <Panel className="w-72 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label={t("form.date.prevMonth")}
              onClick={() => shift(-1)}
              className="grid size-8 place-items-center rounded-md text-secondary transition-colors hover:bg-raised hover:text-primary"
            >
              <Icon name="chevron-left" size={16} />
            </button>
            <span className="text-sm font-semibold">
              {MONTHS[view.m]} <span className="scoreboard">{view.y}</span>
            </span>
            <button
              type="button"
              aria-label={t("form.date.nextMonth")}
              onClick={() => shift(1)}
              className="grid size-8 place-items-center rounded-md text-secondary transition-colors hover:bg-raised hover:text-primary"
            >
              <Icon name="chevron-right" size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((d, i) => (
              <span
                key={i}
                className="grid h-8 place-items-center text-[11px] font-semibold text-muted"
              >
                {d}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={`e${i}`} />;
              const iso = toISO(view.y, view.m, day);
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              const isDisabled = min ? iso < min : false;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`grid h-8 place-items-center rounded-md text-sm tabular-nums transition-colors disabled:opacity-30 ${
                    isSelected
                      ? "bg-accent font-bold text-on-accent"
                      : isToday
                        ? "border border-accent-border text-accent hover:bg-raised"
                        : "text-primary hover:bg-raised"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-edge pt-2">
            <button
              type="button"
              onClick={() => {
                onChange(todayISO);
                setView({ y: today.getFullYear(), m: today.getMonth() });
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-raised"
            >
              {t("form.date.today")}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-raised hover:text-primary"
            >
              {t("form.action.clear")}
            </button>
          </div>
        </Panel>
      ) : null}
    </PickerField>
  );
}

/* ------------------------------------------------------------------ */
/* TimePicker — heures & minutes en colonnes (horaires, évènements).   */
/* ------------------------------------------------------------------ */

export interface TimePickerProps {
  label?: string;
  /** Champ obligatoire : un astérisque suit le libellé. */
  required?: boolean;
  /** `HH:MM` (24 h), ou null si vide. */
  value: string | null;
  onChange: (value: string) => void;
  /** Pas des minutes (défaut 15). */
  minuteStep?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TimePicker({
  label,
  required,
  value,
  onChange,
  minuteStep = 15,
  placeholder = "--:--",
  disabled,
  className = "",
  id,
}: TimePickerProps) {
  const t = useDsT();
  const autoId = useId();
  const fieldId = id ?? autoId;
  const { wrapRef, open, setOpen } = usePopover();

  const [h, m] = value ? value.split(":").map(Number) : [null, null];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from(
    { length: Math.ceil(60 / minuteStep) },
    (_, i) => i * minuteStep,
  );

  const set = (nh: number | null, nm: number | null) => {
    const hh = String(nh ?? h ?? 0).padStart(2, "0");
    const mm = String(nm ?? m ?? 0).padStart(2, "0");
    onChange(`${hh}:${mm}`);
  };

  const colBtn = (active: boolean) =>
    `grid h-9 w-full place-items-center rounded-md text-sm tabular-nums transition-colors ${
      active ? "bg-accent font-bold text-on-accent" : "text-primary hover:bg-raised"
    }`;

  return (
    <PickerField id={fieldId} label={label} required={required} className={className} wrapRef={wrapRef}>
      <PickerTrigger
        id={fieldId}
        popup="dialog"
        disabled={disabled}
        required={required}
        open={open}
        onClick={() => setOpen((o) => !o)}
        leading={<Icon name="clock" size={18} className="shrink-0 text-muted" />}
        text={value ?? placeholder}
        empty={!value}
        textClassName="scoreboard"
      />

      {open ? (
        <Panel className="w-52">
          <div className="grid grid-cols-2">
            <div className="flex flex-col gap-0.5 border-r border-edge p-1">
              <span className="px-1 py-1 text-center text-[11px] font-semibold uppercase text-muted">
                {t("form.date.hours")}
              </span>
              <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto">
                {hours.map((hh) => (
                  <button
                    key={hh}
                    type="button"
                    onClick={() => set(hh, null)}
                    className={colBtn(hh === h)}
                  >
                    {String(hh).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-0.5 p-1">
              <span className="px-1 py-1 text-center text-[11px] font-semibold uppercase text-muted">
                {t("form.date.minutes")}
              </span>
              <div className="flex max-h-52 flex-col gap-0.5 overflow-y-auto">
                {minutes.map((mm) => (
                  <button
                    key={mm}
                    type="button"
                    onClick={() => {
                      set(null, mm);
                      if (h !== null) setOpen(false);
                    }}
                    className={colBtn(mm === m)}
                  >
                    {String(mm).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      ) : null}
    </PickerField>
  );
}
