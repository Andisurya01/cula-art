import { describe, expect, it } from "vitest";
import { assistReducer, initialAssistState, type AiAssistState } from "./assist-state";

type Out = { hooks: string[] };

describe("assistReducer", () => {
  it("start → partial → done menyimpan hasil final", () => {
    let state: AiAssistState<Out> = initialAssistState();
    state = assistReducer(state, { type: "start" });
    expect(state.status).toBe("streaming");
    state = assistReducer(state, { type: "event", event: { type: "partial", data: { hooks: ["a"] } } });
    expect(state.partial).toEqual({ hooks: ["a"] });
    state = assistReducer(state, {
      type: "event",
      event: { type: "done", runId: "r1", data: { hooks: ["a", "b"] }, costUsd: 0.04, model: "claude-opus-5-5", mock: false },
    });
    expect(state).toEqual({
      status: "idle",
      partial: null,
      result: { runId: "r1", data: { hooks: ["a", "b"] }, costUsd: 0.04, model: "claude-opus-5-5", mock: false },
    });
  });

  it("Buat ulang yang gagal mempertahankan hasil sebelumnya", () => {
    const done: AiAssistState<Out> = {
      status: "idle",
      partial: null,
      result: { runId: "r1", data: { hooks: ["a"] }, costUsd: 0, model: "mock", mock: true },
    };
    let state = assistReducer(done, { type: "start" });
    state = assistReducer(state, { type: "event", event: { type: "partial", data: { hooks: ["x"] } } });
    state = assistReducer(state, { type: "event", event: { type: "error", message: "gagal" } });
    expect(state).toEqual(done);
    expect(assistReducer(assistReducer(done, { type: "start" }), { type: "stop" })).toEqual(done);
  });

  it("event yang datang setelah dibatalkan diabaikan", () => {
    const idle = initialAssistState<Out>();
    expect(assistReducer(idle, { type: "event", event: { type: "partial", data: {} } })).toBe(idle);
  });
});
