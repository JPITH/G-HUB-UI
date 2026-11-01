/**
 * Sheet backed by `@expo/ui` BottomSheet — même API que `../sheet`.
 */
import { BottomSheet, Host } from '@expo/ui';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { spacing, useE237Colors, useE237Mode } from '../core';
import { Txt } from '../text';

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const colors = useE237Colors();
  const mode = useE237Mode();
  return (
    <Host matchContents colorScheme={mode} seedColor={colors.accent}>
      <BottomSheet isPresented={open} onDismiss={onClose} showDragIndicator>
        <View style={{ padding: spacing['4'], gap: spacing['3'] }}>
          {title ? <Txt variant="heading">{title}</Txt> : null}
          {children}
        </View>
      </BottomSheet>
    </Host>
  );
}
