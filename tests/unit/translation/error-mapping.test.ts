import { describe, expect, it } from "vitest";
import {
  createTranslationError,
  mapHttpStatusToTranslationErrorCode,
  mapUnknownErrorToTranslationErrorCode
} from "../../../src/shared/translation/types";

describe("translation error mapping", () => {
  it("maps HTTP 429 to quota_exceeded", () => {
    expect(mapHttpStatusToTranslationErrorCode(429)).toBe("quota_exceeded");
  });

  it("maps abort/timeout errors to timeout", () => {
    const abortError = Object.assign(new Error("aborted"), { name: "AbortError" });
    expect(mapUnknownErrorToTranslationErrorCode(abortError)).toBe("timeout");
  });

  it("maps fetch/network errors to offline", () => {
    expect(mapUnknownErrorToTranslationErrorCode(new TypeError("Failed to fetch"))).toBe("offline");
  });

  it("defaults unknown failures to provider_error", () => {
    expect(mapHttpStatusToTranslationErrorCode(500)).toBe("provider_error");
    expect(mapUnknownErrorToTranslationErrorCode(new Error("boom"))).toBe("provider_error");
  });

  it("never surfaces secrets in UI messages", () => {
    const error = createTranslationError("provider_error", "apiKey=AIzaSySECRET");
    expect(error.message ?? "").not.toContain("AIza");
    expect(error.message ?? "").not.toContain("apiKey");
  });
});

