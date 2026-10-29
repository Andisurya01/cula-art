// Pengganti `next/headers` untuk test sesi. Pakai di file test:
//   vi.mock("next/headers", async () => (await import("@/test/next-headers")).nextHeadersMock());

type CookieOptions = Record<string, unknown>;

export const fakeRequest = {
  cookies: new Map<string, { value: string; options?: CookieOptions }>(),
  headers: new Headers(),
  reset() {
    this.cookies.clear();
    this.headers = new Headers({ "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0", "x-forwarded-for": "203.0.113.7" });
  },
};

function cookieStore() {
  return {
    get(name: string) {
      const entry = fakeRequest.cookies.get(name);
      return entry ? { name, value: entry.value } : undefined;
    },
    has(name: string) {
      return fakeRequest.cookies.has(name);
    },
    set(name: string, value: string, options?: CookieOptions) {
      fakeRequest.cookies.set(name, { value, options });
    },
    delete(name: string) {
      fakeRequest.cookies.delete(name);
    },
  };
}

export function nextHeadersMock() {
  return {
    cookies: async () => cookieStore(),
    headers: async () => fakeRequest.headers,
  };
}
