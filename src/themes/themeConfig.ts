export type GalleryThemeKey =
  | "whiteGallery"
  | "blackMuseum"
  | "warmGallery"
  | "minimalBox";

export type GalleryTheme = {
  label: string;
  backgroundColor: string;
  wallColor: string;
  floorColor: string;
  frameColor: string;
  artworkColor: string;
  contextArtworkColor: string;
  wallRoughness: number;
  floorRoughness: number;
  frameRoughness: number;
  ambientLightIntensity: number;
  spotlightIntensityMultiplier: number;
  spotlightColor: string;
};

export const galleryThemes: Record<GalleryThemeKey, GalleryTheme> = {
  whiteGallery: {
    label: "White Gallery",
    backgroundColor: "#d9ddd8",
    wallColor: "#d8d7d1",
    floorColor: "#c9c4bb",
    frameColor: "#2b3029",
    artworkColor: "#ffffff",
    contextArtworkColor: "#d7d7d2",
    wallRoughness: 0.94,
    floorRoughness: 0.9,
    frameRoughness: 0.55,
    ambientLightIntensity: 0.3,
    spotlightIntensityMultiplier: 1,
    spotlightColor: "#fff0dc"
  },
  blackMuseum: {
    label: "Black Museum",
    backgroundColor: "#111315",
    wallColor: "#222529",
    floorColor: "#181a1d",
    frameColor: "#08090a",
    artworkColor: "#f6f6f1",
    contextArtworkColor: "#c8c9c3",
    wallRoughness: 0.88,
    floorRoughness: 0.92,
    frameRoughness: 0.5,
    ambientLightIntensity: 0.18,
    spotlightIntensityMultiplier: 1.18,
    spotlightColor: "#f2f6ff"
  },
  warmGallery: {
    label: "Warm Gallery",
    backgroundColor: "#d8cbbb",
    wallColor: "#cfc0ad",
    floorColor: "#a9957f",
    frameColor: "#3a2c20",
    artworkColor: "#fff8ee",
    contextArtworkColor: "#e1d3c3",
    wallRoughness: 0.91,
    floorRoughness: 0.86,
    frameRoughness: 0.58,
    ambientLightIntensity: 0.36,
    spotlightIntensityMultiplier: 0.94,
    spotlightColor: "#ffe2bd"
  },
  minimalBox: {
    label: "Minimal Box",
    backgroundColor: "#cfd4d2",
    wallColor: "#c5cbc8",
    floorColor: "#b8bfbc",
    frameColor: "#202625",
    artworkColor: "#fbfdfb",
    contextArtworkColor: "#d8ddda",
    wallRoughness: 0.97,
    floorRoughness: 0.93,
    frameRoughness: 0.62,
    ambientLightIntensity: 0.26,
    spotlightIntensityMultiplier: 1.06,
    spotlightColor: "#eef7ff"
  }
};
