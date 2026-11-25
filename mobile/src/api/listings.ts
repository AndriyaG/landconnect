import { api, API_URL } from "@/api/client";
import type { PublicUser } from "@/store/auth";

export type AreaUnit = "sqft" | "acre" | "cent" | "guntha";

export type Listing = {
  id: number;
  owner: PublicUser;
  title: string;
  description: string;
  price: number;
  area_value: number;
  area_unit: AreaUnit;
  land_type: string;
  status: "active" | "sold";
  lat: number;
  lng: number;
  address: string;
  created_at: string;
  images: { id: number; url: string; position: number }[];
};

export type ListingFilters = { q?: string; min_price?: number; max_price?: number };

export const PAGE_SIZE = 20;

export async function fetchListings(filters: ListingFilters, offset: number): Promise<Listing[]> {
  const params = { ...filters, q: filters.q?.trim() || undefined, limit: PAGE_SIZE, offset };
  const { data } = await api.get<Listing[]>("/listings", { params });
  return data;
}

export async function fetchListing(id: number): Promise<Listing> {
  const { data } = await api.get<Listing>(`/listings/${id}`);
  return data;
}

export type ListingInput = Pick<
  Listing,
  "title" | "description" | "price" | "area_value" | "area_unit" | "land_type" | "lat" | "lng" | "address"
>;
export type ListingUpdate = ListingInput & { status: Listing["status"] };
export type LocalImage = { uri: string; mimeType?: string | null; fileName?: string | null };

export async function fetchMyListings(): Promise<Listing[]> {
  const { data } = await api.get<Listing[]>("/me/listings");
  return data;
}

export async function createListing(body: ListingInput): Promise<Listing> {
  const { data } = await api.post<Listing>("/listings", body);
  return data;
}

export async function updateListing(id: number, body: ListingUpdate): Promise<Listing> {
  const { data } = await api.put<Listing>(`/listings/${id}`, body);
  return data;
}

export async function deleteListing(id: number): Promise<void> {
  await api.delete(`/listings/${id}`);
}

export async function uploadListingImage(id: number, image: LocalImage): Promise<Listing> {
  const type = image.mimeType ?? "image/jpeg";
  const form = new FormData();
  form.append("file", { uri: image.uri, type, name: image.fileName ?? `photo.${type.split("/")[1]}` } as unknown as Blob);
  const { data } = await api.post<Listing>(`/listings/${id}/images`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    transformRequest: (d) => d,
  });
  return data;
}

export function imageUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_URL ?? ""}${url}`;
}
