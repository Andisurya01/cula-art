// Format tampilan Galeri (fungsi murni, aman di client).

import type { Availability, Medium } from "@prisma/client";
import { galleryCopy } from "./copy";

const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** "Rp 1.500.000" (spasi tak terputus setelah Rp). */
export function formatPriceIdr(value: number): string {
  return priceFormatter.format(value);
}

/** "30 × 40 cm" atau "12 × 25 × 10 cm" (lebar × tinggi × tebal). Null jika tidak ada ukuran. */
export function formatDimensions(d: {
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
}): string | null {
  const parts = [d.widthCm, d.heightCm, d.depthCm].filter((v): v is number => v !== null && v > 0);
  if (parts.length === 0) return null;
  return `${parts.map((v) => numberFormatter.format(v)).join(" × ")} cm`;
}

/** Hanya digit; nomor yang diawali 0 atau +62 diubah ke 62…. Null jika tidak valid. */
export function normalizeWhatsapp(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  return /^62\d{8,13}$/.test(digits) ? digits : null;
}

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Tautan "Tanya karya ini": WhatsApp jika ada, cadangan email, atau null. */
export function inquiryLink(
  contact: { whatsapp: string | null; contactEmail: string | null },
  artwork: { title: string; url: string },
): { kind: "whatsapp" | "email"; href: string } | null {
  const message = galleryCopy.inquiry.message(artwork.title, artwork.url);
  const wa = normalizeWhatsapp(contact.whatsapp);
  if (wa) return { kind: "whatsapp", href: whatsappLink(wa, message) };
  if (contact.contactEmail) {
    return {
      kind: "email",
      href: mailtoLink(contact.contactEmail, galleryCopy.inquiry.emailSubject(artwork.title), message),
    };
  }
  return null;
}

function cleanHandle(handle: string | null | undefined): string | null {
  const clean = handle?.trim().replace(/^@+/, "");
  return clean && /^[\w.]{1,30}$/.test(clean) ? clean : null;
}

export function instagramUrl(handle: string | null | undefined): string | null {
  const h = cleanHandle(handle);
  return h ? `https://www.instagram.com/${h}/` : null;
}

export function tiktokUrl(handle: string | null | undefined): string | null {
  const h = cleanHandle(handle);
  return h ? `https://www.tiktok.com/@${h}` : null;
}

/**
 * Teks harga di kartu dan panel info: harga (jika boleh tampil), "Harga atas permintaan" untuk
 * Tersedia/Dipesan, atau null untuk Koleksi pribadi/Terjual (statusnya sudah tampil di badge).
 */
export function priceLabel(artwork: { availability: Availability; priceIdr: number | null }): string | null {
  if (artwork.priceIdr !== null) return formatPriceIdr(artwork.priceIdr);
  if (artwork.availability === "AVAILABLE" || artwork.availability === "RESERVED") {
    return galleryCopy.price.onRequest;
  }
  return null;
}

/** "Patung clay · 2026"; bagian yang kosong dilewati. */
export function artworkMeta(artwork: { medium: Medium | null; year: number | null }): string {
  return [artwork.medium ? galleryCopy.medium[artwork.medium] : null, artwork.year]
    .filter((part) => part !== null && part !== "")
    .join(" · ");
}

/** Paragraf dari teks bebas: dipisah baris kosong; baris tunggal tetap di dalam paragraf. */
export function paragraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Deskripsi meta (≤ `max` karakter, dipotong di batas kata). Null jika teks kosong. */
export function metaDescription(text: string | null | undefined, max = 160): string | null {
  const clean = text?.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}
