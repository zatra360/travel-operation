import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isPlatformSuperAdmin: boolean;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  role: string;
  settings?: { defaultCurrency?: string; dateFormat?: string; timezone?: string };
}

interface BranchInfo {
  id: string;
  name: string;
  code: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  tenants: TenantInfo[];
  activeTenant: TenantInfo | null;
  activeBranch: BranchInfo | null;
  isAuthenticated: boolean;
  permissions: string[];
  isPlatformSuperAdmin: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string, tenants: TenantInfo[]) => void;
  setAccessToken: (token: string) => void;
  setActiveTenant: (tenant: TenantInfo) => void;
  setActiveBranch: (branch: BranchInfo | null) => void;
  setPermissions: (permissions: string[], isPlatformSuperAdmin: boolean) => void;
  logout: () => void;
}

let _refreshToken: string | null = null;

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return _refreshToken || localStorage.getItem('refreshToken');
}

function setRefreshToken(token: string) {
  _refreshToken = token;
  localStorage.setItem('refreshToken', token);
}

function clearRefreshToken() {
  _refreshToken = null;
  localStorage.removeItem('refreshToken');
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      tenants: [],
      activeTenant: null,
      activeBranch: null,
      isAuthenticated: false,
      permissions: [],
      isPlatformSuperAdmin: false,

      setAuth: (user, accessToken, refreshToken, tenants) => {
        localStorage.setItem('accessToken', accessToken);
        setRefreshToken(refreshToken);
        set({
          user,
          accessToken,
          tenants,
          isAuthenticated: true,
          activeTenant: tenants.length > 0 ? tenants[0] : null,
          isPlatformSuperAdmin: user.isPlatformSuperAdmin,
        });
      },

      setAccessToken: (accessToken) => {
        localStorage.setItem('accessToken', accessToken);
        set({ accessToken });
      },

      setActiveTenant: (tenant) => set({ activeTenant: tenant, activeBranch: null, permissions: [] }),

      setActiveBranch: (branch) => set({ activeBranch: branch }),

      setPermissions: (permissions, isPlatformSuperAdmin) => set({ permissions, isPlatformSuperAdmin }),

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('travelo-auth');
        clearRefreshToken();
        set({
          user: null,
          accessToken: null,
          tenants: [],
          activeTenant: null,
          activeBranch: null,
          isAuthenticated: false,
          permissions: [],
          isPlatformSuperAdmin: false,
        });
        window.location.href = '/login';
      },
    }),
    {
      name: 'travelo-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        tenants: state.tenants,
        activeTenant: state.activeTenant,
        activeBranch: state.activeBranch,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
        isPlatformSuperAdmin: state.isPlatformSuperAdmin,
      }),
    },
  ),
);

/**
 * Convenience helper: check whether the current user holds a given permission.
 * Reads from the store's persistent state so it is safe to call outside React.
 */
export function hasPermission(permission: string): boolean {
  const { permissions, isPlatformSuperAdmin } = useAuthStore.getState();
  if (isPlatformSuperAdmin || permissions.includes('*')) return true;
  return permissions.includes(permission);
}

export function getDefaultCurrency(): string {
  const { activeTenant } = useAuthStore.getState();
  return (activeTenant?.settings?.defaultCurrency) || 'USD';
}
