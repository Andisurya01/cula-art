// Input terminal untuk skrip admin: teks biasa dan password tersembunyi.

import { createInterface } from "node:readline/promises";

let pipedLines: Promise<string[]> | null = null;

/** Input dari pipe/file (bukan terminal): baca semua baris sekali, lalu dibagikan per pertanyaan. */
function nextPipedLine(): Promise<string | undefined> {
  pipedLines ??= (async () => {
    const lines: string[] = [];
    for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) lines.push(line);
    return lines;
  })();
  return pipedLines.then((lines) => lines.shift());
}

export async function ask(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    process.stdout.write(question);
    const line = await nextPipedLine();
    if (line === undefined) throw new Error("Input habis sebelum semua pertanyaan dijawab.");
    process.stdout.write("\n");
    return line.trim();
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/** Password tanpa ditampilkan di layar. Input dari pipe (bukan terminal) dibaca per baris. */
export function askHidden(question: string): Promise<string> {
  const stdin = process.stdin;
  if (!stdin.isTTY) return ask(question);

  return new Promise((resolve, reject) => {
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";

    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Dibatalkan."));
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

/** Minta password baru dua kali sampai memenuhi syarat dan sama. */
export async function askNewPassword(problem: (password: string) => string | null): Promise<string> {
  for (;;) {
    const password = await askHidden("Password baru (min. 12 karakter): ");
    const error = problem(password);
    if (error) {
      console.log(`  ${error}.`);
      continue;
    }
    if ((await askHidden("Ulangi password: ")) !== password) {
      console.log("  Password tidak sama, ulangi.");
      continue;
    }
    return password;
  }
}

export function fail(message: string): never {
  console.error(`\n${message}`);
  process.exit(1);
}
