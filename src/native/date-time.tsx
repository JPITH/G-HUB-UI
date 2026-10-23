/**
 * Champs date et heure maison (paramétrage des évènements, horaires, tarifs…).
 * Aucun picker natif : feuille modale custom, cohérente avec SelectSheet,
 * zones tactiles ≥ 44 px, thèmes clair/sombre via useE237Colors().
 */
import { radius, spacing, useE237Colors } from './core';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { localeTag } from '@esport237hub/types';
import { useDsLocale, useDsT, type DsKey } from '../i18n';
import { FieldLabel, requiredFieldLabel } from './fields';
import { ScrollView } from './scroll';
import { Sheet } from './sheet';
import { Txt } from './text';
import { Icon } from '../icons/generated/native';
import type { IconName } from '../icons/names';

// Clés de traduction, pas des libellés rendus : ce composant s'affiche sur
// des apps bilingues (cf. DUEL_STATUS_META dans src/lib/duel-status.ts).
const MONTH_KEYS: DsKey[] = [
  'form.date.month.january',
  'form.date.month.february',
  'form.date.month.march',
  'form.date.month.april',
  'form.date.month.may',
  'form.date.month.june',
  'form.date.month.july',
  'form.date.month.august',
  'form.date.month.september',
  'form.date.month.october',
  'form.date.month.november',
  'form.date.month.december',
];
const WEEKDAY_KEYS: DsKey[] = [
  'form.date.weekday.mon',
  'form.date.weekday.tue',
  'form.date.weekday.wed',
  'form.date.weekday.thu',
  'form.date.weekday.fri',
  'form.date.weekday.sat',
  'form.date.weekday.sun',
];

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Le déclencheur d'un champ date ou heure : libellé (et astérisque), puis une
 * rangée de 44 px avec son icône et la valeur — ou l'invite, en `muted`.
 * Partagé avec la version `@expo/ui` (`./expo/date-time.tsx`) : seule la
 * feuille qui s'ouvre change d'une version à l'autre.
 */
export function FieldTrigger({
  label,
  required,
  icon,
  text,
  filled,
  onPress,
}: {
  label?: string;
  required?: boolean;
  icon: IconName;
  text: string;
  filled: boolean;
  onPress: () => void;
}) {
  const c = useE237Colors();
  const t = useDsT();
  return (
    <View style={{ gap: spacing['1'] }}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={requiredFieldLabel(t, label, required)}
        onPress={onPress}
        style={[styles.trigger, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Icon name={icon} color={c.textSecondary} size={18} />
        <Txt
          numberOfLines={1}
          variant="body"
          size={15}
          tone={filled ? 'primary' : 'muted'}
          style={{ flex: 1 }}>
          {text}
        </Txt>
      </Pressable>
    </View>
  );
}

/** Champ date : calendrier mensuel en feuille. Valeur ISO `YYYY-MM-DD` ou null. */
export function DateField({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label?: string;
  /** Champ obligatoire : un astérisque suit le libellé. */
  required?: boolean;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}) {
  const c = useE237Colors();
  const t = useDsT();
  const locale = useDsLocale();
  const MONTHS = MONTH_KEYS.map((key) => t(key));
  const WEEKDAYS = WEEKDAY_KEYS.map((key) => t(key));
  const fieldPlaceholder = placeholder ?? t('form.date.placeholder');
  const [open, setOpen] = useState(false);

  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const base = value ? new Date(`${value}T12:00:00`) : today;
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  const firstDay = new Date(view.y, view.m, 1);
  const offset = (firstDay.getDay() + 6) % 7; // lundi en tête
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
    ? new Date(`${value}T12:00:00`).toLocaleDateString(localeTag(locale), {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : fieldPlaceholder;

  return (
    <>
      <FieldTrigger
        label={label}
        required={required}
        icon="calendar"
        text={display}
        filled={!!value}
        onPress={() => setOpen(true)}
      />

      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? t('form.date.sheetTitle.date')}>
        <View style={styles.monthNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('form.date.prevMonth')}
            onPress={() => shift(-1)}
            style={styles.monthBtn}>
            <Icon name="chevron-left" color={c.textSecondary} size={20} />
          </Pressable>
          <Txt variant="label" size={15}>
            {MONTHS[view.m]} {view.y}
          </Txt>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('form.date.nextMonth')}
            onPress={() => shift(1)}
            style={styles.monthBtn}>
            <Icon name="chevron-right" color={c.textSecondary} size={20} />
          </Pressable>
        </View>

        <View style={styles.grid}>
          {WEEKDAYS.map((d, i) => (
            <View key={`w${i}`} style={styles.cell}>
              <Txt variant="overline" size={11} tone="muted">
                {d}
              </Txt>
            </View>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <View key={`e${i}`} style={styles.cell} />;
            const iso = toISO(view.y, view.m, day);
            const isSelected = iso === value;
            const isToday = iso === todayISO;
            return (
              <View key={iso} style={styles.cell}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  style={[
                    styles.day,
                    isSelected && { backgroundColor: c.accent },
                    !isSelected && isToday && { borderWidth: 1, borderColor: c.accent },
                  ]}>
                  <Txt
                    variant={isSelected ? 'label' : 'body'}
                    size={14}
                    color={isSelected ? c.bg : isToday ? c.accent : c.textPrimary}>
                    {day}
                  </Txt>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={[styles.footer, { borderTopColor: c.border }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onChange(todayISO);
              setView({ y: today.getFullYear(), m: today.getMonth() });
              setOpen(false);
            }}
            style={styles.footerBtn}>
            <Txt variant="label" size={13} tone="accent">
              {t('form.date.today')}
            </Txt>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
            style={styles.footerBtn}>
            <Txt variant="body" size={13} tone="muted">
              {t('form.action.clear')}
            </Txt>
          </Pressable>
        </View>
      </Sheet>
    </>
  );
}

/** Champ heure : colonnes heures/minutes en feuille. Valeur `HH:MM` ou null. */
export function TimeField({
  label,
  required,
  value,
  onChange,
  minuteStep = 15,
  placeholder = '--:--',
}: {
  label?: string;
  /** Champ obligatoire : un astérisque suit le libellé. */
  required?: boolean;
  value: string | null;
  onChange: (value: string) => void;
  minuteStep?: number;
  placeholder?: string;
}) {
  const c = useE237Colors();
  const t = useDsT();
  const [open, setOpen] = useState(false);

  const [h, m] = value ? value.split(':').map(Number) : [null, null];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);

  const set = (nh: number | null, nm: number | null) => {
    const hh = String(nh ?? h ?? 0).padStart(2, '0');
    const mm = String(nm ?? m ?? 0).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  return (
    <>
      <FieldTrigger
        label={label}
        required={required}
        icon="clock"
        text={value ?? placeholder}
        filled={!!value}
        onPress={() => setOpen(true)}
      />

      {/* `scrollable={false}` : les deux colonnes défilent déjà, chacune de son
          côté. Un troisième défilement par-dessus leur volerait le doigt. */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={label ?? t('form.date.sheetTitle.time')}
        scrollable={false}>
        <View style={{ flexDirection: 'row', gap: spacing['3'] }}>
          <TimeColumn heading={t('form.date.hours')} items={hours} active={h} onPick={(n) => set(n, null)} />
          <TimeColumn
            heading={t('form.date.minutes')}
            items={minutes}
            active={m}
            onPick={(n) => {
              set(null, n);
              if (h !== null) setOpen(false);
            }}
          />
        </View>
      </Sheet>
    </>
  );
}

/** Hauteur d'un item (minHeight 44 + marges) — sert à l'auto-scroll. */
const TIME_ITEM_HEIGHT = 46;

function TimeColumn({
  heading,
  items,
  active,
  onPick,
}: {
  heading: string;
  items: number[];
  active: number | null;
  onPick: (n: number) => void;
}) {
  const c = useE237Colors();
  const ref = useRef<ScrollViewInstance>(null);

  // À l'ouverture, amène la valeur sélectionnée dans la fenêtre visible.
  useEffect(() => {
    if (active === null) return;
    const i = items.indexOf(active);
    if (i > 2) {
      ref.current?.scrollTo({ y: (i - 2) * TIME_ITEM_HEIGHT, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, gap: spacing['1'] }}>
      <Txt variant="overline" size={11} tone="muted" align="center">
        {heading}
      </Txt>
      <ScrollView ref={ref} style={{ maxHeight: 260 }}>
        {items.map((n) => {
          const isActive = n === active;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              onPress={() => onPick(n)}
              style={[styles.timeItem, isActive && { backgroundColor: c.accent }]}>
              <Txt
                variant={isActive ? 'label' : 'body'}
                size={15}
                color={isActive ? c.bg : c.textPrimary}>
                {String(n).padStart(2, '0')}
              </Txt>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['2'],
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing['3'],
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  day: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: spacing['2'],
  },
  footerBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing['2'],
  },
  timeItem: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    marginVertical: 1,
  },
});
