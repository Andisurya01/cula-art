// Bentuk data publik Galeri (DTO). Hanya field yang boleh dilihat pengunjung; tidak ada id
// internal, status Draft, catatan Studio, berat, atau harga yang disembunyikan.

import type { Availability, Medium, Platform } from "@prisma/client";

export type GalleryImage = { src: string; width: number; height: number; alt: string };

export type GalleryArtworkCard = {
  slug: string;
  title: string;
  medium: Medium | null;
  year: number | null;
  availability: Availability;
  /** Hanya terisi jika `showPrice` dan karya tidak berstatus Koleksi pribadi. */
  priceIdr: number | null;
  cover: GalleryImage | null;
};

export type GalleryProcessLink = { platform: Platform; url: string };

export type GalleryArtworkDetail = GalleryArtworkCard & {
  summary: string | null;
  description: string | null;
  widthCm: number | null;
  heightCm: number | null;
  depthCm: number | null;
  materials: string | null;
  /** Foto karya jadi, cover lebih dulu. */
  images: GalleryImage[];
  /** Foto progres terpilih (bagian Proses). */
  processImages: GalleryImage[];
  /** Tautan post TikTok/Instagram dari konten Posted yang dipilih sebagai video proses. */
  processLinks: GalleryProcessLink[];
  publishedAt: Date | null;
  updatedAt: Date;
};

export type GalleryProfile = {
  siteName: string;
  tagline: string | null;
  bio: string | null;
  aboutText: string | null;
  avatarSrc: string | null;
  city: string | null;
  whatsapp: string | null;
  contactEmail: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
};
