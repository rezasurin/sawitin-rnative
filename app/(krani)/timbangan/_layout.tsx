import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'index' };

export default function TimbanganLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="scan" />
      <Stack.Screen name="add" />
      <Stack.Screen name="[detailId]" />
    </Stack>
  );
}
