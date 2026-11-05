// Helper tampilan Asisten AI (client dan server).

/** US$ dengan format Indonesia: 0.0432 → "US$0,043"; 1.5 → "US$1,50". Biaya < 1 sen tetap terlihat. */
export function formatUsd(value: number): string {
  const digits = value > 0 && value < 0.1 ? 3 : 2;
  return `US$${value.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: digits })}`;
}

/** Nama kategori dari hasil AI → id di form (tanpa peduli huruf besar/spasi). null jika tidak ada. */
export function idByName(items: readonly { id: string; name: string }[], name: string | null | undefined): string | null {
  const key = name?.trim().toLowerCase();
  if (!key) return null;
  return items.find((item) => item.name.trim().toLowerCase() === key)?.id ?? null;
}
