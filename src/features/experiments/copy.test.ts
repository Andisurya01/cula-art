import { describe, expect, it } from "vitest";
import { comparisonStatusText, PROPOSAL_DISCLAIMER, proposalReasonText, waitingH7Text } from "./copy";

const stats = { count: 2, median: 10, values: [] };

describe("copy eksperimen", () => {
  it("status singkat per keadaan perbandingan", () => {
    expect(comparisonStatusText({ status: "EMPTY" })).toBe("Belum ada post");
    expect(comparisonStatusText({ status: "WAITING_H7", waitingCount: 3, total: 4 })).toBe("Menunggu H+7 untuk 3 post");
    expect(
      comparisonStatusText({ status: "READY", a: stats, b: stats, diffPercent: 0, proposal: "INCONCLUSIVE", reason: "TOO_CLOSE" }),
    ).toBe("Siap disimpulkan · usulan Belum jelas");
  });

  it("alasan usulan menyebut batas dari lib/analytics", () => {
    expect(proposalReasonText("NOT_ENOUGH_POSTS")).toContain("minimal 2 post per varian");
    expect(proposalReasonText("B_BETTER")).toBe("Median B unggul minimal 10% dari A.");
    expect(proposalReasonText("A_BETTER")).toBe("Median A unggul minimal 10% dari B.");
    expect(proposalReasonText("TOO_CLOSE")).toBe("Selisih median kurang dari 10%.");
  });

  it("penafian: bukan uji statistik, keputusan di tangan pengguna", () => {
    expect(PROPOSAL_DISCLAIMER).toContain("bukan uji statistik");
    expect(PROPOSAL_DISCLAIMER).toContain("Keputusan akhir tetap di tanganmu");
    expect(waitingH7Text(1)).toBe("Menunggu H+7 untuk 1 post");
  });
});
