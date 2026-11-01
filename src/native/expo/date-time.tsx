/**
 * DateField / TimeField backed by `@expo/ui/community/datetime-picker`.
 * Même API que `../date-time` (valeur ISO date / HH:mm).
 */
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';

import type { IconName } from '../../icons/names';
import { localeTag } from '@esport237hub/types';

import { useDsLocale, useDsT } from '../../i18n';
import { Button, useE237Colors } from '../core';
import { FieldTrigger } from '../date-time';

// Expo UI n’expose pas encore de pas de minutes : conserver les quarts d’heure.
export { TimeField } from '../date-time';
import { Sheet } from './sheet';

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(iso: string | null): Date {
  if (!iso) return new Date();
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Le corps commun aux deux champs : le déclencheur partagé avec la version
 * React Native, puis une feuille avec le sélecteur natif de la plateforme.
 * Choisir referme la feuille.
 */
function NativePickerField({
  label,
  required,
  icon,
  mode,
  text,
  filled,
  current,
  onPick,
  onClear,
}: {
  label?: string;
  required?: boolean;
  icon: IconName;
  mode: 'date' | 'time';
  text: string;
  filled: boolean;
  current: Date;
  onPick: (date: Date) => void;
  onClear?: () => void;
}) {
  const c = useE237Colors();
  const [open, setOpen] = useState(false);
  const t = useDsT();
  return (
    <>
      <FieldTrigger
        label={label}
        required={required}
        icon={icon}
        text={text}
        filled={filled}
        onPress={() => setOpen(true)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        {open ? <DateTimePicker
          mode={mode}
          value={current}
          accentColor={c.accent}
          is24Hour
          onDismiss={() => setOpen(false)}
          onValueChange={(_e, date) => {
            onPick(date);
            setOpen(false);
          }}
        /> : null}
        {onClear ? <Button variant="secondary" label={t('form.action.clear')} onPress={() => { onClear(); setOpen(false); }} /> : null}
      </Sheet>
    </>
  );
}

export function DateField({
  label,
  required,
  value,
  onChange,
  placeholder = 'Choisir une date…',
}: {
  label?: string;
  /** Champ obligatoire : un astérisque suit le libellé. */
  required?: boolean;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
}) {
  const current = parseDate(value);
  const locale = useDsLocale();
  const display = value
    ? current.toLocaleDateString(localeTag(locale), {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : placeholder;

  return (
    <NativePickerField
      label={label}
      required={required}
      icon="calendar"
      mode="date"
      text={display}
      filled={!!value}
      current={current}
      onPick={(date) => onChange(toISODate(date))}
      onClear={value && !required ? () => onChange(null) : undefined}
    />
  );
}
