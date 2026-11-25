// `cn` = gabung kelas + selesaikan bentrok Tailwind (setara tailwind-merge). Dikonfigurasi dengan
// utility token tema (Fase 6), supaya `text-h1` dikenali sebagai ukuran huruf (bukan warna teks)
// dan `rounded-card`/`duration-fast` bisa menimpa kelas sejenis. Utility tema baru → tambahkan di sini.
import { createCn } from "cn/config";

export const THEME_TEXT_SIZES = [
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "body-lg",
  "body",
  "body-sm",
  "caption",
  "label",
  "wordmark",
] as const;

export const THEME_RADII = ["card", "card-nested", "button", "input", "badge", "image", "dialog"] as const;

export const cn = createCn({
  extend: {
    theme: {
      text: [...THEME_TEXT_SIZES],
      radius: [...THEME_RADII],
      font: ["heading"],
      ease: ["standard"],
    },
    classGroups: {
      duration: [{ duration: ["fast", "base", "slow"] }],
    },
  },
});
