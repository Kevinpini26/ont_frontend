import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// sessionStorage plutôt que localStorage (défaut de persist) : le jeton
// reste lisible par du JavaScript malveillant en cas de XSS dans les deux
// cas — une vraie protection demanderait un cookie HttpOnly émis par le
// backend, qui impliquerait de faire basculer Sanctum en mode SPA à
// cookies (CSRF, credentials, domaines "stateful") — mais au moins il ne
// survit plus à la fermeture de l'onglet ni ne se partage entre onglets,
// contrairement à localStorage.
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      expiresAt: null,

      setSession: (user, token, expiresAt = null) => set({ user, token, expiresAt }),

      setUser: (user) => set({ user }),

      logout: (callApi = true) => {
        if (callApi) {
          import('../api/authApi').then(({ logout }) => logout().catch(() => {}));
        }
        set({ user: null, token: null, expiresAt: null });
      },
    }),
    {
      name: 'ont-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, token: state.token, expiresAt: state.expiresAt }),
    },
  ),
);

export function hasRole(user, ...roles) {
  return !!user && roles.includes(user.role);
}

export function hasPoste(user, ...postes) {
  return !!user && postes.includes(user.poste);
}
