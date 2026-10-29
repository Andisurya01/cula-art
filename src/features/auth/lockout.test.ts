import { describe, expect, it } from "vitest";
import { attemptKeys, ipGroup, lockedMessage, lockedUntil, type LoginAttemptRecord } from "./lockout";

const T0 = new Date("2026-10-28T10:00:00Z").getTime();
const at = (minutes: number) => new Date(T0 + minutes * 60_000);
const fail = (minutes: number): LoginAttemptRecord => ({ success: false, createdAt: at(minutes) });
const success = (minutes: number): LoginAttemptRecord => ({ success: true, createdAt: at(minutes) });

describe("lockedUntil", () => {
  it("tanpa percobaan atau < 5 gagal: tidak terkunci", () => {
    expect(lockedUntil([], at(0))).toBeNull();
    expect(lockedUntil([fail(0), fail(1), fail(2), fail(3)], at(4))).toBeNull();
  });

  it("5 gagal dalam 15 menit → terkunci 15 menit sejak kegagalan ke-5", () => {
    const attempts = [fail(0), fail(2), fail(4), fail(6), fail(8)];
    expect(lockedUntil(attempts, at(9))).toEqual(at(23));
    expect(lockedUntil(attempts, at(22.9))).toEqual(at(23));
    expect(lockedUntil(attempts, at(23))).toBeNull();
  });

  it("tepat di batas 15 menit masih dihitung satu rentang", () => {
    expect(lockedUntil([fail(0), fail(5), fail(10), fail(12), fail(15)], at(16))).toEqual(at(30));
  });

  it("5 gagal tersebar lebih dari 15 menit tidak mengunci", () => {
    expect(lockedUntil([fail(0), fail(4), fail(8), fail(12), fail(16)], at(17))).toBeNull();
  });

  it("login sukses mengosongkan hitungan", () => {
    const attempts = [fail(0), fail(1), fail(2), fail(3), success(4), fail(5)];
    expect(lockedUntil(attempts, at(6))).toBeNull();
    expect(lockedUntil([...attempts, fail(6), fail(7), fail(8), fail(9)], at(10))).toEqual(at(24));
  });

  it("urutan input tidak berpengaruh", () => {
    const attempts = [fail(8), fail(0), fail(6), fail(2), fail(4)];
    expect(lockedUntil(attempts, at(9))).toEqual(at(23));
  });

  it("gagal ke-6 dan seterusnya (jika tercatat) memakai kunci yang paling lama", () => {
    const attempts = [fail(0), fail(1), fail(2), fail(3), fail(4), fail(10)];
    expect(lockedUntil(attempts, at(11))).toEqual(at(25));
  });
});

describe("pesan dan key", () => {
  it("pesan menyebut sisa menit (dibulatkan ke atas, minimal 1)", () => {
    expect(lockedMessage(at(23), at(9))).toMatch(/14 menit/);
    expect(lockedMessage(at(23), at(22.99))).toMatch(/1 menit/);
  });

  it("key per IP dan per email (huruf kecil)", () => {
    expect(attemptKeys({ ip: "203.0.113.7", email: " Andi@Contoh.ID " })).toEqual([
      "ip:203.0.113.7",
      "email:andi@contoh.id",
    ]);
  });
});

describe("ipGroup", () => {
  it.each([
    ["203.0.113.7", "203.0.113.7"],
    ["::ffff:203.0.113.7", "203.0.113.7"],
    ["2001:db8:abcd:12:1:2:3:4", "2001:db8:abcd:12::/64"],
    ["2001:db8:abcd:12:ffff::9", "2001:db8:abcd:12::/64"],
    ["2001:DB8:ABCD:0012::1", "2001:db8:abcd:12::/64"],
    ["[2001:db8::1]", "2001:db8:0:0::/64"],
    ["fe80::1%eth0", "fe80:0:0:0::/64"],
    ["::1", "0:0:0:0::/64"],
    ["unknown", "unknown"],
  ])("%s → %s", (ip, group) => {
    expect(ipGroup(ip)).toBe(group);
  });

  it("dua alamat dalam /64 yang sama berbagi kunci", () => {
    expect(attemptKeys({ ip: "2001:db8:1:2::a", email: "x@y.z" })[0]).toBe(
      attemptKeys({ ip: "2001:db8:1:2:ffff:ffff:ffff:ffff", email: "x@y.z" })[0],
    );
  });
});
