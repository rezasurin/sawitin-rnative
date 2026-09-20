import { useSegments } from 'expo-router';

/** Keep shared module screens inside the navigation group that opened them. */
export function useModuleGroup<T extends '(mandor)' | '(krani)'>(fallback: T): T | '(admin)' {
  const segments = useSegments();
  return segments[0] === '(admin)' ? '(admin)' : fallback;
}
