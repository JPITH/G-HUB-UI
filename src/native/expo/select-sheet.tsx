/**
 * SelectSheet backed by `@expo/ui` Picker — même API que `../select-sheet`.
 */
import { Host, Picker } from '@expo/ui';
import { View } from 'react-native';

import { spacing, useE237Colors, useE237Mode } from '../core';
import { FieldLabel } from '../fields';
import type { SelectOption } from '../select-sheet';

export type { SelectOption };

const EMPTY = '__e237_none__';

export function SelectSheet({
  label,
  required,
  placeholder = 'Choisir…',
  options,
  value,
  onChange,
}: {
  label?: string;
  /** Champ obligatoire : un astérisque suit le libellé (parité `../fields`). */
  required?: boolean;
  placeholder?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  const colors = useE237Colors();
  const mode = useE237Mode();
  const selected = value ?? EMPTY;

  return (
    <View style={{ gap: spacing['1'] }}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <Host matchContents colorScheme={mode} seedColor={colors.accent}>
        <Picker
          selectedValue={selected}
          appearance="menu"
          onValueChange={(next) => {
            if (next === EMPTY) return;
            onChange(String(next));
          }}
        >
          <Picker.Item label={placeholder} value={EMPTY} />
          {options.map((o) => (
            <Picker.Item key={o.value} label={o.label} value={o.value} />
          ))}
        </Picker>
      </Host>
    </View>
  );
}
