// Integrasi: daftar proyek untuk "Ide dari proyek" di Bank Ide.

import { beforeEach, describe, expect, it } from "vitest";
import { db, resetDatabase } from "@/test/db";
import { getUnfinishedProjectOptions } from "./queries";

beforeEach(resetDatabase);

describe("getUnfinishedProjectOptions", () => {
  it("tanpa proyek Selesai, terbaru diperbarui dulu, hanya id/judul/medium", async () => {
    const at = (day: number) => new Date(`2026-10-${String(day).padStart(2, "0")}T00:00:00Z`);
    await db.project.createMany({
      data: [
        { title: "Naga", medium: "CLAY", stage: "IN_PROGRESS", updatedAt: at(10) },
        { title: "Sketsa kota", medium: "DRAWING", stage: "PLANNING", updatedAt: at(20) },
        { title: "Kucing jadi", medium: "CLAY", stage: "DONE", updatedAt: at(25) },
        { title: "Burung", medium: "MIXED", stage: "PAUSED", updatedAt: at(5) },
      ],
    });

    const projects = await getUnfinishedProjectOptions();
    expect(projects.map((p) => p.title)).toEqual(["Sketsa kota", "Naga", "Burung"]);
    expect(Object.keys(projects[0]).sort()).toEqual(["id", "medium", "title"]);
    expect(projects[0].medium).toBe("DRAWING");
  });

  it("kosong jika belum ada proyek berjalan", async () => {
    await db.project.create({ data: { title: "Selesai", medium: "CLAY", stage: "DONE" } });
    expect(await getUnfinishedProjectOptions()).toEqual([]);
  });
});
