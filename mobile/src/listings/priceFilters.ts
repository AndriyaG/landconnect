export type PriceFilter = { id: string; label: string; min?: number; max?: number };

const LAKH = 100_000;
const CRORE = 10_000_000;

export const PRICE_FILTERS: PriceFilter[] = [
  { id: "any", label: "Any price" },
  { id: "u50l", label: "Under ₹50L", max: 50 * LAKH - 1 },
  { id: "50l-1cr", label: "₹50L – 1Cr", min: 50 * LAKH, max: CRORE - 1 },
  { id: "1-2cr", label: "₹1 – 2Cr", min: CRORE, max: 2 * CRORE - 1 },
  { id: "o2cr", label: "₹2Cr+", min: 2 * CRORE },
];
