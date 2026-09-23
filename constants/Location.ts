import * as Location from "expo-location";

export type Coordinates = { latitude: number; longitude: number };

export type LocationResult =
  | { status: "ok"; coords: Coordinates }
  | { status: "denied" }
  | { status: "unavailable" };

/** Asks for foreground permission and returns a quick, city-level position. */
export async function getCurrentCoordinates(): Promise<LocationResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      return { status: "denied" };
    }

    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    const position =
      lastKnown ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));

    return {
      status: "ok",
      coords: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch (error) {
    console.warn(error);
    return { status: "unavailable" };
  }
}

/** Best-effort address lookup used to prefill a church form. */
export async function describeCoordinates(coords: Coordinates) {
  try {
    const [place] = await Location.reverseGeocodeAsync(coords);

    if (!place) {
      return null;
    }

    return {
      address: [place.streetNumber, place.street].filter(Boolean).join(" ") || place.name || "",
      city: place.city ?? place.subregion ?? place.region ?? "",
      country: place.country ?? "",
    };
  } catch (error) {
    console.warn(error);
    return null;
  }
}
