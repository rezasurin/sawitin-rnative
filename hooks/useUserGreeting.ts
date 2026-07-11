import { useAuthStore } from '@/stores/useAuthStore';

export function useUserGreeting() {
  const user = useAuthStore((s) => s.user);

  const displayName = user?.member?.nama || user?.username || 'User';
  const greeting = `Hai, ${displayName}`;
  
  return {
    displayName,
    greeting,
    user,
  };
}
