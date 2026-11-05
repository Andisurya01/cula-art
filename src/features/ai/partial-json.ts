// JSON yang belum selesai di-stream → objek sementara, supaya panel bisa menampilkan teks yang sedang ditulis.
// Berbeda dari pengurai parsial SDK, string nilai yang belum ditutup tetap dipakai (dipotong di tempat).
// Kunci objek yang belum lengkap, nilai literal/angka yang terpotong, dan koma/titik dua di akhir dibuang.

type ScanState = {
  stack: ("{" | "[")[];
  /** Per kontainer: objek sedang menunggu kunci (bukan nilai). */
  expectKey: boolean[];
  inString: boolean;
  escape: boolean;
  stringStart: number;
  stringIsKey: boolean;
};

function scan(text: string): ScanState {
  const state: ScanState = { stack: [], expectKey: [], inString: false, escape: false, stringStart: -1, stringIsKey: false };
  const top = () => state.stack.length - 1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (state.inString) {
      if (state.escape) state.escape = false;
      else if (ch === "\\") state.escape = true;
      else if (ch === '"') state.inString = false;
      continue;
    }
    if (ch === '"') {
      state.inString = true;
      state.stringStart = i;
      state.stringIsKey = state.stack[top()] === "{" && state.expectKey[top()] === true;
    } else if (ch === "{" || ch === "[") {
      state.stack.push(ch);
      state.expectKey.push(ch === "{");
    } else if (ch === "}" || ch === "]") {
      state.stack.pop();
      state.expectKey.pop();
    } else if (ch === ":") {
      state.expectKey[top()] = false;
    } else if (ch === "," && state.stack[top()] === "{") {
      state.expectKey[top()] = true;
    }
  }
  return state;
}

const TRAILING_KEY = /"(?:[^"\\]|\\.)*"\s*$/;
const PARTIAL_LITERAL = /(^|[[{,:\s])(?:t|tr|tru|f|fa|fal|fals|n|nu|nul)$/;
const PARTIAL_NUMBER_END = /(^|[[{,:\s])-$|(\d)[.eE+-]+$/;

function completeJson(text: string): string {
  let s = text;
  const state = scan(s);
  if (state.inString) {
    if (state.stringIsKey) {
      s = s.slice(0, state.stringStart);
    } else {
      if (state.escape) s = s.slice(0, -1); // backslash tunggal di akhir
      s = s.replace(/\\u[0-9a-fA-F]{0,3}$/, "");
      s += '"';
    }
  }

  for (;;) {
    const before = s;
    s = s.trimEnd();
    if (s.endsWith(",")) s = s.slice(0, -1);
    else if (s.endsWith(":")) s = s.slice(0, -1).replace(TRAILING_KEY, "");
    else if (PARTIAL_LITERAL.test(s)) s = s.replace(PARTIAL_LITERAL, "$1");
    else if (PARTIAL_NUMBER_END.test(s)) s = s.replace(PARTIAL_NUMBER_END, "$1$2");
    else {
      // Kunci lengkap tanpa titik dua: {"a":1,"b"
      const after = scan(s);
      const i = after.stack.length - 1;
      if (after.stack[i] === "{" && after.expectKey[i] && TRAILING_KEY.test(s)) {
        s = s.replace(TRAILING_KEY, "");
      }
    }
    if (s === before) break;
  }

  const { stack } = scan(s);
  return s + stack.reverse().map((open) => (open === "{" ? "}" : "]")).join("");
}

/** null jika belum ada yang bisa dibaca. */
export function parsePartialJson(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    // lanjut ke pelengkapan
  }
  try {
    return JSON.parse(completeJson(text));
  } catch {
    return null;
  }
}
