import type { AreaUnit, Listing, ListingInput } from "@/api/listings";
import type { LatLng } from "@/components/LocationPicker";

export type ListingForm = {
  title: string;
  description: string;
  price: string;
  area_value: string;
  area_unit: AreaUnit;
  land_type: string;
  status: Listing["status"];
  address: string;
  location: LatLng | null;
};

export type FormErrors = Partial<Record<keyof ListingForm, string>>;

export const AREA_UNITS: { value: AreaUnit; label: string }[] = [
  { value: "sqft", label: "Sq ft" },
  { value: "acre", label: "Acre" },
  { value: "cent", label: "Cent" },
  { value: "guntha", label: "Guntha" },
];

export const LAND_TYPES = ["residential", "agricultural", "commercial", "industrial"].map((v) => ({
  value: v,
  label: v[0].toUpperCase() + v.slice(1),
}));

export const STATUSES: { value: Listing["status"]; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
];

export const MAX_IMAGES = 10;

export const EMPTY_FORM: ListingForm = {
  title: "",
  description: "",
  price: "",
  area_value: "",
  area_unit: "sqft",
  land_type: "residential",
  status: "active",
  address: "",
  location: null,
};

export function formFromListing(l: Listing): ListingForm {
  return {
    title: l.title,
    description: l.description,
    price: String(l.price),
    area_value: String(l.area_value),
    area_unit: l.area_unit,
    land_type: l.land_type,
    status: l.status,
    address: l.address,
    location: { lat: l.lat, lng: l.lng },
  };
}

export function validate(f: ListingForm): FormErrors {
  const e: FormErrors = {};
  const title = f.title.trim();
  if (!title) e.title = "Title is required";
  else if (title.length > 200) e.title = "Title must be 200 characters or fewer";
  if (f.description.trim().length > 5000) e.description = "Description must be 5000 characters or fewer";
  if (!/^\d+$/.test(f.price.trim())) e.price = "Enter the price in whole rupees";
  else if (!Number.isSafeInteger(Number(f.price))) e.price = "Price is too large";
  const area = Number(f.area_value.trim());
  if (!f.area_value.trim() || !Number.isFinite(area) || area <= 0) e.area_value = "Enter an area greater than 0";
  if (!f.land_type) e.land_type = "Choose a land type";
  if (f.address.trim().length > 300) e.address = "Address must be 300 characters or fewer";
  if (!f.location) e.location = "Pick the location on the map";
  return e;
}

export function toPayload(f: ListingForm): ListingInput {
  return {
    title: f.title.trim(),
    description: f.description.trim(),
    price: Number(f.price.trim()),
    area_value: Number(f.area_value.trim()),
    area_unit: f.area_unit,
    land_type: f.land_type,
    lat: f.location!.lat,
    lng: f.location!.lng,
    address: f.address.trim(),
  };
}
