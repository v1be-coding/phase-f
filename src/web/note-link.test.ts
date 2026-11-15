import { describe, expect, it, vi } from "vitest";
import { ApiError, RateLimitedError } from "./api.js";
import { noteLine } from "./note-link.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("noteLine", () => {
  it.each(["count", "abc", "", "00000000-0000-4000-8000-000000000001x"])(
    "shows not found for %j without calling the API",
    async (value) => {
      const call = vi.fn();

      expect(await noteLine(value, call)).toBe("not found");
      expect(call).not.toHaveBeenCalled();
    },
  );

  it("reads a note ID, in any case, once through its lowercase path", async () => {
    const call = vi.fn().mockResolvedValue({ id: "x", text: "<b>hi</b>" });

    expect(await noteLine("0A1B2C3D-4E5F-4A6B-8C7D-9E0F1A2B3C4D", call)).toBe("<b>hi</b>");
    expect(call.mock.calls).toEqual([["/api/notes/0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"]]);
  });

  it("shows not found when the API answers 404", async () => {
    const call = vi.fn().mockRejectedValue(new ApiError(404));

    expect(await noteLine(ID, call)).toBe("not found");
  });

  it.each([
    ["a 500", new ApiError(500)],
    ["a 403", new ApiError(403)],
    ["no response", new TypeError("Failed to fetch")],
  ])("shows unavailable on %s", async (_, failure) => {
    const call = vi.fn().mockRejectedValue(failure);

    expect(await noteLine(ID, call)).toBe("unavailable");
  });

  it("shows the limit message when rate-limited", async () => {
    const call = vi.fn().mockRejectedValue(new RateLimitedError(30, "rate_limited"));

    expect(await noteLine(ID, call)).toBe("Too many requests. Try again in 30 seconds.");
  });
});
