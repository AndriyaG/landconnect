import type { AreaUnit } from "@/api/listings";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const short = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

export function formatINR(value: number): string {
  return inr.format(value);
}

export function formatShortINR(value: number): string {
  if (value >= 1e7) return `₹${short.format(value / 1e7)} Cr`;
  if (value >= 1e5) return `₹${short.format(value / 1e5)} L`;
  if (value >= 1e3) return `₹${short.format(value / 1e3)} K`;
  return `₹${short.format(value)}`;
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
