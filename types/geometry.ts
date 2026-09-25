/** GeoJSON positions are longitude first, unlike legacy koordinat_lokasi. */
export type Position = [longitude: number, latitude: number];
export type PlantationGeometry =
  | { type: 'Point'; coordinates: Position }
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };

export interface MappedRecord {
  /** Undefined supports records cached before the geometry migration. */
  geometry?: PlantationGeometry | null;
}
