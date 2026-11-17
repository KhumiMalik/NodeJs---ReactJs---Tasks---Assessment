import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type { LoginInput, RegisterInput, User } from '../types/auth';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

/**
 * The server is the source of truth for authentication: this query asks
 * GET /api/auth/me and caches the answer. There is no separate auth state.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => authService.me(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** Replaces all cached data with the newly authenticated user (no data from a previous user survives). */
function useSetAuthenticatedUser() {
  const queryClient = useQueryClient();
  return (user: User | null) => {
    queryClient.clear();
    queryClient.setQueryData(authKeys.me, user);
  };
}

export function useLogin() {
  const setUser = useSetAuthenticatedUser();
  return useMutation({ mutationFn: (input: LoginInput) => authService.login(input), onSuccess: setUser });
}

export function useRegister() {
  const setUser = useSetAuthenticatedUser();
  return useMutation({ mutationFn: (input: RegisterInput) => authService.register(input), onSuccess: setUser });
}

export function useLogout() {
  const setUser = useSetAuthenticatedUser();
  return useMutation({ mutationFn: () => authService.logout(), onSettled: () => setUser(null) });
}
