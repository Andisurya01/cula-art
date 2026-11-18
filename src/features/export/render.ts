import "server-only";
import type { ExportFile } from "./files";
import { jsonExportText } from "./json";
import {
  getArtworkExportRows,
  getContentExportRows,
  getExportTables,
  getFollowerExportRows,
  getIdeaExportRows,
  getPostExportRows,
} from "./queries";
import { artworksCsv, contentsCsv, followersCsv, ideasCsv, postsCsv } from "./sheets";

/** Isi file ekspor (dipanggil Route Handler setelah requireAdmin). */
export async function renderExportFile(file: ExportFile, now: Date): Promise<string> {
  switch (file) {
    case "ide.csv":
      return ideasCsv(await getIdeaExportRows());
    case "konten.csv":
      return contentsCsv(await getContentExportRows());
    case "post.csv":
      return postsCsv(await getPostExportRows());
    case "followers.csv":
      return followersCsv(await getFollowerExportRows());
    case "karya.csv":
      return artworksCsv(await getArtworkExportRows());
    case "data.json":
      return jsonExportText(await getExportTables(), now);
  }
}
