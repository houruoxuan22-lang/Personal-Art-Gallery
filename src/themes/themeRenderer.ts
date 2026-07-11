import type { GalleryTheme } from "./themeConfig";

export type GalleryThemeRendererStyle = {
  backgroundColor: string;
  wallColor: string;
  ceilingColor: string;
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

export function getThemeRendererStyle(
  theme: GalleryTheme
): GalleryThemeRendererStyle {
  const paletteByLabel: Record<
    string,
    Pick<
      GalleryThemeRendererStyle,
      "backgroundColor" | "wallColor" | "ceilingColor" | "floorColor"
    >
  > = {
    "White Gallery": {
      backgroundColor: "#e6e7e2",
      wallColor: "#e3e1da",
      ceilingColor: "#ecebe6",
      floorColor: "#d3cdc2"
    },
    "Black Museum": {
      backgroundColor: "#202225",
      wallColor: "#303338",
      ceilingColor: "#292c30",
      floorColor: "#242528"
    },
    "Warm Gallery": {
      backgroundColor: "#ddd1c3",
      wallColor: "#d8c9b7",
      ceilingColor: "#e4d8c9",
      floorColor: "#b7a38c"
    },
    "Minimal Box": {
      backgroundColor: "#d9ddda",
      wallColor: "#d2d7d4",
      ceilingColor: "#e0e4e1",
      floorColor: "#c1c8c4"
    }
  };
  const palette = paletteByLabel[theme.label] ?? {
    backgroundColor: theme.backgroundColor,
    wallColor: theme.wallColor,
    ceilingColor: theme.wallColor,
    floorColor: theme.floorColor
  };

  return {
    backgroundColor: palette.backgroundColor,
    wallColor: palette.wallColor,
    ceilingColor: palette.ceilingColor,
    floorColor: palette.floorColor,
    frameColor: theme.frameColor,
    artworkColor: theme.artworkColor,
    contextArtworkColor: theme.contextArtworkColor,
    wallRoughness: theme.wallRoughness,
    floorRoughness: theme.floorRoughness,
    frameRoughness: theme.frameRoughness,
    ambientLightIntensity: theme.ambientLightIntensity,
    spotlightIntensityMultiplier: theme.spotlightIntensityMultiplier,
    spotlightColor: theme.spotlightColor
  };
}
