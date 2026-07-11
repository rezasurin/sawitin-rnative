export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Checks if a coordinate is inside a polygon boundary using Ray-Casting algorithm.
 */
export function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  const { latitude: lat, longitude: lng } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect =
      yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculates the Haversine distance in meters between two coordinates.
 */
export function getDistance(c1: Coordinate, c2: Coordinate): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (c1.latitude * Math.PI) / 180;
  const phi2 = (c2.latitude * Math.PI) / 180;
  const deltaPhi = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const deltaLambda = ((c2.longitude - c1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

/**
 * Generates a mock boundary polygon centered around a coordinate.
 * Width/height corresponds to approximately `sizeMeters`.
 */
export function generateMockPolygon(center: Coordinate, sizeMeters: number = 300): Coordinate[] {
  // 1 degree latitude ~ 111,000 meters
  const offsetLat = sizeMeters / 2 / 111000;
  // 1 degree longitude ~ 111,000 * cos(lat) meters
  const offsetLng = sizeMeters / 2 / (111000 * Math.cos((center.latitude * Math.PI) / 180));

  return [
    { latitude: center.latitude + offsetLat, longitude: center.longitude - offsetLng }, // top-left
    { latitude: center.latitude + offsetLat, longitude: center.longitude + offsetLng }, // top-right
    { latitude: center.latitude - offsetLat, longitude: center.longitude + offsetLng }, // bottom-right
    { latitude: center.latitude - offsetLat, longitude: center.longitude - offsetLng }, // bottom-left
  ];
}
