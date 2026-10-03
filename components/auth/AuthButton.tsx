import React from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { Button } from '@/components/core/Button';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'text';
}

const VARIANT_MAP = {
  primary: 'primary',
  secondary: 'secondary',
  text: 'ghost',
} as const;

export default function AuthButton({
  variant = 'primary',
  ...props
}: AuthButtonProps) {
  return <Button variant={VARIANT_MAP[variant]} {...props} />;
}
