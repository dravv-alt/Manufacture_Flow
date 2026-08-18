import { describe, expect, it } from "vitest";
import { canAccessRoute, canReservePart, eligibleReroutes, shipmentRequiresNotification } from "./operations";

describe("operations decision rules", () => {
  it("prevents a reservation when usable stock is insufficient", () => {
    expect(canReservePart(1, 1)).toBe(false);
    expect(canReservePart(3, 1)).toBe(true);
  });

  it("excludes unavailable or zero-capacity reroute targets", () => {
    expect(eligibleReroutes([{ id: "A", capacity: 75, state: "Recommended" }, { id: "B", capacity: 0, state: "Unavailable" }])).toHaveLength(1);
  });

  it("requires communication for schedule-impacting shipment states", () => {
    expect(shipmentRequiresNotification("delayed")).toBe(true);
    expect(shipmentRequiresNotification("no-impact")).toBe(false);
  });

  it("grants the manager full access and limits other roles", () => {
    expect(canAccessRoute(["Scheduler"], "Plant Manager")).toBe(true);
    expect(canAccessRoute(["Scheduler"], "Maintenance Lead")).toBe(false);
  });
});
