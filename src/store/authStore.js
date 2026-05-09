import { create } from 'zustand';

const TOKEN_KEY = 'smartload_auth_token';
const USER_KEY = 'smartload_auth_user';

function readUserFromStorage() {
  const value = localStorage.getItem(USER_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (_error) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export const useAuthStore = create((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: readUserFromStorage(),
  setAuth: ({ token, user }) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null });
  },
}));
