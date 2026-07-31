import { defineStore } from "pinia";
import { ref } from "vue";
import { clearStoredToken, getMe, getStoredToken, login, logout, registerParent } from "../services/api";
import type { RegisterPayload, User } from "../types/task";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const initialized = ref(false);
  const loading = ref(false);

  async function bootstrap() {
    if (initialized.value) return;

    if (getStoredToken()) {
      try {
        user.value = await getMe();
      } catch {
        clearStoredToken();
      }
    }
    initialized.value = true;
  }

  async function signIn(username: string, password: string) {
    loading.value = true;
    try {
      user.value = await login(username, password);
      initialized.value = true;
      return user.value;
    } finally {
      loading.value = false;
    }
  }

  async function register(payload: RegisterPayload) {
    loading.value = true;
    try {
      user.value = await registerParent(payload);
      initialized.value = true;
      return user.value;
    } finally {
      loading.value = false;
    }
  }

  async function signOut() {
    try {
      await logout();
    } catch {
      // Local sign-out remains available when the network is unavailable.
    } finally {
      clearStoredToken();
      user.value = null;
      initialized.value = true;
    }
  }

  return { user, initialized, loading, bootstrap, register, signIn, signOut };
});
