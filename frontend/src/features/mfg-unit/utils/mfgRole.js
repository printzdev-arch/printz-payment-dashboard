import saleOrderApi from "../../sale-order/api/saleOrderApi";

// Which view of the manufacturing portal the signed-in user gets.
//  designer: works on the orders assigned to them
//  manager : sees the whole unit, the waiting queue and can assign designers (admins get the same view)
export const getMfgRole = () => {
  const scope = saleOrderApi.getUserScope();
  const isManager = scope.role === "mfg_manager" || scope.isAdmin;
  return {
    ...scope,
    isManager,
    isDesigner: scope.role === "mfg_designer",
    label: scope.role === "mfg_manager" ? "Unit Manager" : scope.role === "mfg_designer" ? "Unit Designer" : "Administrator",
  };
};

export const AVAILABILITY = [
  { value: "AVAILABLE", label: "Available" },
  { value: "BUSY", label: "Busy" },
  { value: "ON_BREAK", label: "On break" },
  { value: "OFF_DUTY", label: "Off duty" },
];

export const availabilityTone = { AVAILABLE: "green", BUSY: "amber", ON_BREAK: "blue", OFF_DUTY: "gray" };
