export type CapacityOption = { id: string; capacity: number; state: "Recommended" | "Conditional" | "Unavailable" };

export function canReservePart(onHand: number, reserved: number, required = 1) {
  return onHand - reserved >= required;
}

export function eligibleReroutes(options: readonly CapacityOption[]) {
  return options.filter((option) => option.state !== "Unavailable" && option.capacity > 0);
}

export function shipmentRequiresNotification(state: string) {
  return ["revised", "delayed", "notification-pending", "failed"].includes(state);
}

export function canAccessRoute(roles: readonly string[], role: string) {
  return role === "Plant Manager" || roles.includes(role);
}
