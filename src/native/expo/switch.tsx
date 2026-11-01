/**
 * Ligne de réglage avec Switch natif `@expo/ui`.
 */
import type { ComponentProps } from 'react';
import { Host, Switch } from '@expo/ui';
import { View } from 'react-native';
import { useE237Colors, useE237Mode } from '../core';

export function SwitchRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const colors = useE237Colors();
  const mode = useE237Mode();
  return (
    <View style={{ minHeight: 44, justifyContent: 'center' }}>
      <Host matchContents colorScheme={mode} seedColor={colors.accent}>
        <Switch
          label={label}
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
        />
      </Host>
    </View>
  );
}

/** Interrupteur seul, dans le même thème que les autres contrôles natifs. */
export function ExpoSwitch(props: ComponentProps<typeof Switch>) {
  const colors = useE237Colors();
  const mode = useE237Mode();
  return (
    <Host matchContents colorScheme={mode} seedColor={colors.accent}>
      <Switch {...props} />
    </Host>
  );
}
