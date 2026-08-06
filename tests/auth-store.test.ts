import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  clearStoredToken: vi.fn(),
  getMe: vi.fn(),
  getStoredToken: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  registerParent: vi.fn()
}));

vi.mock("../src/services/api", () => api);

describe("authentication store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("restores a valid session exactly once", async () => {
    api.getStoredToken.mockReturnValue("stored-token");
    api.getMe.mockResolvedValue({ id: "p1", username: "parent", displayName: "家长", role: "parent" });
    const { useAuthStore } = await import("../src/store/auth");
    const auth = useAuthStore();

    await auth.bootstrap();
    await auth.bootstrap();

    expect(auth.user?.username).toBe("parent");
    expect(auth.initialized).toBe(true);
    expect(api.getMe).toHaveBeenCalledTimes(1);
  });

  it("clears an expired session and always permits local sign-out", async () => {
    api.getStoredToken.mockReturnValue("expired-token");
    api.getMe.mockRejectedValue(new Error("Unauthorized"));
    api.logout.mockRejectedValue(new Error("offline"));
    const { useAuthStore } = await import("../src/store/auth");
    const auth = useAuthStore();

    await auth.bootstrap();
    expect(api.clearStoredToken).toHaveBeenCalled();
    await auth.signOut();
    expect(auth.user).toBeNull();
    expect(auth.initialized).toBe(true);
  });

  it("resets loading after failed login", async () => {
    api.login.mockRejectedValue(new Error("Invalid username or password"));
    const { useAuthStore } = await import("../src/store/auth");
    const auth = useAuthStore();

    await expect(auth.signIn("parent", "wrong")).rejects.toThrow("Invalid username");
    expect(auth.loading).toBe(false);
  });
});
