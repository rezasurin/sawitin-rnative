import { useSegments } from 'expo-router';

type Group = '(admin)' | '(asisten)' | '(mandor)' | '(krani)';

/**
 * Keep shared module screens inside the navigation group that opened them.
 * Administrator re-exports every module; `alsoIn` names the other groups that
 * re-export this one, so only routes that exist there are ever linked.
 */
export function useModuleGroup<T extends Group, A extends Group = never>(fallback: T, ...alsoIn: A[]): T | A | '(admin)' {
  const group = useSegments()[0];
  return group === '(admin)' || (alsoIn as string[]).includes(group) ? group as A | '(admin)' : fallback;
}
