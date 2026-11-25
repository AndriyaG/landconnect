import type { AreaUnit } from "@/api/listings";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function formatINR(value: number): string {
  return inr.format(value);
}

const UNITS: Record<AreaUnit, [string, string]> = {
  sqft: ["sq ft", "sq ft"],
  acre: ["acre", "acres"],
  cent: ["cent", "cents"],
  guntha: ["guntha", "guntha"],
};

export function formatArea(value: number, unit: AreaUnit): string {
  const [one, many] = UNITS[unit] ?? [unit, unit];
  return `${num.format(value)} ${value === 1 ? one : many}`;
}
