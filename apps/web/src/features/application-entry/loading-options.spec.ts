import { describe, expect, it } from "vitest";
import { loadingOptions } from "./FieldGroup";

const OPTIONS = [{ value: "002", label: "Saudara Kandung" }];

describe("loadingOptions", () => {
  it("keeps the saved value as the only option while the options load", () => {
    expect(loadingOptions([], "002", true)).toEqual([{ value: "002", label: "Loading..." }]);
  });

  it("shows the loaded options once they arrive", () => {
    expect(loadingOptions(OPTIONS, "002", false)).toEqual(OPTIONS);
  });

  it("shows no temporary option without a saved value", () => {
    expect(loadingOptions([], undefined, true)).toEqual([]);
  });
});
