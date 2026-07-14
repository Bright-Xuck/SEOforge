import { describe, it, expect } from "vitest";
import { success, failure, ForgeError } from "./index.js";

describe("Result", () => {
  it("creates a successful result", () => {
    const result = success("hello");

    expect(result.ok).toBe(true);
    expect(result.value).toBe("hello");
  });

  it("creates a failed result", () => {
    const error = new ForgeError("TEST_ERROR", "Something went wrong");
    const result = failure(error);

    expect(result.ok).toBe(false);
    expect(result.error).toBe(error);
    expect(result.error.code).toBe("TEST_ERROR");
    expect(result.error.message).toBe("Something went wrong");
  });
});
