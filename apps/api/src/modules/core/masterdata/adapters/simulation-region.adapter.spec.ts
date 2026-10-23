import { describe, expect, it } from "vitest";
import { RegionSourceError } from "../ports/region-data.port.js";
import { SIMULATION_REGIONS, SimulationRegionAdapter } from "./simulation-region.adapter.js";

describe("SimulationRegionAdapter", () => {
  it("returns the 15 simulation regions when simulation adapters are allowed", async () => {
    expect(await new SimulationRegionAdapter(true).fetchAll()).toBe(SIMULATION_REGIONS);
  });

  it("refuses as CONFIG when simulation adapters are not allowed (IN-03)", async () => {
    const error = await new SimulationRegionAdapter(false).fetchAll().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RegionSourceError);
    expect(error).toMatchObject({ category: "CONFIG" });
  });
});
