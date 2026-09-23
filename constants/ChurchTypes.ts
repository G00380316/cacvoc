export type ChurchStatus = "pending" | "approved" | "rejected";

export type Church = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: ChurchStatus;
  distanceKm?: number;
  submittedBy?: { id: string; username: string } | null;
};

export type AdminRole = "admin" | "developer";

export type Admin = {
  id: string;
  username: string;
  role: AdminRole;
  church: Church | null;
};

export function formatChurchLocation(church: Pick<Church, "address" | "city" | "country">) {
  return [church.address, church.city, church.country].filter(Boolean).join(", ");
}
