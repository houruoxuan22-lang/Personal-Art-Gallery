import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { GalleryImage } from "./HomePage";
import {
  galleryThemes,
  type GalleryThemeKey
} from "../themes/themeConfig";
import { getThemeRendererStyle } from "../themes/themeRenderer";
import {
  generateUserDrivenLayout,
  ROOM_DEPTH,
  ROOM_HEIGHT,
  ROOM_WIDTH,
  type ArtworkLayout,
  type GalleryFace,
  type LayoutArtworkRole,
  type NarrativeRole,
  type SpatialIntent,
  type UserWallAllocation
} from "../galleryLayoutEngine";
import { generateSemanticProfile } from "../semanticEngine";

type GalleryPageProps = {
  images: GalleryImage[];
  allocation: UserWallAllocation | null;
};

type SceneStatus = "idle" | "loading" | "ready" | "error";
type ImageAssetStatus = "checking" | "ready" | "missing";
type GalleryMode = "gallery" | "focus";
type CameraControllerMode = "orbit" | "hover" | "focus";
type GalleryExperienceState = "ACTIVE" | "FOCUS";

type GalleryArtwork = {
  id: string;
  src: string;
  title: string;
  artist: string;
  type: string;
  description: string;
  mood: "calm" | "dynamic";
  importance: number;
  visualWeight: number;
  role: LayoutArtworkRole;
  narrativeRole: NarrativeRole;
  spatialIntent: SpatialIntent;
  semanticTags: string[];
  semanticVector: number[];
  semanticClusterId: string;
  curatorRole: LayoutArtworkRole;
  attentionScore: number;
};

const DEFAULT_TYPE = "Uploaded Artwork";
const DEFAULT_DESCRIPTION =
  "This artwork is displayed in a personal 3D gallery space.";
const DESCRIPTION_STORAGE_PREFIX = "personal-art-gallery-description:";
const AUDIO_FILE_NAME_STORAGE_KEY = "personal-art-gallery-audio-file-name";
const DECORATION_STORAGE_KEY = "personal-art-gallery-decorations";
const WALL_STYLE_STORAGE_KEY = "personal-art-gallery-wall-styles";
const FLOOR_STYLE_STORAGE_KEY = "personal-art-gallery-floor-style";
const FRAME_STYLE_STORAGE_KEY = "personal-art-gallery-frame-style";
const GALLERY_CONFIG_STORAGE_KEY = "personalArtGalleryConfig";
const GALLERY_CONFIG_VERSION = "1.5";
const GALLERY_CONFIG_APP = "personal-art-gallery";
const DECORATION_MOVE_STEP = 0.35;
const ENABLE_OBJECT_DECORATIONS: boolean = false;

type WallSurface = "front" | "left" | "right";
type WallStyleTarget = "all" | WallSurface;
type WallStyleKey =
  | "pureWhite"
  | "warmBeige"
  | "softConcrete"
  | "minimalGray"
  | "subtleWallpaper"
  | "panelWall";
type WallStyleSelection = Record<WallSurface, WallStyleKey | null>;

const WALL_STYLE_PRESETS: Record<
  WallStyleKey,
  { label: string; color: string; roughness: number }
> = {
  pureWhite: { label: "Pure White", color: "#f1f0eb", roughness: 0.94 },
  warmBeige: { label: "Warm Beige", color: "#dfd1bd", roughness: 0.91 },
  softConcrete: { label: "Soft Concrete", color: "#aeb0ae", roughness: 0.98 },
  minimalGray: { label: "Minimal Gray", color: "#c7c9c7", roughness: 0.96 },
  subtleWallpaper: { label: "Subtle Wallpaper", color: "#d9d4ca", roughness: 0.9 },
  panelWall: { label: "Panel Wall", color: "#c5c4bb", roughness: 0.88 }
};

const DEFAULT_WALL_STYLE_SELECTION: WallStyleSelection = {
  front: null,
  left: null,
  right: null
};

type FloorStyleKey =
  | "lightWood"
  | "darkWood"
  | "polishedConcrete"
  | "stoneTile"
  | "warmMatte"
  | "blackMuseumFloor";

const FLOOR_STYLE_PRESETS: Record<
  FloorStyleKey,
  { label: string; color: string; roughness: number; metalness: number }
> = {
  lightWood: {
    label: "Light Wood",
    color: "#c6a87d",
    roughness: 0.76,
    metalness: 0.015
  },
  darkWood: {
    label: "Dark Wood",
    color: "#5c4635",
    roughness: 0.72,
    metalness: 0.02
  },
  polishedConcrete: {
    label: "Polished Concrete",
    color: "#929795",
    roughness: 0.4,
    metalness: 0.06
  },
  stoneTile: {
    label: "Stone Tile",
    color: "#bbb9b1",
    roughness: 0.76,
    metalness: 0.01
  },
  warmMatte: {
    label: "Warm Matte",
    color: "#b5a18d",
    roughness: 0.96,
    metalness: 0.005
  },
  blackMuseumFloor: {
    label: "Black Museum Floor",
    color: "#202224",
    roughness: 0.84,
    metalness: 0.025
  }
};

type FrameStyleKey =
  | "thinBlack"
  | "thinWhite"
  | "naturalWood"
  | "bronze"
  | "goldTrim"
  | "shadowFrame";

const FRAME_STYLE_PRESETS: Record<
  FrameStyleKey,
  { label: string; color: string; roughness: number; metalness: number }
> = {
  thinBlack: {
    label: "Thin Black",
    color: "#1b1c1c",
    roughness: 0.44,
    metalness: 0.06
  },
  thinWhite: {
    label: "Thin White",
    color: "#f0eee8",
    roughness: 0.54,
    metalness: 0.02
  },
  naturalWood: {
    label: "Natural Wood",
    color: "#6d4e32",
    roughness: 0.68,
    metalness: 0.025
  },
  bronze: {
    label: "Bronze",
    color: "#75573f",
    roughness: 0.42,
    metalness: 0.58
  },
  goldTrim: {
    label: "Gold Trim",
    color: "#af8946",
    roughness: 0.36,
    metalness: 0.68
  },
  shadowFrame: {
    label: "Shadow Frame",
    color: "#101113",
    roughness: 0.64,
    metalness: 0.02
  }
};

type GalleryConfigDescription = {
  fileName: string;
  description: string;
};

type GalleryConfig = {
  app: typeof GALLERY_CONFIG_APP;
  version: typeof GALLERY_CONFIG_VERSION;
  createdAt: string;
  theme?: GalleryThemeKey;
  wallStyles?: WallStyleSelection;
  floorStyle?: FloorStyleKey | null;
  frameStyle?: FrameStyleKey | null;
  artworkDescriptions?: GalleryConfigDescription[];
  wallAllocation?: Record<WallSurface, string[]>;
  artworkReferences?: Array<{ fileName: string; title: string }>;
  backgroundMusicFileName?: string;
};

type DecorationType = "plant" | "pedestal" | "sculpture" | "bench" | "labelBoard";

type DecorationItem = {
  id: string;
  type: DecorationType;
  position: {
    x: number;
    z: number;
  };
};

const DECORATION_LIBRARY: Array<{ type: DecorationType; name: string }> = [
  { type: "plant", name: "Plant" },
  { type: "pedestal", name: "Pedestal" },
  { type: "sculpture", name: "Small Sculpture" },
  { type: "bench", name: "Bench" },
  { type: "labelBoard", name: "Label Board" }
];

const DECORATION_START_POSITIONS = [
  { x: -3.35, z: 2.25 },
  { x: 3.35, z: 2.25 },
  { x: -3.35, z: -2.15 },
  { x: 3.35, z: -2.15 },
  { x: -1.7, z: 2.35 },
  { x: 1.7, z: 2.35 },
  { x: -1.7, z: -2.35 },
  { x: 1.7, z: -2.35 }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCuratorNoise(index: number, salt: number) {
  const value = Math.sin(index * 47.17 + salt * 19.31) * 10000;
  return value - Math.floor(value);
}

function getCuratorImportance(index: number, totalImages: number) {
  const heroLimit = totalImages >= 7 ? 2 : 1;

  if (index < heroLimit) {
    return clamp(0.92 - index * 0.15 + getCuratorNoise(index, 1) * 0.04, 0.72, 0.98);
  }

  const orderFalloff = index / Math.max(totalImages - 1, 1);
  const noise = (getCuratorNoise(index, 2) - 0.5) * 0.16;
  return clamp(0.7 - orderFalloff * 0.5 + noise, 0.18, 0.69);
}

function getCuratorRole(importance: number, heroCount: number): GalleryArtwork["role"] {
  if (importance > 0.7 && heroCount < 2) {
    return "hero";
  }

  if (importance >= 0.4) {
    return "support";
  }

  return "context";
}

function getSpatialIntent(
  role: GalleryArtwork["role"],
  attentionScore: number,
  visualWeight: number
): SpatialIntent {
  if (role === "hero") {
    return "center";
  }

  if (role === "context" || attentionScore < 0.4) {
    return "edge";
  }

  if (visualWeight > 0.72 || attentionScore > 0.78) {
    return "isolate";
  }

  return "cluster";
}

function isSpatialIntent(value: unknown): value is SpatialIntent {
  return (
    value === "center" ||
    value === "edge" ||
    value === "cluster" ||
    value === "isolate"
  );
}

function isCuratorRole(value: unknown): value is LayoutArtworkRole {
  return value === "hero" || value === "support" || value === "context";
}

function getMetadataVector(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "number")
    ? value
    : null;
}

function getMetadataTags(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

function getArtworkTitle(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

function getArtworkDescription(title: string) {
  return title ? DEFAULT_DESCRIPTION : DEFAULT_DESCRIPTION;
}

function getArtworkArtist(title: string) {
  return title.includes("微信") ? "Mobile Upload" : "Personal Artist";
}

function getArtworkData(
  image: GalleryImage,
  index: number,
  totalImages: number,
  heroCount: number
): GalleryArtwork {
  const metadata = image as GalleryImage &
    Partial<{
      src: string;
      title: string;
      artist: string;
      type: string;
      description: string;
      mood: string;
      spatialIntent: string;
      semanticTags: string[];
      semanticVector: number[];
      semanticClusterId: string;
      curatorRole: string;
      attentionScore: number;
    }>;
  const title = metadata.title?.trim() || getArtworkTitle(image.name);
  const importance = getCuratorImportance(index, totalImages);
  const role = getCuratorRole(importance, heroCount);
  const curatorRole = isCuratorRole(metadata.curatorRole)
    ? metadata.curatorRole
    : role;
  const visualWeight = clamp(
    importance * 0.78 + getCuratorNoise(index, 5) * 0.22,
    0,
    1
  );
  const src = metadata.src || image.url;
  const description = metadata.description?.trim() || getArtworkDescription(title);
  const semanticProfile = generateSemanticProfile(
    {
      id: image.id,
      src,
      title,
      description,
      importance,
      visualWeight,
      curatorRole
    },
    index
  );
  const attentionScore =
    typeof metadata.attentionScore === "number"
      ? clamp(metadata.attentionScore, 0, 1)
      : semanticProfile.attentionScore;
  const semanticTags = getMetadataTags(metadata.semanticTags);
  const semanticVector = getMetadataVector(metadata.semanticVector);

  return {
    id: image.id,
    src,
    title,
    artist: metadata.artist?.trim() || getArtworkArtist(title),
    type: metadata.type?.trim() || DEFAULT_TYPE,
    description,
    mood:
      metadata.mood === "calm" || metadata.mood === "dynamic"
        ? metadata.mood
        : visualWeight > 0.58
          ? "dynamic"
          : "calm",
    importance,
    visualWeight,
    role,
    narrativeRole: role === "hero" ? "hero" : role === "support" ? "supporting" : "context",
    spatialIntent: isSpatialIntent(metadata.spatialIntent)
      ? metadata.spatialIntent
      : getSpatialIntent(role, attentionScore, visualWeight),
    semanticTags: semanticTags ?? semanticProfile.semanticTags,
    semanticVector: semanticVector ?? semanticProfile.semanticVector,
    semanticClusterId:
      typeof metadata.semanticClusterId === "string"
        ? metadata.semanticClusterId
        : "",
    curatorRole,
    attentionScore
  };
}

function getDescriptionStorageKey(artworkId: string) {
  return `${DESCRIPTION_STORAGE_PREFIX}${artworkId}`;
}

function loadDescriptionOverrides() {
  const overrides: Record<string, string> = {};

  if (typeof window === "undefined") {
    return overrides;
  }

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (!key?.startsWith(DESCRIPTION_STORAGE_PREFIX)) {
        continue;
      }

      const artworkId = key.slice(DESCRIPTION_STORAGE_PREFIX.length);
      const value = window.localStorage.getItem(key);

      if (artworkId && value) {
        overrides[artworkId] = value;
      }
    }
  } catch {
    return overrides;
  }

  return overrides;
}

function loadAudioFileName() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(AUDIO_FILE_NAME_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function loadWallStyleSelection(): WallStyleSelection {
  if (typeof window === "undefined") {
    return { ...DEFAULT_WALL_STYLE_SELECTION };
  }

  try {
    const savedSelection = JSON.parse(
      window.localStorage.getItem(WALL_STYLE_STORAGE_KEY) ?? "{}"
    ) as Partial<Record<WallSurface, unknown>>;
    const selection: WallStyleSelection = { ...DEFAULT_WALL_STYLE_SELECTION };

    (Object.keys(DEFAULT_WALL_STYLE_SELECTION) as WallSurface[]).forEach((wall) => {
      const value = savedSelection[wall];
      selection[wall] =
        typeof value === "string" && value in WALL_STYLE_PRESETS
          ? (value as WallStyleKey)
          : null;
    });

    return selection;
  } catch {
    return { ...DEFAULT_WALL_STYLE_SELECTION };
  }
}

function saveWallStyleSelection(selection: WallStyleSelection) {
  try {
    window.localStorage.setItem(WALL_STYLE_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Surface styling persistence is optional.
  }
}

function loadFloorStyle(): FloorStyleKey | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedStyle = window.localStorage.getItem(FLOOR_STYLE_STORAGE_KEY);
    return savedStyle && savedStyle in FLOOR_STYLE_PRESETS
      ? (savedStyle as FloorStyleKey)
      : null;
  } catch {
    return null;
  }
}

function saveFloorStyle(styleKey: FloorStyleKey | null) {
  try {
    if (styleKey) {
      window.localStorage.setItem(FLOOR_STYLE_STORAGE_KEY, styleKey);
    } else {
      window.localStorage.removeItem(FLOOR_STYLE_STORAGE_KEY);
    }
  } catch {
    // Floor styling persistence is optional.
  }
}

function loadFrameStyle(): FrameStyleKey | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedStyle = window.localStorage.getItem(FRAME_STYLE_STORAGE_KEY);
    return savedStyle && savedStyle in FRAME_STYLE_PRESETS
      ? (savedStyle as FrameStyleKey)
      : null;
  } catch {
    return null;
  }
}

function saveFrameStyle(styleKey: FrameStyleKey | null) {
  try {
    if (styleKey) {
      window.localStorage.setItem(FRAME_STYLE_STORAGE_KEY, styleKey);
    } else {
      window.localStorage.removeItem(FRAME_STYLE_STORAGE_KEY);
    }
  } catch {
    // Frame styling persistence is optional.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThemeKey(value: unknown): value is GalleryThemeKey {
  return typeof value === "string" && value in galleryThemes;
}

function isFloorStyleKey(value: unknown): value is FloorStyleKey {
  return typeof value === "string" && value in FLOOR_STYLE_PRESETS;
}

function isFrameStyleKey(value: unknown): value is FrameStyleKey {
  return typeof value === "string" && value in FRAME_STYLE_PRESETS;
}

function parseWallStyleSelection(value: unknown): WallStyleSelection | null {
  if (!isRecord(value)) {
    return null;
  }

  const selection: WallStyleSelection = { ...DEFAULT_WALL_STYLE_SELECTION };

  (Object.keys(DEFAULT_WALL_STYLE_SELECTION) as WallSurface[]).forEach((wall) => {
    const styleKey = value[wall];
    selection[wall] =
      typeof styleKey === "string" && styleKey in WALL_STYLE_PRESETS
        ? (styleKey as WallStyleKey)
        : null;
  });

  return selection;
}

function parseGalleryConfig(value: unknown): GalleryConfig | null {
  if (
    !isRecord(value) ||
    value.app !== GALLERY_CONFIG_APP ||
    value.version !== GALLERY_CONFIG_VERSION ||
    typeof value.createdAt !== "string"
  ) {
    return null;
  }

  const config: GalleryConfig = {
    app: GALLERY_CONFIG_APP,
    version: GALLERY_CONFIG_VERSION,
    createdAt: value.createdAt
  };

  if (isThemeKey(value.theme)) {
    config.theme = value.theme;
  }

  const wallStyles = parseWallStyleSelection(value.wallStyles);
  if (wallStyles) {
    config.wallStyles = wallStyles;
  }

  if (value.floorStyle === null || isFloorStyleKey(value.floorStyle)) {
    config.floorStyle = value.floorStyle;
  }

  if (value.frameStyle === null || isFrameStyleKey(value.frameStyle)) {
    config.frameStyle = value.frameStyle;
  }

  if (Array.isArray(value.artworkDescriptions)) {
    config.artworkDescriptions = value.artworkDescriptions.flatMap((item) =>
      isRecord(item) &&
      typeof item.fileName === "string" &&
      typeof item.description === "string"
        ? [{ fileName: item.fileName, description: item.description }]
        : []
    );
  }

  const wallAllocationValue = value.wallAllocation;
  if (isRecord(wallAllocationValue)) {
    const allocation = { front: [], left: [], right: [] } as Record<
      WallSurface,
      string[]
    >;

    (Object.keys(allocation) as WallSurface[]).forEach((wall) => {
      const artworkNames = wallAllocationValue[wall];
      allocation[wall] = Array.isArray(artworkNames)
        ? artworkNames.filter((name): name is string => typeof name === "string")
        : [];
    });

    config.wallAllocation = allocation;
  }

  if (Array.isArray(value.artworkReferences)) {
    config.artworkReferences = value.artworkReferences.flatMap((item) =>
      isRecord(item) &&
      typeof item.fileName === "string" &&
      typeof item.title === "string"
        ? [{ fileName: item.fileName, title: item.title }]
        : []
    );
  }

  if (typeof value.backgroundMusicFileName === "string") {
    config.backgroundMusicFileName = value.backgroundMusicFileName;
  }

  return config;
}

function loadGalleryConfig(): GalleryConfig | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseGalleryConfig(
      JSON.parse(window.localStorage.getItem(GALLERY_CONFIG_STORAGE_KEY) ?? "null")
    );
  } catch {
    return null;
  }
}

function getWallAllocationReferences(
  allocation: UserWallAllocation | null,
  images: GalleryImage[]
): Record<WallSurface, string[]> | undefined {
  if (!allocation) {
    return undefined;
  }

  const imageNamesById = new Map(images.map((image) => [image.id, image.name]));

  return (Object.keys(allocation) as WallSurface[]).reduce(
    (references, wall) => {
      references[wall] = allocation[wall]
        .map((artworkId) => imageNamesById.get(artworkId))
        .filter((fileName): fileName is string => Boolean(fileName));
      return references;
    },
    { front: [], left: [], right: [] } as Record<WallSurface, string[]>
  );
}

function resolveWallAllocation(
  references: Record<WallSurface, string[]> | undefined,
  images: GalleryImage[]
): UserWallAllocation | null {
  if (!references) {
    return null;
  }

  const availableImageIds = new Map<string, string[]>(
    images.reduce((namesById, image) => {
      const matchingIds = namesById.get(image.name) ?? [];
      matchingIds.push(image.id);
      namesById.set(image.name, matchingIds);
      return namesById;
    }, new Map<string, string[]>())
  );
  const allocation: UserWallAllocation = { front: [], left: [], right: [] };

  (Object.keys(allocation) as WallSurface[]).forEach((wall) => {
    references[wall].forEach((fileName) => {
      const matchingIds = availableImageIds.get(fileName);
      const artworkId = matchingIds?.shift();

      if (artworkId) {
        allocation[wall].push(artworkId);
      }
    });
  });

  return allocation.front.length || allocation.left.length || allocation.right.length
    ? allocation
    : null;
}

function isDecorationType(value: unknown): value is DecorationType {
  return DECORATION_LIBRARY.some((decoration) => decoration.type === value);
}

function clampDecorationPosition(position: DecorationItem["position"]) {
  return {
    x: clamp(position.x, -ROOM_WIDTH / 2 + 0.78, ROOM_WIDTH / 2 - 0.78),
    z: clamp(position.z, -ROOM_DEPTH / 2 + 0.78, ROOM_DEPTH / 2 - 0.78)
  };
}

function loadDecorations() {
  if (typeof window === "undefined") {
    return [] as DecorationItem[];
  }

  try {
    const savedDecorations = JSON.parse(
      window.localStorage.getItem(DECORATION_STORAGE_KEY) ?? "[]"
    ) as Array<Partial<DecorationItem>>;

    return savedDecorations
      .filter(
        (decoration): decoration is DecorationItem =>
          typeof decoration.id === "string" &&
          isDecorationType(decoration.type) &&
          typeof decoration.position?.x === "number" &&
          typeof decoration.position?.z === "number"
      )
      .map((decoration) => ({
        ...decoration,
        position: clampDecorationPosition(decoration.position)
      }));
  } catch {
    return [];
  }
}

function saveDecorations(decorations: DecorationItem[]) {
  try {
    window.localStorage.setItem(DECORATION_STORAGE_KEY, JSON.stringify(decorations));
  } catch {
    // Decoration persistence is optional.
  }
}

export default function GalleryPage({ images, allocation }: GalleryPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const configImportInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const decorationsRef = useRef<DecorationItem[]>([]);
  const selectedDecorationIdRef = useRef<string | null>(null);
  const decorationSceneApiRef = useRef<{
    syncDecorations(decorations: DecorationItem[], selectedId: string | null): void;
  } | null>(null);
  const [savedGalleryConfig] = useState<GalleryConfig | null>(() => loadGalleryConfig());
  const initialThemeKey = savedGalleryConfig?.theme ?? "whiteGallery";
  const initialWallStyleSelection =
    savedGalleryConfig?.wallStyles ?? loadWallStyleSelection();
  const initialFloorStyle = savedGalleryConfig && "floorStyle" in savedGalleryConfig
    ? savedGalleryConfig.floorStyle ?? null
    : loadFloorStyle();
  const initialFrameStyle = savedGalleryConfig && "frameStyle" in savedGalleryConfig
    ? savedGalleryConfig.frameStyle ?? null
    : loadFrameStyle();
  const activeThemeRef = useRef(
    getThemeRendererStyle(galleryThemes[initialThemeKey])
  );
  const wallStyleSelectionRef = useRef<WallStyleSelection>(
    initialWallStyleSelection
  );
  const floorStyleRef = useRef<FloorStyleKey | null>(initialFloorStyle);
  const frameStyleRef = useRef<FrameStyleKey | null>(initialFrameStyle);
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>("idle");
  const [imageAssetStatus, setImageAssetStatus] = useState<ImageAssetStatus>(
    images.length > 0 ? "checking" : "missing"
  );
  const [mode, setMode] = useState<GalleryMode>("gallery");
  const [focusedArtworkId, setFocusedArtworkId] = useState<string | null>(null);
  const [hoveredArtworkId, setHoveredArtworkId] = useState<string | null>(null);
  const [selectedArtwork, setSelectedArtwork] = useState<GalleryArtwork | null>(null);
  const [isFocusModeVisible, setIsFocusModeVisible] = useState(false);
  const [descriptionOverrides, setDescriptionOverrides] = useState<
    Record<string, string>
  >(() => loadDescriptionOverrides());
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [draftDescription, setDraftDescription] = useState("");
  const [selectedThemeKey, setSelectedThemeKey] =
    useState<GalleryThemeKey>(initialThemeKey);
  const [wallStyleTarget, setWallStyleTarget] = useState<WallStyleTarget>("all");
  const [wallStyleSelection, setWallStyleSelection] = useState<WallStyleSelection>(
    () => wallStyleSelectionRef.current
  );
  const [floorStyleKey, setFloorStyleKey] = useState<FloorStyleKey | null>(
    () => floorStyleRef.current
  );
  const [frameStyleKey, setFrameStyleKey] = useState<FrameStyleKey | null>(
    () => frameStyleRef.current
  );
  const [configuredAllocation, setConfiguredAllocation] =
    useState<UserWallAllocation | null>(null);
  const [configStatus, setConfigStatus] = useState("");
  const [snapshotStatus, setSnapshotStatus] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioFileName, setAudioFileName] = useState(() => loadAudioFileName());
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0.45);
  const [decorations, setDecorations] = useState<DecorationItem[]>(() =>
    ENABLE_OBJECT_DECORATIONS ? loadDecorations() : []
  );
  const [selectedDecorationId, setSelectedDecorationId] = useState<string | null>(null);
  const [isDecorationPanelOpen, setIsDecorationPanelOpen] = useState(false);
  const artworks = useMemo(() => {
    let heroCount = 0;

    return images.map((image, index) => {
      const artwork = getArtworkData(image, index, images.length, heroCount);

      if (artwork.role === "hero") {
        heroCount += 1;
      }

      return artwork;
    });
  }, [images]);
  const activeAllocation = configuredAllocation ?? allocation;
  const canRenderGallery = images.length > 0 && imageAssetStatus === "ready";
  const hasRestoredGalleryConfig = Boolean(savedGalleryConfig);
  const selectedArtworkIndex = selectedArtwork
    ? artworks.findIndex((artwork) => artwork.id === selectedArtwork.id)
    : -1;
  const selectedArtworkDescription = selectedArtwork
    ? descriptionOverrides[selectedArtwork.id] ?? selectedArtwork.description
    : "";
  const activeWallStyleKey =
    wallStyleTarget === "all"
      ? wallStyleSelection.front === wallStyleSelection.left &&
        wallStyleSelection.left === wallStyleSelection.right
        ? wallStyleSelection.front
        : null
      : wallStyleSelection[wallStyleTarget];
  const modalTheme =
    selectedArtwork?.mood === "dynamic"
      ? {
          panelBackground:
            "linear-gradient(145deg, rgba(54, 20, 14, 0.86), rgba(15, 12, 10, 0.78))",
          borderColor: "rgba(255, 180, 122, 0.2)",
          textColor: "#fff4eb",
          mutedTextColor: "rgba(255, 236, 220, 0.64)",
          badgeBackground: "rgba(255, 139, 79, 0.16)",
          badgeBorder: "rgba(255, 190, 145, 0.22)",
          badgeText: "#ffe6d4",
          accentColor: "#ffb07a"
        }
      : {
          panelBackground:
            "linear-gradient(145deg, rgba(22, 31, 46, 0.88), rgba(12, 16, 24, 0.78))",
          borderColor: "rgba(178, 207, 235, 0.18)",
          textColor: "#eef6ff",
          mutedTextColor: "rgba(226, 240, 255, 0.62)",
          badgeBackground: "rgba(148, 185, 218, 0.14)",
          badgeBorder: "rgba(194, 221, 245, 0.2)",
          badgeText: "#e5f2ff",
          accentColor: "#a9c9e8"
        };
  const selectedDecoration = decorations.find(
    (decoration) => decoration.id === selectedDecorationId
  );
  const selectedDecorationName = selectedDecoration
    ? DECORATION_LIBRARY.find((item) => item.type === selectedDecoration.type)?.name ??
      "Decoration"
    : "None selected";

  function closeArtworkPreview() {
    window.dispatchEvent(new Event("gallery:clear-focus"));
    setMode("gallery");
    setFocusedArtworkId(null);
    setIsFocusModeVisible(false);
    window.setTimeout(() => {
      setSelectedArtwork(null);
    }, 260);
  }

  function applyWallStyle(styleKey: WallStyleKey) {
    setWallStyleSelection((currentSelection) => {
      const nextSelection = { ...currentSelection };

      if (wallStyleTarget === "all") {
        nextSelection.front = styleKey;
        nextSelection.left = styleKey;
        nextSelection.right = styleKey;
      } else {
        nextSelection[wallStyleTarget] = styleKey;
      }

      return nextSelection;
    });
  }

  function getCurrentGalleryConfig(): GalleryConfig {
    return {
      app: GALLERY_CONFIG_APP,
      version: GALLERY_CONFIG_VERSION,
      createdAt: new Date().toISOString(),
      theme: selectedThemeKey,
      wallStyles: wallStyleSelection,
      floorStyle: floorStyleKey,
      frameStyle: frameStyleKey,
      artworkDescriptions: artworks.map((artwork) => ({
        fileName: images.find((image) => image.id === artwork.id)?.name ?? artwork.title,
        description: descriptionOverrides[artwork.id] ?? artwork.description
      })),
      wallAllocation: getWallAllocationReferences(activeAllocation, images),
      artworkReferences: artworks.map((artwork) => ({
        fileName: images.find((image) => image.id === artwork.id)?.name ?? artwork.title,
        title: artwork.title
      })),
      backgroundMusicFileName: audioFileName || undefined
    };
  }

  function applyGalleryConfig(config: GalleryConfig) {
    if (config.theme) {
      setSelectedThemeKey(config.theme);
    }

    if (config.wallStyles) {
      setWallStyleSelection(config.wallStyles);
    }

    if ("floorStyle" in config) {
      setFloorStyleKey(config.floorStyle ?? null);
    }

    if ("frameStyle" in config) {
      setFrameStyleKey(config.frameStyle ?? null);
    }

    if (config.artworkDescriptions) {
      const descriptionsByFileName = new Map(
        config.artworkDescriptions.map((item) => [item.fileName, item.description])
      );
      const matchedDescriptions = images.reduce<Record<string, string>>(
        (nextOverrides, image) => {
          const description = descriptionsByFileName.get(image.name);

          if (typeof description === "string") {
            nextOverrides[image.id] = description;
          }

          return nextOverrides;
        },
        {}
      );

      if (Object.keys(matchedDescriptions).length > 0) {
        setDescriptionOverrides((current) => ({ ...current, ...matchedDescriptions }));

        try {
          Object.entries(matchedDescriptions).forEach(([artworkId, description]) => {
            window.localStorage.setItem(getDescriptionStorageKey(artworkId), description);
          });
        } catch {
          // Description persistence is optional; imported state remains active.
        }
      }
    }

    const importedAllocation = resolveWallAllocation(config.wallAllocation, images);
    if (importedAllocation) {
      setConfiguredAllocation(importedAllocation);
    }

    if (config.backgroundMusicFileName) {
      setAudioFileName(config.backgroundMusicFileName);
    }
  }

  function saveGalleryConfig() {
    try {
      window.localStorage.setItem(
        GALLERY_CONFIG_STORAGE_KEY,
        JSON.stringify(getCurrentGalleryConfig())
      );
      setConfigStatus("Gallery config saved.");
    } catch {
      setConfigStatus("Unable to save gallery config.");
    }
  }

  function exportGalleryConfig() {
    try {
      const configBlob = new Blob([JSON.stringify(getCurrentGalleryConfig(), null, 2)], {
        type: "application/json"
      });
      const downloadUrl = URL.createObjectURL(configBlob);
      const downloadLink = document.createElement("a");

      downloadLink.href = downloadUrl;
      downloadLink.download = "personal-art-gallery-config.json";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(downloadUrl);
      setConfigStatus("Gallery config exported.");
    } catch {
      setConfigStatus("Unable to export gallery config.");
    }
  }

  async function importGalleryConfig(event: ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const importedConfig = parseGalleryConfig(JSON.parse(await file.text()));

      if (!importedConfig) {
        setConfigStatus("Invalid Personal Art Gallery config.");
        return;
      }

      applyGalleryConfig(importedConfig);

      try {
        window.localStorage.setItem(
          GALLERY_CONFIG_STORAGE_KEY,
          JSON.stringify(importedConfig)
        );
      } catch {
        // Import remains active for the current session if storage is unavailable.
      }

      setConfigStatus("Gallery config imported.");
    } catch {
      setConfigStatus("Invalid JSON config file.");
    }
  }

  function resetGalleryConfig() {
    try {
      window.localStorage.removeItem(GALLERY_CONFIG_STORAGE_KEY);
    } catch {
      // Reset remains active for the current session if storage is unavailable.
    }

    setSelectedThemeKey("whiteGallery");
    setWallStyleSelection({ ...DEFAULT_WALL_STYLE_SELECTION });
    setFloorStyleKey(null);
    setFrameStyleKey(null);
    setConfiguredAllocation(null);
    setConfigStatus("Gallery config reset.");
  }

  function exportGallerySnapshot() {
    const canvas = canvasRef.current;

    if (!canRenderGallery || sceneStatus !== "ready" || !canvas) {
      setSnapshotStatus("Snapshot is not available yet.");
      return;
    }

    try {
      canvas.toBlob((snapshotBlob) => {
        if (!snapshotBlob) {
          setSnapshotStatus("Unable to export snapshot.");
          return;
        }

        const downloadUrl = URL.createObjectURL(snapshotBlob);
        const downloadLink = document.createElement("a");

        downloadLink.href = downloadUrl;
        downloadLink.download = "personal-art-gallery-snapshot.png";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        URL.revokeObjectURL(downloadUrl);
        setSnapshotStatus("Snapshot exported.");
      }, "image/png");
    } catch {
      setSnapshotStatus("Unable to export snapshot.");
    }
  }

  function handleAudioUpload(event: ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);

    if (!file) {
      return;
    }

    const isSupportedAudio =
      file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(file.name);

    if (!isSupportedAudio) {
      event.target.value = "";
      return;
    }

    audioRef.current?.pause();
    setIsAudioPlaying(false);

    const nextAudioUrl = URL.createObjectURL(file);

    setAudioUrl(nextAudioUrl);
    setAudioFileName(file.name);

    try {
      window.localStorage.setItem(AUDIO_FILE_NAME_STORAGE_KEY, file.name);
    } catch {
      // File name persistence is optional.
    }

    event.target.value = "";
  }

  async function toggleAudioPlayback() {
    const audio = audioRef.current;

    if (!audio || !audioUrl) {
      return;
    }

    if (isAudioPlaying) {
      audio.pause();
      setIsAudioPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsAudioPlaying(true);
    } catch {
      setIsAudioPlaying(false);
    }
  }

  function handleAudioVolumeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextVolume = clamp(Number(event.target.value), 0, 1);

    setAudioVolume(nextVolume);

    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }
  }

  function updateDecorations(nextDecorations: DecorationItem[]) {
    decorationsRef.current = nextDecorations;
    saveDecorations(nextDecorations);
    setDecorations(nextDecorations);
    decorationSceneApiRef.current?.syncDecorations(
      nextDecorations,
      selectedDecorationIdRef.current
    );
  }

  function addDecoration(type: DecorationType) {
    const nextIndex = decorationsRef.current.length;
    const basePosition =
      DECORATION_START_POSITIONS[nextIndex % DECORATION_START_POSITIONS.length];
    const offsetRound = Math.floor(nextIndex / DECORATION_START_POSITIONS.length);
    const nextDecoration: DecorationItem = {
      id: `decoration-${Date.now()}-${nextIndex}`,
      type,
      position: clampDecorationPosition({
        x: basePosition.x + offsetRound * 0.28,
        z: basePosition.z - offsetRound * 0.28
      })
    };
    const nextDecorations = [...decorationsRef.current, nextDecoration];

    selectedDecorationIdRef.current = nextDecoration.id;
    setSelectedDecorationId(nextDecoration.id);
    updateDecorations(nextDecorations);
  }

  function selectDecoration(decorationId: string | null) {
    selectedDecorationIdRef.current = decorationId;
    setSelectedDecorationId(decorationId);
    decorationSceneApiRef.current?.syncDecorations(
      decorationsRef.current,
      decorationId
    );
  }

  function deleteSelectedDecoration() {
    if (!selectedDecorationIdRef.current) {
      return;
    }

    const nextDecorations = decorationsRef.current.filter(
      (decoration) => decoration.id !== selectedDecorationIdRef.current
    );

    selectedDecorationIdRef.current = null;
    setSelectedDecorationId(null);
    updateDecorations(nextDecorations);
  }

  function moveSelectedDecoration(deltaX: number, deltaZ: number) {
    if (!selectedDecorationIdRef.current) {
      return;
    }

    const nextDecorations = decorationsRef.current.map((decoration) =>
      decoration.id === selectedDecorationIdRef.current
        ? {
            ...decoration,
            position: clampDecorationPosition({
              x: decoration.position.x + deltaX,
              z: decoration.position.z + deltaZ
            })
          }
        : decoration
    );

    updateDecorations(nextDecorations);
  }

  useEffect(() => {
    activeThemeRef.current = getThemeRendererStyle(galleryThemes[selectedThemeKey]);
  }, [selectedThemeKey]);

  useEffect(() => {
    wallStyleSelectionRef.current = wallStyleSelection;
    saveWallStyleSelection(wallStyleSelection);
  }, [wallStyleSelection]);

  useEffect(() => {
    floorStyleRef.current = floorStyleKey;
    saveFloorStyle(floorStyleKey);
  }, [floorStyleKey]);

  useEffect(() => {
    frameStyleRef.current = frameStyleKey;
    saveFrameStyle(frameStyleKey);
  }, [frameStyleKey]);

  useEffect(() => {
    if (!ENABLE_OBJECT_DECORATIONS) {
      decorationsRef.current = [];
      decorationSceneApiRef.current?.syncDecorations([], null);
      return;
    }

    decorationsRef.current = decorations;
    saveDecorations(decorations);
    decorationSceneApiRef.current?.syncDecorations(
      decorations,
      selectedDecorationIdRef.current
    );
  }, [decorations]);

  useEffect(() => {
    if (!ENABLE_OBJECT_DECORATIONS) {
      selectedDecorationIdRef.current = null;
      decorationSceneApiRef.current?.syncDecorations([], null);
      return;
    }

    selectedDecorationIdRef.current = selectedDecorationId;
    decorationSceneApiRef.current?.syncDecorations(
      decorationsRef.current,
      selectedDecorationId
    );
  }, [selectedDecorationId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  useEffect(() => {
    if (savedGalleryConfig) {
      applyGalleryConfig(savedGalleryConfig);
    }
  }, [images, savedGalleryConfig]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!selectedArtwork) {
      setIsFocusModeVisible(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setIsFocusModeVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [selectedArtwork]);

  useEffect(() => {
    if (!selectedArtwork) {
      setIsEditingDescription(false);
      setDraftDescription("");
      return;
    }

    setIsEditingDescription(false);
    setDraftDescription(
      descriptionOverrides[selectedArtwork.id] ?? selectedArtwork.description
    );
  }, [descriptionOverrides, selectedArtwork]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeArtworkPreview();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (images.length === 0) {
      setImageAssetStatus("missing");
      return;
    }

    setImageAssetStatus("checking");

    Promise.all(
      images.map(
        (image) =>
          new Promise<boolean>((resolve) => {
            const previewImage = new Image();

            previewImage.onload = () => resolve(true);
            previewImage.onerror = () => resolve(false);
            previewImage.src = image.url;
          })
      )
    ).then((results) => {
      if (!cancelled) {
        setImageAssetStatus(results.every(Boolean) ? "ready" : "missing");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [images]);

  useEffect(() => {
    if (!canRenderGallery || artworks.length === 0 || !canvasRef.current) {
      setSceneStatus("idle");
      return;
    }

    let disposed = false;
    let animationFrame = 0;
    const cleanupTasks: Array<() => void> = [];

    async function createGalleryRoom() {
      setSceneStatus("loading");

      try {
        const threeUrl = "https://esm.sh/three@0.179.1";
        const controlsUrl =
          "https://esm.sh/three@0.179.1/examples/jsm/controls/OrbitControls.js";
        const THREE = await import(/* @vite-ignore */ threeUrl);
        const { OrbitControls } = await import(/* @vite-ignore */ controlsUrl);

        if (disposed || !canvasRef.current) {
          return;
        }

        const canvas = canvasRef.current;
        const renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          preserveDrawingBuffer: true
        });
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
        const controls = new OrbitControls(camera, canvas);
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const clickableArtworks: any[] = [];
        const decorationClickables: any[] = [];
        const decorationObjects = new Map<
          string,
          {
            group: any;
            geometries: any[];
            materials: any[];
          }
        >();
        const focusableArtworkItems: Array<{
          id: string;
          group: any;
          imageMaterial: any;
          frameMaterial: any;
          basePosition: any;
          center: any;
          normal: any;
          baseEmissiveIntensity: number;
          baseRenderScale: number;
          baseOpacity: number;
          baseFrameOpacity: number;
          inactiveOpacity: number;
          inactiveFrameOpacity: number;
          inactiveScale: number;
          hoverDimOpacity: number;
          hoverDimFrameOpacity: number;
          role: ArtworkLayout["role"];
          semanticClusterId: string;
          semanticTags: string[];
          visualWeight: number;
        }> = [];
        const spotlightRigs: Array<{
          artworkId: string;
          light: any;
          material: any;
          center: any;
          baseIntensity: number;
          baseAngle: number;
          baseEmissiveIntensity: number;
          focusScore: number;
          role: ArtworkLayout["role"];
        }> = [];
        const defaultCameraPosition = new THREE.Vector3(0, 1.72, ROOM_DEPTH / 2 - 0.72);
        const defaultControlsTarget = new THREE.Vector3(0, 1.45, 0);
        const defaultCameraFov = 58;
        let focusedArtworkGroup: any | null = null;
        let focusedSceneArtworkId: string | null = null;
        let hoveredSceneArtworkId: string | null = null;
        let sceneMode: GalleryMode = "gallery";
        const currentBackgroundColor = new THREE.Color(
          activeThemeRef.current.backgroundColor
        );
        const targetBackgroundColor = new THREE.Color();
        const targetWallColor = new THREE.Color();
        const targetFrontWallColor = new THREE.Color();
        const targetLeftWallColor = new THREE.Color();
        const targetRightWallColor = new THREE.Color();
        const targetCeilingColor = new THREE.Color();
        const targetFloorColor = new THREE.Color();
        const targetFrameColor = new THREE.Color();
        const targetArtworkColor = new THREE.Color();
        const targetContextArtworkColor = new THREE.Color();
        const targetSpotlightColor = new THREE.Color();

        renderer.shadowMap.enabled = false;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1;
        renderer.setClearColor(currentBackgroundColor);
        scene.background = currentBackgroundColor.clone();
        camera.fov = defaultCameraFov;
        camera.position.copy(defaultCameraPosition);

        controls.enabled = true;
        controls.enableDamping = true;
        controls.enableRotate = true;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.dampingFactor = 0.085;
        controls.target.copy(defaultControlsTarget);
        controls.minDistance = 1.2;
        controls.maxDistance = 11;
        controls.minAzimuthAngle = -Infinity;
        controls.maxAzimuthAngle = Infinity;
        controls.minPolarAngle = 0.18;
        controls.maxPolarAngle = Math.PI - 0.18;
        camera.lookAt(controls.target);

        function setControlsEnabled(enabled: boolean) {
          controls.enabled = enabled;
          controls.enableRotate = true;
          controls.enableZoom = true;
          controls.enablePan = true;
        }

        function getCuratorialRenderProfile(role: ArtworkLayout["role"]) {
          return {
            hero: {
              relativeVisualWeight: 1,
              scale: 1,
              opacity: 1,
              frameOpacity: 1,
              emissiveBias: 0,
              inactiveOpacity: 1,
              inactiveFrameOpacity: 1,
              inactiveScale: 1,
              hoverDimOpacity: 1,
              hoverDimFrameOpacity: 1,
              roughness: 0.58
            },
            support: {
              relativeVisualWeight: 1,
              scale: 1,
              opacity: 1,
              frameOpacity: 1,
              emissiveBias: 0,
              inactiveOpacity: 1,
              inactiveFrameOpacity: 1,
              inactiveScale: 1,
              hoverDimOpacity: 1,
              hoverDimFrameOpacity: 1,
              roughness: 0.6
            },
            context: {
              relativeVisualWeight: 1,
              scale: 1,
              opacity: 1,
              frameOpacity: 1,
              emissiveBias: 0,
              inactiveOpacity: 1,
              inactiveFrameOpacity: 1,
              inactiveScale: 1,
              hoverDimOpacity: 1,
              hoverDimFrameOpacity: 1,
              roughness: 0.64
            }
          }[role];
        }

        let galleryOrchestrator: {
          state: GalleryExperienceState;
          setState(nextState: GalleryExperienceState): void;
          isActive(): boolean;
          isInteractive(): boolean;
          canInteract(): boolean;
          enterFocus(): void;
          exitFocus(): void;
          startGalleryExperience(): void;
          update(): void;
        };

        const cameraController = {
          mode: "orbit" as CameraControllerMode,
          hoveredArtworkGroup: null as any | null,
          focusedArtworkGroup: null as any | null,

          setHoverTarget(artworkGroup: any | null) {
            this.hoveredArtworkGroup = artworkGroup;

            if (this.mode === "orbit" && artworkGroup) {
              this.mode = "hover";
            }

            if (this.mode === "hover" && !artworkGroup) {
              this.mode = "orbit";
            }
          },

          focusArtwork(artworkGroup: any) {
            this.focusedArtworkGroup = artworkGroup;
            this.mode = "focus";
            setControlsEnabled(true);
          },

          exitFocus() {
            this.focusedArtworkGroup = null;
            this.mode = this.hoveredArtworkGroup ? "hover" : "orbit";
            setControlsEnabled(true);
          },

          update() {
            setControlsEnabled(true);
          }
        };

        galleryOrchestrator = {
          state: "ACTIVE" as GalleryExperienceState,

          setState(nextState: GalleryExperienceState) {
            if (this.state === nextState) {
              return;
            }

            this.state = nextState;
            setControlsEnabled(nextState === "ACTIVE" || nextState === "FOCUS");
          },

          isActive() {
            return this.state === "ACTIVE";
          },

          isInteractive() {
            return this.state === "ACTIVE" || this.state === "FOCUS";
          },

          canInteract() {
            return this.state === "ACTIVE" || this.state === "FOCUS";
          },

          enterFocus() {
            this.setState("FOCUS");
          },

          exitFocus() {
            this.setState("ACTIVE");
          },

          startGalleryExperience() {
            cameraController.mode = "orbit";
            camera.position.copy(defaultCameraPosition);
            camera.fov = defaultCameraFov;
            camera.updateProjectionMatrix();
            controls.target.copy(defaultControlsTarget);
            camera.lookAt(controls.target);
            this.setState("ACTIVE");
          },

          update() {
            cameraController.update();
          }
        };

        function startGalleryExperience() {
          galleryOrchestrator.startGalleryExperience();
        }

        const ambientFillLight = new THREE.HemisphereLight(
          "#ffffff",
          "#8e918a",
          Math.max(0.78, activeThemeRef.current.ambientLightIntensity * 1.9)
        );
        scene.add(ambientFillLight);

        cleanupTasks.push(() => {
          scene.remove(ambientFillLight);
        });

        function addArtworkSpotlight(
          artworkId: string,
          layout: ArtworkLayout,
          artwork: any,
          material: any
        ) {
          artwork.updateWorldMatrix(true, true);

          const artworkBounds = new THREE.Box3().setFromObject(artwork);
          const artworkCenter = new THREE.Vector3();
          const artworkSize = new THREE.Vector3();

          artworkBounds.getCenter(artworkCenter);
          artworkBounds.getSize(artworkSize);

          const target = new THREE.Object3D();
          const artworkWorldQuaternion = new THREE.Quaternion();
          const normal = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(artwork.getWorldQuaternion(artworkWorldQuaternion))
            .normalize();
          const offsetDistance = layout.role === "hero" ? 1.08 : 0.86;
          const targetPoint = artworkCenter.clone();
          targetPoint.y += artworkSize.y * 0.16;

          const lightPosition = targetPoint
            .clone()
            .add(normal.clone().multiplyScalar(offsetDistance));

          target.position.copy(targetPoint);
          lightPosition.y = Math.min(
            ROOM_HEIGHT - 0.16,
            artworkCenter.y + artworkSize.y * 0.68
          );

          const lightSettings = {
            hero: {
              intensity: 0.96,
              angle: Math.PI / 4.8,
              penumbra: 0.34,
              distance: 5.6
            },
            support: {
              intensity: 0.9,
              angle: Math.PI / 4.7,
              penumbra: 0.36,
              distance: 5.6
            },
            context: {
              intensity: 0.86,
              angle: Math.PI / 4.6,
              penumbra: 0.38,
              distance: 5.6
            }
          }[layout.role];

          const artworkLight = new THREE.SpotLight(
            activeThemeRef.current.spotlightColor,
            lightSettings.intensity,
            lightSettings.distance,
            lightSettings.angle,
            lightSettings.penumbra,
            1.45
          );

          artworkLight.position.copy(lightPosition);
          artworkLight.target = target;
          artworkLight.castShadow = false;

          scene.add(target);
          scene.add(artworkLight);

          spotlightRigs.push({
            artworkId,
            light: artworkLight,
            material,
            center: artworkCenter.clone(),
            baseIntensity: lightSettings.intensity,
            baseAngle: lightSettings.angle,
            baseEmissiveIntensity: material.emissiveIntensity ?? 0,
            focusScore: 0,
            role: layout.role
          });

          cleanupTasks.push(() => {
            scene.remove(artworkLight);
            scene.remove(target);
          });
        }

        const createWallMaterial = () =>
          new THREE.MeshStandardMaterial({
            color: activeThemeRef.current.wallColor,
            roughness: activeThemeRef.current.wallRoughness,
            metalness: 0.01,
            transparent: true,
            opacity: 1,
            side: THREE.BackSide
          });
        const frontWallMaterial = createWallMaterial();
        const leftWallMaterial = createWallMaterial();
        const rightWallMaterial = createWallMaterial();
        const backRoomMaterial = new THREE.MeshStandardMaterial({
          color: activeThemeRef.current.wallColor,
          roughness: activeThemeRef.current.wallRoughness,
          metalness: 0.01,
          transparent: true,
          opacity: 1,
          side: THREE.BackSide
        });
        const ceilingMaterial = new THREE.MeshStandardMaterial({
          color: activeThemeRef.current.ceilingColor,
          roughness: activeThemeRef.current.wallRoughness,
          metalness: 0.01,
          side: THREE.BackSide
        });
        const floorMaterial = new THREE.MeshStandardMaterial({
          color: activeThemeRef.current.floorColor,
          roughness: activeThemeRef.current.floorRoughness,
          metalness: 0.015,
          side: THREE.BackSide
        });
        const backWallMaterial = new THREE.MeshStandardMaterial({
          color: activeThemeRef.current.wallColor,
          roughness: activeThemeRef.current.wallRoughness,
          metalness: 0.01,
          side: THREE.DoubleSide
        });
        const roomGeometry = new THREE.BoxGeometry(
          ROOM_WIDTH,
          ROOM_HEIGHT,
          ROOM_DEPTH
        );
        const backWallGeometry = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
        const roomRoot = new THREE.Group();
        roomRoot.name = "RoomRoot";
        scene.add(roomRoot);

        const room = new THREE.Mesh(roomGeometry, [
          rightWallMaterial,
          leftWallMaterial,
          ceilingMaterial,
          floorMaterial,
          backRoomMaterial,
          frontWallMaterial
        ]);
        room.name = "Room";
        room.position.set(0, ROOM_HEIGHT / 2, 0);
        room.receiveShadow = false;
        roomRoot.add(room);

        const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
        backWall.name = "BackWall";
        backWall.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2 - 0.032);
        backWall.receiveShadow = false;
        roomRoot.add(backWall);

        const artworkFaceOffset = 0.045;

        function getFaceTransform(face: GalleryFace, localPosition: [number, number, number]) {
          const [horizontal, vertical] = localPosition;

          if (face === "front") {
            return {
              position: new THREE.Vector3(
                horizontal,
                vertical - ROOM_HEIGHT / 2,
                -ROOM_DEPTH / 2 + artworkFaceOffset
              ),
              rotation: new THREE.Euler(0, 0, 0)
            };
          }

          if (face === "left") {
            return {
              position: new THREE.Vector3(
                -ROOM_WIDTH / 2 + artworkFaceOffset,
                vertical - ROOM_HEIGHT / 2,
                horizontal
              ),
              rotation: new THREE.Euler(0, Math.PI / 2, 0)
            };
          }

          return {
            position: new THREE.Vector3(
              ROOM_WIDTH / 2 - artworkFaceOffset,
              vertical - ROOM_HEIGHT / 2,
              -horizontal
            ),
            rotation: new THREE.Euler(0, -Math.PI / 2, 0)
          };
        }

        function attachArtworkToFace(artwork: any, layout: ArtworkLayout) {
          artwork.userData.attachedFace = layout.face;
          artwork.attachToFace = (face: GalleryFace) => {
            const transform = getFaceTransform(face, layout.position);

            artwork.position.copy(transform.position);
            artwork.rotation.copy(transform.rotation);
          };
          artwork.attachToFace(layout.face);
          room.add(artwork);
        }

        function createDecorationMaterial(
          color: string,
          roughness = 0.72,
          metalness = 0.04
        ) {
          return new THREE.MeshStandardMaterial({
            color,
            roughness,
            metalness
          });
        }

        function addDecorationMesh(
          group: any,
          geometry: any,
          material: any,
          position: [number, number, number],
          geometries: any[],
          materials: any[],
          scale?: [number, number, number]
        ) {
          const mesh = new THREE.Mesh(geometry, material);

          mesh.position.set(...position);
          if (scale) {
            mesh.scale.set(...scale);
          }
          mesh.userData.decorationGroup = group;
          mesh.userData.decorationId = group.userData.decorationId;
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          group.add(mesh);
          decorationClickables.push(mesh);
          geometries.push(geometry);
          materials.push(material);

          return mesh;
        }

        function createDecorationGroup(item: DecorationItem, isSelected: boolean) {
          const group = new THREE.Group();
          const geometries: any[] = [];
          const materials: any[] = [];
          const neutralMaterial = createDecorationMaterial("#d7d2c8", 0.74, 0.035);
          const darkMaterial = createDecorationMaterial("#3d403b", 0.68, 0.045);
          const greenMaterial = createDecorationMaterial("#6f856b", 0.82, 0.02);
          const accentMaterial = createDecorationMaterial("#b8aa97", 0.78, 0.03);

          group.name = `Decoration:${item.type}`;
          group.userData.decorationId = item.id;
          group.position.set(item.position.x, 0, item.position.z);

          if (isSelected) {
            const highlightMaterial = new THREE.MeshBasicMaterial({
              color: "#d8b46a",
              transparent: true,
              opacity: 0.34,
              depthWrite: false
            });

            addDecorationMesh(
              group,
              new THREE.CylinderGeometry(0.52, 0.52, 0.018, 32),
              highlightMaterial,
              [0, 0.012, 0],
              geometries,
              materials
            );
          }

          if (item.type === "plant") {
            addDecorationMesh(
              group,
              new THREE.CylinderGeometry(0.16, 0.2, 0.28, 18),
              accentMaterial,
              [0, 0.14, 0],
              geometries,
              materials
            );
            addDecorationMesh(
              group,
              new THREE.CylinderGeometry(0.035, 0.045, 0.34, 10),
              darkMaterial,
              [0, 0.45, 0],
              geometries,
              materials
            );
            addDecorationMesh(
              group,
              new THREE.SphereGeometry(0.23, 18, 14),
              greenMaterial,
              [0, 0.72, 0],
              geometries,
              materials,
              [1.05, 0.85, 1]
            );
            addDecorationMesh(
              group,
              new THREE.SphereGeometry(0.16, 16, 12),
              greenMaterial.clone(),
              [-0.16, 0.62, 0.04],
              geometries,
              materials
            );
            addDecorationMesh(
              group,
              new THREE.SphereGeometry(0.15, 16, 12),
              greenMaterial.clone(),
              [0.16, 0.64, -0.03],
              geometries,
              materials
            );
          }

          if (item.type === "pedestal") {
            addDecorationMesh(
              group,
              new THREE.BoxGeometry(0.62, 0.78, 0.62),
              neutralMaterial,
              [0, 0.39, 0],
              geometries,
              materials
            );
            addDecorationMesh(
              group,
              new THREE.BoxGeometry(0.72, 0.08, 0.72),
              accentMaterial,
              [0, 0.82, 0],
              geometries,
              materials
            );
          }

          if (item.type === "sculpture") {
            addDecorationMesh(
              group,
              new THREE.CylinderGeometry(0.32, 0.36, 0.16, 24),
              neutralMaterial,
              [0, 0.08, 0],
              geometries,
              materials
            );
            addDecorationMesh(
              group,
              new THREE.SphereGeometry(0.2, 22, 16),
              accentMaterial,
              [0, 0.38, 0],
              geometries,
              materials
            );
            addDecorationMesh(
              group,
              new THREE.ConeGeometry(0.16, 0.36, 20),
              neutralMaterial.clone(),
              [0.05, 0.68, 0],
              geometries,
              materials
            );
          }

          if (item.type === "bench") {
            addDecorationMesh(
              group,
              new THREE.BoxGeometry(1.28, 0.12, 0.42),
              accentMaterial,
              [0, 0.44, 0],
              geometries,
              materials
            );
            [[-0.48, 0.22, -0.13], [0.48, 0.22, -0.13], [-0.48, 0.22, 0.13], [0.48, 0.22, 0.13]].forEach(
              (position) => {
                addDecorationMesh(
                  group,
                  new THREE.BoxGeometry(0.08, 0.42, 0.08),
                  darkMaterial.clone(),
                  position as [number, number, number],
                  geometries,
                  materials
                );
              }
            );
          }

          if (item.type === "labelBoard") {
            addDecorationMesh(
              group,
              new THREE.BoxGeometry(0.05, 0.78, 0.05),
              darkMaterial,
              [-0.32, 0.39, 0],
              geometries,
              materials
            );
            addDecorationMesh(
              group,
              new THREE.BoxGeometry(0.05, 0.78, 0.05),
              darkMaterial.clone(),
              [0.32, 0.39, 0],
              geometries,
              materials
            );
            addDecorationMesh(
              group,
              new THREE.BoxGeometry(0.78, 0.36, 0.05),
              neutralMaterial,
              [0, 0.82, 0],
              geometries,
              materials
            );
          }

          roomRoot.add(group);

          return {
            group,
            geometries,
            materials
          };
        }

        function disposeDecorationObject(decorationObject: {
          group: any;
          geometries: any[];
          materials: any[];
        }) {
          roomRoot.remove(decorationObject.group);
          decorationObject.geometries.forEach((geometry) => geometry.dispose());
          decorationObject.materials.forEach((material) => material.dispose());
        }

        function syncDecorations(
          nextDecorations: DecorationItem[],
          selectedId: string | null
        ) {
          decorationClickables.length = 0;
          decorationObjects.forEach((decorationObject) =>
            disposeDecorationObject(decorationObject)
          );
          decorationObjects.clear();

          nextDecorations.forEach((decoration) => {
            decorationObjects.set(
              decoration.id,
              createDecorationGroup(decoration, decoration.id === selectedId)
            );
          });
        }

        decorationSceneApiRef.current = {
          syncDecorations
        };
        syncDecorations(
          ENABLE_OBJECT_DECORATIONS ? decorationsRef.current : [],
          ENABLE_OBJECT_DECORATIONS ? selectedDecorationIdRef.current : null
        );
        cleanupTasks.push(() => {
          decorationSceneApiRef.current = null;
          decorationObjects.forEach((decorationObject) =>
            disposeDecorationObject(decorationObject)
          );
          decorationObjects.clear();
          decorationClickables.length = 0;
        });

        const textureLoader = new THREE.TextureLoader();
        const initialFrameStyle = frameStyleRef.current
          ? FRAME_STYLE_PRESETS[frameStyleRef.current]
          : null;
        const frameMaterial = new THREE.MeshStandardMaterial({
          color: initialFrameStyle?.color ?? activeThemeRef.current.frameColor,
          roughness:
            initialFrameStyle?.roughness ??
            Math.max(0.34, activeThemeRef.current.frameRoughness * 0.82),
          metalness: initialFrameStyle?.metalness ?? 0.06
        });
        const curatedLayout = generateUserDrivenLayout(
          artworks,
          activeAllocation ?? undefined
        );
        scene.userData.semanticGraph = curatedLayout.semanticGraph;
        scene.userData.clusterMap = curatedLayout.clusterMap;
        const artworkLayouts = curatedLayout.positionedArtworks.map(
          (positionedArtwork) => positionedArtwork.layout
        );

        cleanupTasks.push(() => {
          window.cancelAnimationFrame(animationFrame);
          controls.dispose();
          scene.remove(roomRoot);
          roomGeometry.dispose();
          backWallGeometry.dispose();
          frontWallMaterial.dispose();
          leftWallMaterial.dispose();
          rightWallMaterial.dispose();
          backRoomMaterial.dispose();
          ceilingMaterial.dispose();
          floorMaterial.dispose();
          backWallMaterial.dispose();
          frameMaterial.dispose();
          renderer.dispose();
        });

        const artworkTasks = artworks.map(async (artworkData, index) => {
          const texture = await textureLoader.loadAsync(artworkData.src);

          if (disposed) {
            texture.dispose();
            return;
          }

          texture.colorSpace = THREE.SRGBColorSpace;

          const source = texture.image as HTMLImageElement | HTMLCanvasElement;
          const aspectRatio =
            source && source.height > 0 ? source.width / source.height : 4 / 3;
          const layout = artworkLayouts[index];
          const positionedArtwork = curatedLayout.positionedArtworks[index];
          const galleryArtworkData = {
            ...artworkData,
            semanticClusterId:
              positionedArtwork?.semanticClusterId ?? artworkData.semanticClusterId,
            curatorRole: positionedArtwork?.curatorRole ?? artworkData.curatorRole,
            semanticNarrativeRole: positionedArtwork?.semanticNarrativeRole
          };
          const maxFrameWidth = layout.boundingBox.width;
          const maxFrameHeight = layout.boundingBox.height;
          const framePadding = Math.min(
            0.1,
            maxFrameWidth * 0.14,
            maxFrameHeight * 0.14
          );
          const maxImageWidth = Math.max(0.02, maxFrameWidth - framePadding);
          const maxImageHeight = Math.max(0.02, maxFrameHeight - framePadding);
          let width = maxImageWidth;
          let height = width / aspectRatio;

          if (height > maxImageHeight) {
            height = maxImageHeight;
            width = height * aspectRatio;
          }

          const renderProfile = getCuratorialRenderProfile(layout.role);
          const materialVariation = 0.5 + getCuratorNoise(index, 17) * 0.5;
          const artwork = new THREE.Group();
          const artworkFrameMaterial = frameMaterial.clone();
          artworkFrameMaterial.roughness = THREE.MathUtils.clamp(
            artworkFrameMaterial.roughness + (materialVariation - 0.5) * 0.08,
            0.34,
            0.68
          );
          artworkFrameMaterial.metalness = THREE.MathUtils.clamp(
            0.04 + materialVariation * 0.04,
            0.04,
            0.09
          );
          artwork.scale.setScalar(renderProfile.scale);

          const frame = new THREE.Mesh(
            new THREE.PlaneGeometry(width + framePadding, height + framePadding),
            artworkFrameMaterial
          );
          frame.position.z = -0.018;
          frame.castShadow = false;
          artwork.add(frame);

          const imagePlane = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshStandardMaterial({
              map: texture,
              color:
                layout.role === "context"
                  ? activeThemeRef.current.contextArtworkColor
                  : activeThemeRef.current.artworkColor,
              emissive: "#ffffff",
              emissiveIntensity:
                Math.max(
                  0.004,
                  0.035 + renderProfile.emissiveBias
              ),
              roughness: THREE.MathUtils.clamp(
                renderProfile.roughness + (materialVariation - 0.5) * 0.1,
                0.42,
                0.86
              ),
              metalness: 0.015
            })
          );
          const imageMaterial = imagePlane.material as any;
          imageMaterial.transparent = true;
          imageMaterial.opacity = renderProfile.opacity;
          artworkFrameMaterial.transparent = true;
          artworkFrameMaterial.opacity = renderProfile.frameOpacity;
          imagePlane.castShadow = false;
          imagePlane.receiveShadow = false;
          imagePlane.userData.galleryArtwork = galleryArtworkData;
          imagePlane.userData.artworkGroup = artwork;
          imagePlane.userData.artworkCenter = new THREE.Vector3(
            ...layout.position
          );
          clickableArtworks.push(imagePlane);
          artwork.add(imagePlane);
          attachArtworkToFace(artwork, layout);
          const artworkCenter = new THREE.Vector3();
          const artworkNormal = new THREE.Vector3(0, 0, 1)
            .applyEuler(artwork.rotation)
            .normalize();
          artwork.updateWorldMatrix(true, true);
          artwork.getWorldPosition(artworkCenter);
          artwork.userData.normal = artworkNormal.clone();

          focusableArtworkItems.push({
            id: artworkData.id,
            group: artwork,
            imageMaterial,
            frameMaterial: artworkFrameMaterial,
            basePosition: artwork.position.clone(),
            center: artworkCenter.clone(),
            normal: artworkNormal,
            baseEmissiveIntensity: imageMaterial.emissiveIntensity ?? 0,
            baseRenderScale: renderProfile.scale,
            baseOpacity: renderProfile.opacity,
            baseFrameOpacity: renderProfile.frameOpacity,
            inactiveOpacity: renderProfile.inactiveOpacity,
            inactiveFrameOpacity: renderProfile.inactiveFrameOpacity,
            inactiveScale: renderProfile.inactiveScale,
            hoverDimOpacity: renderProfile.hoverDimOpacity,
            hoverDimFrameOpacity: renderProfile.hoverDimFrameOpacity,
            role: layout.role,
            semanticClusterId: galleryArtworkData.semanticClusterId,
            semanticTags: galleryArtworkData.semanticTags,
            visualWeight: renderProfile.relativeVisualWeight
          });
          addArtworkSpotlight(artworkData.id, layout, artwork, imageMaterial);

          cleanupTasks.push(() => {
            texture.dispose();
            frame.geometry.dispose();
            artworkFrameMaterial.dispose();
            imagePlane.geometry.dispose();
            imagePlane.material.dispose();
          });
        });

        await Promise.all(artworkTasks);

        if (disposed) {
          return;
        }

        startGalleryExperience();

        function resizeRenderer() {
          const rect = canvas.getBoundingClientRect();
          const width = Math.max(1, Math.floor(rect.width));
          const height = Math.max(1, Math.floor(rect.height));

          renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }

        function keepCameraInsideRoom() {
          const margin = 0.18;

          camera.position.x = THREE.MathUtils.clamp(
            camera.position.x,
            -ROOM_WIDTH / 2 + margin,
            ROOM_WIDTH / 2 - margin
          );
          camera.position.y = THREE.MathUtils.clamp(
            camera.position.y,
            0.45,
            ROOM_HEIGHT - margin
          );
          camera.position.z = THREE.MathUtils.clamp(
            camera.position.z,
            -ROOM_DEPTH / 2 + margin,
            ROOM_DEPTH / 2 - margin
          );
        }

        function updateActiveArtworkLighting() {
          const theme = activeThemeRef.current;

          spotlightRigs.forEach((rig) => {
            const isFocused =
              sceneMode === "focus" && rig.artworkId === focusedSceneArtworkId;
            const isHovered = rig.artworkId === hoveredSceneArtworkId;
            const intensityBoost = isFocused ? 1.12 : isHovered ? 1.06 : 1;
            const targetIntensity =
              rig.baseIntensity *
              theme.spotlightIntensityMultiplier *
              intensityBoost;
            const targetAngle = rig.baseAngle;
            const targetEmissiveIntensity =
              Math.max(
                0,
                rig.baseEmissiveIntensity + (isFocused ? 0.018 : isHovered ? 0.012 : 0)
              );
            targetSpotlightColor.set(theme.spotlightColor);

            rig.light.intensity = THREE.MathUtils.lerp(
              rig.light.intensity,
              targetIntensity,
              0.075
            );
            rig.light.angle = THREE.MathUtils.lerp(
              rig.light.angle,
              targetAngle,
              0.055
            );
            rig.light.color.lerp(targetSpotlightColor, 0.045);
            rig.material.emissiveIntensity = THREE.MathUtils.lerp(
              rig.material.emissiveIntensity,
              targetEmissiveIntensity,
              0.075
            );
          });
        }

        function updateArtworkFocusTransition() {
          const hasFocusedArtwork =
            sceneMode === "focus" && Boolean(focusedArtworkGroup);

          focusableArtworkItems.forEach((item) => {
            const isFocused =
              hasFocusedArtwork && item.id === focusedSceneArtworkId;
            const isHovered = hoveredSceneArtworkId === item.id;
            const targetScale = item.baseRenderScale * (isFocused ? 1.05 : isHovered ? 1.025 : 1);
            const targetOpacity = item.baseOpacity;
            const targetFrameOpacity = item.baseFrameOpacity;
            const targetEmissiveIntensity =
              item.baseEmissiveIntensity + (isFocused ? 0.018 : isHovered ? 0.01 : 0);
            const targetPosition = item.basePosition;

            const nextScale = THREE.MathUtils.lerp(
              item.group.scale.x,
              targetScale,
              0.13
            );
            item.group.scale.setScalar(nextScale);
            item.group.position.lerp(targetPosition, 0.13);
            item.imageMaterial.opacity = THREE.MathUtils.lerp(
              item.imageMaterial.opacity,
              targetOpacity,
              0.14
            );
            item.frameMaterial.opacity = THREE.MathUtils.lerp(
              item.frameMaterial.opacity,
              targetFrameOpacity,
              0.14
            );
            item.imageMaterial.emissiveIntensity = THREE.MathUtils.lerp(
              item.imageMaterial.emissiveIntensity,
              targetEmissiveIntensity,
              0.12
            );
          });

        }

        function updateThemeParameters() {
          const theme = activeThemeRef.current;
          const wallStyleSelection = wallStyleSelectionRef.current;
          const frontStyle = wallStyleSelection.front
            ? WALL_STYLE_PRESETS[wallStyleSelection.front]
            : null;
          const leftStyle = wallStyleSelection.left
            ? WALL_STYLE_PRESETS[wallStyleSelection.left]
            : null;
          const rightStyle = wallStyleSelection.right
            ? WALL_STYLE_PRESETS[wallStyleSelection.right]
            : null;
          const floorStyle = floorStyleRef.current
            ? FLOOR_STYLE_PRESETS[floorStyleRef.current]
            : null;
          const frameStyle = frameStyleRef.current
            ? FRAME_STYLE_PRESETS[frameStyleRef.current]
            : null;

          targetBackgroundColor.set(theme.backgroundColor);
          targetWallColor.set(theme.wallColor);
          targetFrontWallColor.set(frontStyle?.color ?? theme.wallColor);
          targetLeftWallColor.set(leftStyle?.color ?? theme.wallColor);
          targetRightWallColor.set(rightStyle?.color ?? theme.wallColor);
          targetCeilingColor.set(theme.ceilingColor);
          targetFloorColor.set(floorStyle?.color ?? theme.floorColor);
          targetFrameColor.set(frameStyle?.color ?? theme.frameColor);
          targetArtworkColor.set(theme.artworkColor);
          targetContextArtworkColor.set(theme.contextArtworkColor);

          currentBackgroundColor.lerp(targetBackgroundColor, 0.045);
          renderer.setClearColor(currentBackgroundColor);
          scene.background = currentBackgroundColor.clone();

          frontWallMaterial.color.lerp(targetFrontWallColor, 0.045);
          leftWallMaterial.color.lerp(targetLeftWallColor, 0.045);
          rightWallMaterial.color.lerp(targetRightWallColor, 0.045);
          ceilingMaterial.color.lerp(targetCeilingColor, 0.045);
          floorMaterial.color.lerp(targetFloorColor, 0.045);
          backRoomMaterial.color.lerp(targetWallColor, 0.045);
          backWallMaterial.color.lerp(targetWallColor, 0.045);
          frameMaterial.color.lerp(targetFrameColor, 0.045);
          frontWallMaterial.roughness = THREE.MathUtils.lerp(
            frontWallMaterial.roughness,
            frontStyle?.roughness ?? theme.wallRoughness,
            0.045
          );
          leftWallMaterial.roughness = THREE.MathUtils.lerp(
            leftWallMaterial.roughness,
            leftStyle?.roughness ?? theme.wallRoughness,
            0.045
          );
          rightWallMaterial.roughness = THREE.MathUtils.lerp(
            rightWallMaterial.roughness,
            rightStyle?.roughness ?? theme.wallRoughness,
            0.045
          );
          backRoomMaterial.roughness = THREE.MathUtils.lerp(
            backRoomMaterial.roughness,
            theme.wallRoughness,
            0.045
          );
          ceilingMaterial.roughness = THREE.MathUtils.lerp(
            ceilingMaterial.roughness,
            theme.wallRoughness,
            0.045
          );
          floorMaterial.roughness = THREE.MathUtils.lerp(
            floorMaterial.roughness,
            floorStyle?.roughness ?? theme.floorRoughness,
            0.045
          );
          floorMaterial.metalness = THREE.MathUtils.lerp(
            floorMaterial.metalness,
            floorStyle?.metalness ?? 0.015,
            0.045
          );
          backWallMaterial.roughness = THREE.MathUtils.lerp(
            backWallMaterial.roughness,
            theme.wallRoughness,
            0.045
          );
          frameMaterial.roughness = THREE.MathUtils.lerp(
            frameMaterial.roughness,
            frameStyle?.roughness ?? Math.max(0.34, theme.frameRoughness * 0.82),
            0.045
          );
          frameMaterial.metalness = THREE.MathUtils.lerp(
            frameMaterial.metalness,
            frameStyle?.metalness ?? 0.06,
            0.045
          );
          focusableArtworkItems.forEach((item) => {
            item.frameMaterial.color.lerp(targetFrameColor, 0.045);
            item.frameMaterial.roughness = THREE.MathUtils.lerp(
              item.frameMaterial.roughness,
              frameStyle?.roughness ?? theme.frameRoughness,
              0.045
            );
            item.frameMaterial.metalness = THREE.MathUtils.lerp(
              item.frameMaterial.metalness,
              frameStyle?.metalness ?? 0.06,
              0.045
            );
          });
          spotlightRigs.forEach((rig) => {
            rig.material.color.lerp(
              rig.role === "context"
                ? targetContextArtworkColor
                : targetArtworkColor,
              0.045
            );
          });
          ambientFillLight.intensity = THREE.MathUtils.lerp(
            ambientFillLight.intensity,
            Math.max(0.78, theme.ambientLightIntensity * 1.9),
            0.045
          );
        }

        function animate() {
          resizeRenderer();
          if (galleryOrchestrator.canInteract()) {
            controls.update();
          }
          galleryOrchestrator.update();
          updateThemeParameters();
          if (galleryOrchestrator.isInteractive()) {
            updateActiveArtworkLighting();
            updateArtworkFocusTransition();
          }
          if (galleryOrchestrator.isInteractive()) {
            keepCameraInsideRoom();
          }
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(animate);
        }

        function handleCanvasClick(event: MouseEvent) {
          if (!galleryOrchestrator.canInteract()) {
            return;
          }

          const rect = canvas.getBoundingClientRect();

          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);

          const [hit] = raycaster.intersectObjects(clickableArtworks, false);
          const galleryArtwork = hit?.object.userData.galleryArtwork as
            | GalleryArtwork
            | undefined;
          const artworkGroup = hit?.object.userData.artworkGroup;

          if (galleryArtwork) {
            focusedArtworkGroup = artworkGroup ?? null;
            focusedSceneArtworkId = galleryArtwork.id;
            sceneMode = "focus";
            selectDecoration(null);
            galleryOrchestrator.enterFocus();
            setMode("focus");
            setFocusedArtworkId(galleryArtwork.id);
            setSelectedArtwork(galleryArtwork);

            if (artworkGroup) {
              cameraController.focusArtwork(artworkGroup);
            }

            return;
          }

          const decorationHit =
            raycaster.intersectObjects(decorationClickables, false)[0] ?? null;
          const decorationId = decorationHit?.object.userData.decorationId as
            | string
            | undefined;

          if (decorationId) {
            selectDecoration(decorationId);
            return;
          }

          selectDecoration(null);

          if (sceneMode === "focus") {
            focusedArtworkGroup = null;
            focusedSceneArtworkId = null;
            sceneMode = "gallery";
            galleryOrchestrator.exitFocus();
            setMode("gallery");
            setFocusedArtworkId(null);
            cameraController.exitFocus();
            setIsFocusModeVisible(false);
            window.setTimeout(() => {
              setSelectedArtwork(null);
            }, 220);
          }
        }

        function handleCanvasPointerMove(event: PointerEvent) {
          if (!galleryOrchestrator.canInteract()) {
            return;
          }

          const rect = canvas.getBoundingClientRect();

          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);

          const [hit] = raycaster.intersectObjects(clickableArtworks, false);
          const galleryArtwork = hit?.object.userData.galleryArtwork as
            | GalleryArtwork
            | undefined;
          const decorationHit = galleryArtwork
            ? null
            : raycaster.intersectObjects(decorationClickables, false)[0] ?? null;
          const artworkGroup = hit?.object.userData.artworkGroup;
          const nextHoveredArtworkId = galleryArtwork?.id ?? null;

          if (hoveredSceneArtworkId !== nextHoveredArtworkId) {
            hoveredSceneArtworkId = nextHoveredArtworkId;
            setHoveredArtworkId(nextHoveredArtworkId);
            cameraController.setHoverTarget(artworkGroup ?? null);
          }

          canvas.style.cursor =
            nextHoveredArtworkId || decorationHit ? "pointer" : "grab";
        }

        function handleCanvasPointerLeave() {
          if (!galleryOrchestrator.canInteract()) {
            return;
          }

          if (hoveredSceneArtworkId !== null) {
            hoveredSceneArtworkId = null;
            setHoveredArtworkId(null);
          }

          cameraController.setHoverTarget(null);
          canvas.style.cursor = "grab";
        }

        function clearFocusedArtwork() {
          if (!galleryOrchestrator.canInteract()) {
            return;
          }

          focusedArtworkGroup = null;
          focusedSceneArtworkId = null;
          hoveredSceneArtworkId = null;
          sceneMode = "gallery";
          galleryOrchestrator.exitFocus();
          setMode("gallery");
          setFocusedArtworkId(null);
          setHoveredArtworkId(null);
          cameraController.exitFocus();
        }

        canvas.addEventListener("click", handleCanvasClick);
        canvas.addEventListener("pointermove", handleCanvasPointerMove);
        canvas.addEventListener("pointerleave", handleCanvasPointerLeave);
        window.addEventListener("gallery:clear-focus", clearFocusedArtwork);
        cleanupTasks.push(() => {
          canvas.removeEventListener("click", handleCanvasClick);
          canvas.removeEventListener("pointermove", handleCanvasPointerMove);
          canvas.removeEventListener("pointerleave", handleCanvasPointerLeave);
          window.removeEventListener("gallery:clear-focus", clearFocusedArtwork);
        });

        animate();
        setSceneStatus("ready");
      } catch {
        if (!disposed) {
          setSceneStatus("error");
        }
      }
    }

    createGalleryRoom();

    return () => {
      disposed = true;
      cleanupTasks.forEach((cleanup) => cleanup());
    };
  }, [activeAllocation, artworks, canRenderGallery]);

  return (
    <main className="app-shell">
      <section className="gallery-toolbar" aria-label="Gallery controls">
        <div className="gallery-toolbar__left">
          <button
            type="button"
            className="button button--secondary gallery-toolbar__back"
            onClick={() => {
              window.history.pushState(null, "", "/");
              window.dispatchEvent(new Event("gallery:navigate"));
            }}
          >
            Back to Upload
          </button>
        </div>

        <div className="gallery-toolbar__center">
          <span className="gallery-toolbar__label">Gallery Theme</span>
          <div className="theme-segment" aria-label="Gallery theme selector">
            {(Object.keys(galleryThemes) as GalleryThemeKey[]).map((themeKey) => {
              const isActive = selectedThemeKey === themeKey;

              return (
                <button
                  key={themeKey}
                  type="button"
                  className={`theme-chip${isActive ? " theme-chip--active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => setSelectedThemeKey(themeKey)}
                >
                  {galleryThemes[themeKey].label}
                </button>
              );
            })}
          </div>
          <div className="music-player" aria-label="Wall surface style controls">
            <div className="music-player__header">
              <span className="gallery-toolbar__label">Wall Style</span>
              <span className="music-player__file">
                {activeWallStyleKey
                  ? WALL_STYLE_PRESETS[activeWallStyleKey].label
                  : "Theme default"}
              </span>
            </div>
            <div className="theme-segment" aria-label="Wall style target">
              {(
                [
                  ["all", "All Walls"],
                  ["front", "Front Wall"],
                  ["left", "Left Wall"],
                  ["right", "Right Wall"]
                ] as Array<[WallStyleTarget, string]>
              ).map(([target, label]) => (
                <button
                  key={target}
                  type="button"
                  className={`theme-chip${
                    wallStyleTarget === target ? " theme-chip--active" : ""
                  }`}
                  aria-pressed={wallStyleTarget === target}
                  onClick={() => setWallStyleTarget(target)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="theme-segment" aria-label="Wall surface preset">
              {(Object.keys(WALL_STYLE_PRESETS) as WallStyleKey[]).map((styleKey) => {
                const isActive = activeWallStyleKey === styleKey;

                return (
                  <button
                    key={styleKey}
                    type="button"
                    className={`theme-chip${isActive ? " theme-chip--active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => applyWallStyle(styleKey)}
                  >
                    {WALL_STYLE_PRESETS[styleKey].label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="music-player" aria-label="Floor material controls">
            <div className="music-player__header">
              <span className="gallery-toolbar__label">Floor Material</span>
              <span className="music-player__file">
                {floorStyleKey
                  ? FLOOR_STYLE_PRESETS[floorStyleKey].label
                  : "Theme default"}
              </span>
            </div>
            <div className="theme-segment" aria-label="Floor material preset">
              {(Object.keys(FLOOR_STYLE_PRESETS) as FloorStyleKey[]).map((styleKey) => {
                const isActive = floorStyleKey === styleKey;

                return (
                  <button
                    key={styleKey}
                    type="button"
                    className={`theme-chip${isActive ? " theme-chip--active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => setFloorStyleKey(styleKey)}
                  >
                    {FLOOR_STYLE_PRESETS[styleKey].label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="music-player" aria-label="Artwork frame style controls">
            <div className="music-player__header">
              <span className="gallery-toolbar__label">Frame Style</span>
              <span className="music-player__file">
                {frameStyleKey
                  ? FRAME_STYLE_PRESETS[frameStyleKey].label
                  : "Theme default"}
              </span>
            </div>
            <div className="theme-segment" aria-label="Artwork frame preset">
              {(Object.keys(FRAME_STYLE_PRESETS) as FrameStyleKey[]).map((styleKey) => {
                const isActive = frameStyleKey === styleKey;

                return (
                  <button
                    key={styleKey}
                    type="button"
                    className={`theme-chip${isActive ? " theme-chip--active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => setFrameStyleKey(styleKey)}
                  >
                    {FRAME_STYLE_PRESETS[styleKey].label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="music-player" aria-label="Gallery configuration controls">
            <input
              ref={configImportInputRef}
              type="file"
              accept="application/json,.json"
              onChange={importGalleryConfig}
            />
            <div className="music-player__header">
              <span className="gallery-toolbar__label">Gallery Config</span>
              <span className="music-player__file" aria-live="polite">
                {configStatus || "Local settings"}
              </span>
            </div>
            <div className="music-player__controls">
              <button
                type="button"
                className="music-player__button music-player__button--primary"
                onClick={saveGalleryConfig}
              >
                Save
              </button>
              <button
                type="button"
                className="music-player__button"
                onClick={exportGalleryConfig}
              >
                Export JSON
              </button>
              <button
                type="button"
                className="music-player__button"
                onClick={() => configImportInputRef.current?.click()}
              >
                Import JSON
              </button>
              <button
                type="button"
                className="music-player__button"
                onClick={resetGalleryConfig}
              >
                Reset
              </button>
            </div>
          </div>
          <div className="music-player" aria-label="Gallery snapshot controls">
            <div className="music-player__header">
              <span className="gallery-toolbar__label">Snapshot</span>
              <span className="music-player__file" aria-live="polite">
                {snapshotStatus || "Current 3D view"}
              </span>
            </div>
            <div className="music-player__controls">
              <button
                type="button"
                className="music-player__button music-player__button--primary"
                onClick={exportGallerySnapshot}
              >
                Export Snapshot
              </button>
            </div>
          </div>
          <div className="music-player" aria-label="Background music controls">
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,.mp3,.wav,.ogg,.m4a"
              onChange={handleAudioUpload}
            />
            <audio
              ref={audioRef}
              src={audioUrl || undefined}
              onPause={() => setIsAudioPlaying(false)}
              onEnded={() => setIsAudioPlaying(false)}
              onPlay={() => setIsAudioPlaying(true)}
            />
            <div className="music-player__header">
              <span className="gallery-toolbar__label">Background Music</span>
              <span className="music-player__file">
                {audioUrl
                  ? audioFileName
                  : audioFileName
                    ? `Previous: ${audioFileName}`
                    : "No audio selected"}
              </span>
            </div>
            <div className="music-player__controls">
              <button
                type="button"
                className="music-player__button"
                onClick={() => audioInputRef.current?.click()}
              >
                Upload Audio
              </button>
              <button
                type="button"
                className="music-player__button music-player__button--primary"
                onClick={toggleAudioPlayback}
                disabled={!audioUrl}
              >
                {isAudioPlaying ? "Pause" : "Play"}
              </button>
              <label className="music-player__volume">
                <span>Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioVolume}
                  onChange={handleAudioVolumeChange}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="gallery-toolbar__right">
          <span className="gallery-toolbar__count">{images.length} artworks</span>
          <span className="gallery-toolbar__mode">Free Orbit Mode</span>
        </div>
      </section>

      <section className="preview-panel" aria-label="3D gallery room">
        {canRenderGallery ? (
          <div
            data-gallery-mode={mode}
            data-focused-artwork-id={focusedArtworkId ?? undefined}
            data-hovered-artwork-id={hoveredArtworkId ?? undefined}
            style={{
              position: "relative",
              minHeight: "640px",
              overflow: "hidden",
              borderRadius: "8px",
              background: "#eef1ec"
            }}
          >
            <canvas
              ref={canvasRef}
              aria-label="Three.js room with uploaded artwork on the walls"
              style={{
                display: "block",
                width: "100%",
                height: "640px",
                cursor: "grab"
              }}
            />
            {sceneStatus !== "ready" ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(30, 37, 32, 0.72)",
                  fontWeight: 760,
                  pointerEvents: "none"
                }}
              >
                {sceneStatus === "error" ? "Unable to load 3D gallery." : "Loading 3D gallery..."}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="empty-state">
            <h2>
              {imageAssetStatus === "checking"
                ? "Restoring gallery assets"
                : hasRestoredGalleryConfig
                  ? "Gallery settings restored"
                  : "No images to display"}
            </h2>
            <p>
              {imageAssetStatus === "checking"
                ? "Checking the uploaded artwork files before rebuilding the gallery."
                : hasRestoredGalleryConfig
                  ? "Please re-upload your images to rebuild the gallery. Matching filenames will restore saved descriptions and wall assignments."
                  : "Upload images to generate a 3D gallery, or keep this as an empty exhibition room."}
            </p>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                window.history.pushState(null, "", "/");
                window.dispatchEvent(new Event("gallery:navigate"));
              }}
            >
              {hasRestoredGalleryConfig ? "Re-upload Images" : "Upload Images"}
            </button>
          </div>
        )}
      </section>

      {selectedArtwork ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${selectedArtwork.title}`}
          onClick={closeArtworkPreview}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "grid",
            placeItems: "center",
            padding: "32px",
            background: isFocusModeVisible
              ? "rgba(6, 7, 7, 0.82)"
              : "rgba(0, 0, 0, 0)",
            opacity: isFocusModeVisible ? 1 : 0,
            backdropFilter: isFocusModeVisible ? "blur(8px)" : "blur(0px)",
            transition:
              "opacity 280ms ease, background 280ms ease, backdrop-filter 320ms ease"
          }}
        >
          <button
            type="button"
            className="artwork-modal__close"
            aria-label="Close preview"
            onClick={(event) => {
              event.stopPropagation();
              closeArtworkPreview();
            }}
            style={{
              position: "absolute",
              top: "22px",
              right: "22px",
              width: "38px",
              height: "38px",
              borderRadius: "999px",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              background: "rgba(255, 255, 255, 0.12)",
              color: "rgba(255, 255, 255, 0.92)",
              cursor: "pointer",
              fontSize: "22px",
              fontWeight: 500,
              lineHeight: 1,
              opacity: isFocusModeVisible ? 1 : 0,
              transform: isFocusModeVisible ? "scale(1)" : "scale(0.92)",
              transition:
                "opacity 220ms ease, transform 260ms ease, background 180ms ease"
            }}
          >
            ×
          </button>
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "26px",
              width: "min(1240px, 94vw)",
              maxHeight: "88vh",
              opacity: isFocusModeVisible ? 1 : 0,
              transform: isFocusModeVisible
                ? "translateY(0) scale(1)"
                : "translateY(12px) scale(0.985)",
              transition:
                "opacity 300ms ease, transform 340ms cubic-bezier(0.2, 0.8, 0.2, 1)"
            }}
          >
            <img
              src={selectedArtwork.src}
              alt={selectedArtwork.title}
              style={{
                flex: "1 1 520px",
                minWidth: 0,
                maxWidth: "min(820px, 94vw)",
                maxHeight: "80vh",
                borderRadius: "8px",
                objectFit: "contain",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: isFocusModeVisible
                  ? "0 30px 90px rgba(0, 0, 0, 0.42)"
                  : "0 12px 42px rgba(0, 0, 0, 0.22)",
                transform: isFocusModeVisible ? "scale(1)" : "scale(0.965)",
                transition:
                  "transform 340ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 340ms ease"
              }}
            />
            <aside
              style={{
                flex: "0 1 370px",
                width: "min(370px, 94vw)",
                padding: "26px",
                border: `1px solid ${modalTheme.borderColor}`,
                borderRadius: "8px",
                background: modalTheme.panelBackground,
                color: modalTheme.textColor,
                backdropFilter: "blur(18px)",
                boxShadow: "0 24px 72px rgba(0, 0, 0, 0.34)",
                opacity: isFocusModeVisible ? 1 : 0,
                transform: isFocusModeVisible
                  ? "translateX(0) scale(1)"
                  : "translateX(18px) scale(0.975)",
                transition:
                  "opacity 320ms ease 40ms, transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1) 40ms"
              }}
            >
              <p
                style={{
                  margin: "0 0 12px",
                  color: modalTheme.mutedTextColor,
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase"
                }}
              >
                Artwork Info
              </p>
              <h2
                style={{
                  margin: "0 0 22px",
                  color: modalTheme.textColor,
                  fontSize: "clamp(26px, 4vw, 34px)",
                  fontWeight: 850,
                  lineHeight: 1.08,
                  letterSpacing: 0
                }}
              >
                {selectedArtwork.title}
              </h2>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "7px",
                  marginBottom: "26px"
                }}
              >
                {[
                  selectedArtwork.artist,
                  selectedArtwork.type,
                  selectedArtwork.mood
                ].map((badge) => (
                  <span
                    key={badge}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: "28px",
                      padding: "0 10px",
                      border: `1px solid ${modalTheme.badgeBorder}`,
                      borderRadius: "999px",
                      background: modalTheme.badgeBackground,
                      color: modalTheme.badgeText,
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "capitalize"
                    }}
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <dl
                style={{
                  display: "grid",
                  gap: "18px",
                  margin: 0
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      marginBottom: "8px"
                    }}
                  >
                    <dt
                      style={{
                        color: modalTheme.mutedTextColor,
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase"
                      }}
                    >
                      Curator Note
                    </dt>
                    {!isEditingDescription ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDraftDescription(selectedArtworkDescription);
                          setIsEditingDescription(true);
                        }}
                        style={{
                          minHeight: "28px",
                          padding: "0 11px",
                          border: `1px solid ${modalTheme.badgeBorder}`,
                          borderRadius: "999px",
                          background: modalTheme.badgeBackground,
                          color: modalTheme.badgeText,
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: 800
                        }}
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>
                  <dd
                    style={{
                      margin: 0,
                      padding: "14px",
                      border: `1px solid ${modalTheme.badgeBorder}`,
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.055)"
                    }}
                  >
                    {isEditingDescription ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        <textarea
                          value={draftDescription}
                          onChange={(event) =>
                            setDraftDescription(event.target.value)
                          }
                          rows={5}
                          style={{
                            width: "100%",
                            resize: "vertical",
                            border: `1px solid ${modalTheme.borderColor}`,
                            borderRadius: "8px",
                            background: "rgba(0, 0, 0, 0.18)",
                            color: modalTheme.textColor,
                            outline: "none",
                            padding: "12px",
                            fontSize: "15px",
                            lineHeight: 1.6
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "8px"
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setDraftDescription(selectedArtworkDescription);
                              setIsEditingDescription(false);
                            }}
                            style={{
                              minHeight: "32px",
                              padding: "0 12px",
                              border: `1px solid ${modalTheme.badgeBorder}`,
                              borderRadius: "999px",
                              background: "rgba(255, 255, 255, 0.04)",
                              color: modalTheme.mutedTextColor,
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 800
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextDescription =
                                draftDescription.trim() || DEFAULT_DESCRIPTION;

                              setDescriptionOverrides((current) => ({
                                ...current,
                                [selectedArtwork.id]: nextDescription
                              }));
                              setSelectedArtwork({
                                ...selectedArtwork,
                                description: nextDescription
                              });
                              setIsEditingDescription(false);

                              try {
                                window.localStorage.setItem(
                                  getDescriptionStorageKey(selectedArtwork.id),
                                  nextDescription
                                );
                              } catch {
                                // Local storage is optional; React state still keeps the edit.
                              }
                            }}
                            style={{
                              minHeight: "32px",
                              padding: "0 14px",
                              border: `1px solid ${modalTheme.badgeBorder}`,
                              borderRadius: "999px",
                              background: modalTheme.badgeBackground,
                              color: modalTheme.badgeText,
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 900
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        style={{
                          margin: 0,
                          color: modalTheme.textColor,
                          fontSize: "15px",
                          lineHeight: 1.72
                        }}
                      >
                        {selectedArtworkDescription}
                      </p>
                    )}
                  </dd>
                </div>
                <div>
                  <dt
                    style={{
                      marginBottom: "8px",
                      color: modalTheme.mutedTextColor,
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase"
                    }}
                  >
                    Index
                  </dt>
                  <dd
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "7px",
                      margin: 0,
                      color: modalTheme.textColor,
                      opacity: 0.82
                    }}
                  >
                    <span style={{ color: modalTheme.mutedTextColor, fontSize: "13px" }}>
                      Artwork
                    </span>
                    <strong
                      style={{
                        color: modalTheme.accentColor,
                        fontSize: "24px",
                        lineHeight: 1,
                        fontWeight: 900
                      }}
                    >
                      {String(selectedArtworkIndex + 1).padStart(2, "0")}
                    </strong>
                    <span style={{ color: modalTheme.mutedTextColor, fontSize: "13px" }}>
                      /
                    </span>
                    <strong
                      style={{
                        color: modalTheme.textColor,
                        fontSize: "17px",
                        lineHeight: 1,
                        fontWeight: 850
                      }}
                    >
                      {String(artworks.length).padStart(2, "0")}
                    </strong>
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      ) : null}
    </main>
  );
}
