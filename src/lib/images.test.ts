import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  detectImageType,
  IMAGE_ERRORS,
  imageProblem,
  MAX_UPLOAD_BYTES,
  processImage,
  renderOgImage,
} from "./images";

/** JPEG polos dari sharp. */
async function plainJpeg(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } })
    .jpeg()
    .toBuffer();
}

/**
 * Sisipkan segmen APP1 EXIF berisi IFD GPS (lintang 6°12'30" S) tepat setelah SOI.
 * Dibuat manual supaya test tidak bergantung pada foto HP sungguhan.
 */
function withGpsExif(jpeg: Buffer): Buffer {
  const tiff = Buffer.alloc(8 + 18 + 4 + 30 + 4 + 24);
  let o = 0;
  tiff.write("II", o); // little-endian
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4); // offset IFD0
  o = 8;
  tiff.writeUInt16LE(1, o); // IFD0: 1 entri
  tiff.writeUInt16LE(0x8825, o + 2); // GPSInfo
  tiff.writeUInt16LE(4, o + 4); // LONG
  tiff.writeUInt32LE(1, o + 6);
  const gpsOffset = 8 + 2 + 12 + 4;
  tiff.writeUInt32LE(gpsOffset, o + 10);
  tiff.writeUInt32LE(0, o + 14); // next IFD
  o = gpsOffset;
  tiff.writeUInt16LE(2, o); // GPS IFD: 2 entri
  tiff.writeUInt16LE(0x0001, o + 2); // GPSLatitudeRef
  tiff.writeUInt16LE(2, o + 4); // ASCII
  tiff.writeUInt32LE(2, o + 6);
  tiff.write("S\0", o + 10, "latin1");
  tiff.writeUInt16LE(0x0002, o + 14); // GPSLatitude
  tiff.writeUInt16LE(5, o + 16); // RATIONAL
  tiff.writeUInt32LE(3, o + 18);
  const ratOffset = o + 2 + 24 + 4;
  tiff.writeUInt32LE(ratOffset, o + 22);
  tiff.writeUInt32LE(0, o + 26);
  [6, 1, 12, 1, 30, 1].forEach((v, i) => tiff.writeUInt32LE(v, ratOffset + i * 4));

  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const header = Buffer.alloc(4);
  header.writeUInt16BE(0xffe1, 0);
  header.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), header, payload, jpeg.subarray(2)]);
}

describe("detectImageType (dari isi file)", () => {
  it("JPEG, PNG, WebP dikenali dari magic bytes", async () => {
    const base = sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } });
    expect(detectImageType(await base.clone().jpeg().toBuffer())).toBe("jpeg");
    expect(detectImageType(await base.clone().png().toBuffer())).toBe("png");
    expect(detectImageType(await base.clone().webp().toBuffer())).toBe("webp");
  });

  it("HEIC/AVIF dan file lain tidak lolos walau namanya .jpg", () => {
    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic", "latin1"), Buffer.alloc(16)]);
    expect(detectImageType(heic)).toBe("heic");
    expect(imageProblem(heic)).toBe(IMAGE_ERRORS.heic);
    const avif = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypavif", "latin1"), Buffer.alloc(16)]);
    expect(imageProblem(avif)).toBe(IMAGE_ERRORS.unsupported);
    expect(imageProblem(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBe(IMAGE_ERRORS.unsupported);
    expect(imageProblem(Buffer.from("GIF89a....."))).toBe(IMAGE_ERRORS.unsupported);
    expect(imageProblem(Buffer.alloc(0))).toBe(IMAGE_ERRORS.empty);
  });

  it("lebih dari 15 MB ditolak", () => {
    const big = Buffer.alloc(MAX_UPLOAD_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(imageProblem(big)).toBe(IMAGE_ERRORS.tooLarge);
  });
});

describe("processImage", () => {
  it("EXIF/GPS hilang setelah diproses", async () => {
    const input = withGpsExif(await plainJpeg(64, 48));
    const before = await sharp(input).metadata();
    expect(before.exif?.includes(Buffer.from("Exif\0\0", "latin1"))).toBe(true);

    const { data } = await processImage(input);
    const after = await sharp(data).metadata();
    expect(after.format).toBe("webp");
    expect(after.exif).toBeUndefined();
    expect(after.icc).toBeUndefined();
    expect(after.xmp).toBeUndefined();
    expect(data.includes(Buffer.from("Exif", "latin1"))).toBe(false);
    expect(data.includes(Buffer.from("EXIF", "latin1"))).toBe(false);
  });

  it("orientasi EXIF diterapkan ke piksel lalu tag-nya dibuang", async () => {
    const rotated = await sharp(await plainJpeg(200, 100)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    expect((await sharp(rotated).metadata()).orientation).toBe(6);

    const result = await processImage(rotated);
    expect([result.width, result.height]).toEqual([100, 200]);
    expect((await sharp(result.data).metadata()).orientation).toBeUndefined();
  });

  it("sisi terpanjang dikecilkan ke 2400 px, foto kecil tidak diperbesar", async () => {
    const big = await processImage(await plainJpeg(3000, 1500));
    expect([big.width, big.height]).toEqual([2400, 1200]);
    const small = await processImage(await plainJpeg(800, 600));
    expect([small.width, small.height]).toEqual([800, 600]);
  });

  it("file rusak → pesan yang ramah", async () => {
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100, 7)]);
    await expect(processImage(broken)).rejects.toThrow(IMAGE_ERRORS.corrupt);
  });
});

describe("renderOgImage", () => {
  it("JPEG 1200×630 tanpa metadata dari foto potret; tanpa foto → bidang polos", async () => {
    const { data } = await processImage(await plainJpeg(800, 1000));
    const og = await sharp(await renderOgImage(data)).metadata();
    expect([og.format, og.width, og.height, og.exif]).toEqual(["jpeg", 1200, 630, undefined]);
    const blank = await sharp(await renderOgImage(null)).metadata();
    expect([blank.format, blank.width, blank.height]).toEqual(["jpeg", 1200, 630]);
  });
});
