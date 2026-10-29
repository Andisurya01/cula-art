import Image from "next/image";
import { photoImage, type SizedPhotoSource } from "../photo";

/**
 * Gambar foto progres. Unggahan lewat `next/image` (/media/<key>, ukuran asli); URL lama lewat
 * `<img>` biasa. Dipasang di wadah `relative` berukuran tetap (kelas default: isi penuh, crop).
 */
export function ProgressPhotoImage({
  photo,
  alt,
  sizes,
  className = "absolute inset-0 size-full object-cover",
}: {
  photo: SizedPhotoSource;
  alt: string;
  sizes: string;
  className?: string;
}) {
  const image = photoImage(photo);
  if (image.kind === "upload") {
    return image.size ? (
      <Image
        src={image.src}
        alt={alt}
        width={image.size.width}
        height={image.size.height}
        sizes={sizes}
        className={className}
      />
    ) : (
      <Image src={image.src} alt={alt} fill sizes={sizes} className={className} />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.src} alt={alt} loading="lazy" className={className} />
  );
}
