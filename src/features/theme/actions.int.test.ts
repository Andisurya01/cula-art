// Integrasi ke database test: simpan, baca, reset tema; payload jahat dan akses tanpa login ditolak.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { db, resetDatabase } from "@/test/db";
import { requireAdmin } from "@/features/auth/dal";
import { buildThemeCss } from "@/lib/theme/css";
import { defaultThemeTokens } from "@/lib/theme/defaults";
import { resetTheme, saveTheme } from "./actions";
import { getTheme, getThemeSettings, THEME_SETTING_ID } from "./queries";

vi.mock("@/features/auth/dal", () => ({
  requireAdmin: vi.fn(async () => ({ sessionId: "s", user: { id: "u", email: "a@b.c" } })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// `getTheme` memakai React `cache`; di luar request React tidak ada cache, jadi setiap panggilan membaca DB.

function custom() {
  const t = defaultThemeTokens();
  t.colors.light.primary = "#1463ff";
  t.colors.dark.bentoLime = "#B8E62E";
  t.shape.card = 16;
  t.typography.headingFont = "space-grotesk";
  t.typography.levels.h1.sizeDesktop = 80;
  t.defaultMode = "dark";
  return t;
}

beforeEach(async () => {
  await resetDatabase();
  vi.mocked(revalidatePath).mockClear();
  vi.mocked(requireAdmin).mockClear();
});

describe("getTheme", () => {
  it("tanpa baris → tampilan awal, tanpa membuat baris", async () => {
    expect(await getTheme()).toEqual(defaultThemeTokens());
    expect(await db.themeSetting.count()).toBe(0);
    const settings = await getThemeSettings();
    expect(settings.isCustomized).toBe(false);
  });

  it("JSON rusak, nilai jahat, atau versi lain di DB → tampilan awal", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const [version, tokensJson] of [
      [1, "{rusak"],
      [1, JSON.stringify({ ...defaultThemeTokens(), colors: { light: { primary: "red;}body{" } } })],
      [2, JSON.stringify(defaultThemeTokens())],
    ] as const) {
      await db.themeSetting.upsert({
        where: { id: THEME_SETTING_ID },
        create: { id: THEME_SETTING_ID, version, tokensJson },
        update: { version, tokensJson },
      });
      const theme = await getTheme();
      expect(theme).toEqual(defaultThemeTokens());
      expect(buildThemeCss(theme)).not.toContain("red;");
    }
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("saveTheme", () => {
  it("menyimpan, menormalkan hex, dan me-revalidate seluruh situs", async () => {
    const result = await saveTheme(custom());
    expect(result.ok).toBe(true);
    expect(requireAdmin).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");

    const theme = await getTheme();
    expect(theme.colors.light.primary).toBe("#1463FF");
    expect(theme.shape.card).toBe(16);
    expect(theme.typography.headingFont).toBe("space-grotesk");
    expect(theme.defaultMode).toBe("dark");
    expect(buildThemeCss(theme)).toContain("--shape-card:16px");
    expect((await getThemeSettings()).isCustomized).toBe(true);
  });

  it("simpan kedua memperbarui baris yang sama", async () => {
    await saveTheme(custom());
    const next = custom();
    next.shape.card = 32;
    expect((await saveTheme(next)).ok).toBe(true);
    expect(await db.themeSetting.count()).toBe(1);
    expect((await getTheme()).shape.card).toBe(32);
  });

  it("simpan paralel pada tabel kosong tidak gagal", async () => {
    const results = await Promise.all([saveTheme(custom()), saveTheme(custom()), saveTheme(custom())]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(await db.themeSetting.count()).toBe(1);
  });

  it("payload jahat dari luar form ditolak dan tidak menyentuh DB", async () => {
    await saveTheme(custom());
    const before = await db.themeSetting.findUniqueOrThrow({ where: { id: THEME_SETTING_ID } });
    const payloads: unknown[] = [
      { ...custom(), colors: { ...custom().colors, light: { ...custom().colors.light, primary: "red;}body{display:none}" } } },
      { ...custom(), typography: { ...custom().typography, headingFont: "x;}</style><script>alert(1)</script>" } },
      { ...custom(), motion: { ...custom().motion, easing: "steps(1);}*{" } },
      { ...custom(), extra: "body{}" },
      "bukan objek",
      null,
    ];
    for (const payload of payloads) {
      const result = await saveTheme(payload);
      expect(result.ok).toBe(false);
    }
    const after = await db.themeSetting.findUniqueOrThrow({ where: { id: THEME_SETTING_ID } });
    expect(after.tokensJson).toBe(before.tokensJson);
    expect(after.tokensJson).not.toContain("script");
  });

  it("tanpa login: requireAdmin melempar, tidak ada yang tersimpan", async () => {
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(saveTheme(custom())).rejects.toThrow("NEXT_REDIRECT");
    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("NEXT_REDIRECT"));
    await expect(resetTheme()).rejects.toThrow("NEXT_REDIRECT");
    expect(await db.themeSetting.count()).toBe(0);
  });
});

describe("resetTheme", () => {
  it("menghapus baris → tampilan awal lagi", async () => {
    await saveTheme(custom());
    const result = await resetTheme();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.tokens).toEqual(defaultThemeTokens());
    expect(await db.themeSetting.count()).toBe(0);
    expect(await getTheme()).toEqual(defaultThemeTokens());
    expect(revalidatePath).toHaveBeenLastCalledWith("/", "layout");
  });

  it("reset tanpa baris tetap berhasil", async () => {
    expect((await resetTheme()).ok).toBe(true);
  });
});
