import { describe, expect, it, vi } from "vitest";
import { createInSessionDeduper } from "../../../src/shared/translation/cache";

describe("translation in-session de-dup", () => {
  it("dedupes identical concurrent requests to one underlying call", async () => {
    const { dedupe } = createInSessionDeduper<string>();
    const factory = vi.fn(async () => "ok");

    const first = dedupe("same", factory);
    const second = dedupe("same", factory);

    expect(factory).toHaveBeenCalledTimes(1);

    await expect(first).resolves.toBe("ok");
    await expect(second).resolves.toBe("ok");
  });

  it("does not persist results after completion (no cache)", async () => {
    const { dedupe } = createInSessionDeduper<string>();
    const factory = vi.fn(async () => "ok");

    await dedupe("k", factory);
    await dedupe("k", factory);

    expect(factory).toHaveBeenCalledTimes(2);
  });
});
