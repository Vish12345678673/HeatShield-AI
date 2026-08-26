import type { Metro } from "@/lib/metros";
import type { Zone } from "@/lib/heat-engine";

export const DARK_STYLES: google.maps.MapTypeStyle[] = [
  {
    featureType: "all",
    elementType: "geometry",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "all",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9ca3af" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#263244" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#111827" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e1a2e" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a5a78" }],
  },
];

export function zoneLatLng(
  metro: Metro,
  zone: Zone,
): google.maps.LatLngLiteral {
  return {
    lat:
      metro.box.north -
      zone.y *
        (metro.box.north - metro.box.south),

    lng:
      metro.box.west +
      zone.x *
        (metro.box.east - metro.box.west),
  };
}
