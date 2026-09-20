import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { ColorValue } from 'react-native';

interface TabBarIconProps {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: ColorValue;
}

export function TabBarIcon({ name, color }: TabBarIconProps) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} name={name} color={color} />;
}
