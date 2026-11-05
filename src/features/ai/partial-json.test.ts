import { describe, expect, it } from "vitest";
import { parsePartialJson } from "./partial-json";

describe("parsePartialJson", () => {
  it.each([
    ['{"hooks":[{"text":"Hari ke-3', { hooks: [{ text: "Hari ke-3" }] }],
    ['{"script":"0-3 dtk: hal', { script: "0-3 dtk: hal" }],
    ['{"a":"x\\"y', { a: 'x"y' }],
    ['{"a":"x\\', { a: "x" }],
    ['{"a":"x\\u00', { a: "x" }],
    ['{"a":"x\\\\', { a: "x\\" }],
    ['{"a":1,"b', { a: 1 }],
    ['{"a":1,"b"', { a: 1 }],
    ['{"a":1,"b":', { a: 1 }],
    ['{"a":1,', { a: 1 }],
    ['{"a":tr', {}],
    ['{"a":nul', {}],
    ['{"a":true', { a: true }],
    ['{"a":12.', { a: 12 }],
    ['{"a":-', {}],
    ['{"a":[1,2', { a: [1, 2] }],
    ['{"a":[{"b":"c"},{"b":"d', { a: [{ b: "c" }, { b: "d" }] }],
    ['{"a":[{"b":"c"},{', { a: [{ b: "c" }, {}] }],
    ['{"notes":null}', { notes: null }],
  ])("%s", (input, expected) => {
    expect(parsePartialJson(input)).toEqual(expected);
  });

  it("kosong → null", () => {
    expect(parsePartialJson("  ")).toBeNull();
  });
});
