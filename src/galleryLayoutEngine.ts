import type { NarrativeRole } from "./curationEngine";

export type { NarrativeRole } from "./curationEngine";

export const ROOM_WIDTH = 10;
export const ROOM_DEPTH = 8;
export const ROOM_HEIGHT = 4;

const ARTWORK_MARGIN = 0.34;
const FACE_HORIZONTAL_PADDING = 0.72;
const FACE_BOTTOM_PADDING = 0.72;
const FACE_TOP_PADDING = 0.78;
const SEMANTIC_EDGE_THRESHOLD = 0.32;

export type LayoutArtworkRole = "hero" | "support" | "context";
export type SpatialIntent = "center" | "edge" | "cluster" | "isolate";
export type LayoutMood = "calm" | "dynamic";
export type GalleryFace = "front" | "left" | "right";
export type GalleryWall = GalleryFace;

export type UserFaceAllocation = Record<GalleryFace, string[]>;
export type UserWallAllocation = UserFaceAllocation;
export type SemanticNarrativeRole = "main_path" | "side_path" | "transition";

export type ArtworkBoundingBox = {
  width: number;
  height: number;
  margin: number;
};

export type LayoutArtwork = {
  id: string;
  importance: number;
  visualWeight: number;
  role: LayoutArtworkRole;
  narrativeRole: NarrativeRole;
  mood: LayoutMood;
  spatialIntent: SpatialIntent;
  semanticTags: string[];
  semanticVector: number[];
  semanticClusterId: string;
  curatorRole: LayoutArtworkRole;
  attentionScore: number;
};

export type ArtworkLayout = {
  face: GalleryFace;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  boundingBox: ArtworkBoundingBox;
  role: LayoutArtworkRole;
  narrativeRole: NarrativeRole;
  semanticNarrativeRole: SemanticNarrativeRole;
  semanticEmphasis: number;
};

export type PositionedArtwork = {
  artworkId: string;
  semanticClusterId: string;
  curatorRole: LayoutArtworkRole;
  semanticNarrativeRole: SemanticNarrativeRole;
  semanticEmphasis: number;
  attentionOrderIndex: number;
  layout: ArtworkLayout;
};

export type SemanticGraphNode = {
  artworkId: string;
  semanticTags: string[];
  visualWeight: number;
};

export type SemanticGraphEdge = {
  source: string;
  target: string;
  weight: number;
  sharedTags: string[];
};

export type SemanticGraph = {
  nodes: SemanticGraphNode[];
  edges: SemanticGraphEdge[];
};

export type SemanticCluster = {
  id: string;
  type: "face" | "main_path" | "emotion" | "color" | "side_path" | "transition";
  artworkIds: string[];
  semanticTags: string[];
  zone: GalleryFace;
  averageAttentionScore: number;
  relatedArtworkIds: string[];
  averageSimilarity: number;
};

export type ClusterMap = Record<string, SemanticCluster>;

export type UserDrivenLayoutPlan = {
  positionedArtworks: PositionedArtwork[];
  clusters: SemanticCluster[];
  heroArtworkId: string | null;
  semanticGraph: SemanticGraph;
  clusterMap: ClusterMap;
};

type CuratedArtwork = LayoutArtwork & {
  inputIndex: number;
};

type CurationSignal = {
  semanticNarrativeRole: SemanticNarrativeRole;
  semanticEmphasis: number;
  semanticClusterId: string;
  attentionOrderIndex: number;
  suggestedZone: GalleryFace | "corner";
};

export type SemanticCurationLayer = {
  semanticGraph: SemanticGraph;
  attentionOrder: string[];
  clusterMap: ClusterMap;
  signals: Map<string, CurationSignal>;
};

const FACE_ORDER: GalleryFace[] = ["front", "left", "right"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getRoleWeight(role: LayoutArtworkRole) {
  return {
    hero: 0.94,
    support: 0.62,
    context: 0.28
  }[role];
}

function normalizeArtworks(artworks: LayoutArtwork[]): CuratedArtwork[] {
  return artworks.map((artwork, inputIndex) => ({
    ...artwork,
    semanticClusterId: artwork.semanticClusterId || "",
    attentionScore: clamp(
      Number.isFinite(artwork.attentionScore)
        ? artwork.attentionScore
        : artwork.importance * 0.42 +
            artwork.visualWeight * 0.34 +
            getRoleWeight(artwork.curatorRole) * 0.24,
      0,
      1
    ),
    inputIndex
  }));
}

function cosineSimilarity(firstVector: number[], secondVector: number[]) {
  const length = Math.min(firstVector.length, secondVector.length);

  if (length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let firstMagnitude = 0;
  let secondMagnitude = 0;

  for (let index = 0; index < length; index += 1) {
    const firstValue = firstVector[index] ?? 0;
    const secondValue = secondVector[index] ?? 0;

    dotProduct += firstValue * secondValue;
    firstMagnitude += firstValue * firstValue;
    secondMagnitude += secondValue * secondValue;
  }

  if (firstMagnitude <= 0.0001 || secondMagnitude <= 0.0001) {
    return 0;
  }

  return clamp(
    dotProduct / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude)),
    -1,
    1
  );
}

function getSharedTags(firstTags: string[], secondTags: string[]) {
  const secondTagSet = new Set(secondTags);

  return firstTags.filter((tag) => secondTagSet.has(tag));
}

function buildSemanticGraph(artworks: CuratedArtwork[]): SemanticGraph {
  const nodes = artworks.map((artwork) => ({
    artworkId: artwork.id,
    semanticTags: artwork.semanticTags,
    visualWeight: artwork.visualWeight
  }));
  const edges: SemanticGraphEdge[] = [];

  for (let firstIndex = 0; firstIndex < artworks.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < artworks.length;
      secondIndex += 1
    ) {
      const firstArtwork = artworks[firstIndex];
      const secondArtwork = artworks[secondIndex];
      const vectorSimilarity = cosineSimilarity(
        firstArtwork.semanticVector,
        secondArtwork.semanticVector
      );
      const sharedTags = getSharedTags(
        firstArtwork.semanticTags,
        secondArtwork.semanticTags
      );
      const tagSimilarity =
        sharedTags.length /
        Math.max(firstArtwork.semanticTags.length, secondArtwork.semanticTags.length, 1);
      const weight = clamp(vectorSimilarity * 0.82 + tagSimilarity * 0.18, 0, 1);

      if (weight >= SEMANTIC_EDGE_THRESHOLD) {
        edges.push({
          source: firstArtwork.id,
          target: secondArtwork.id,
          weight,
          sharedTags
        });
      }
    }
  }

  return {
    nodes,
    edges: edges.sort(
      (firstEdge, secondEdge) =>
        secondEdge.weight - firstEdge.weight ||
        firstEdge.source.localeCompare(secondEdge.source) ||
        firstEdge.target.localeCompare(secondEdge.target)
    )
  };
}

function getEdgesForArtwork(graph: SemanticGraph, artworkId: string) {
  return graph.edges
    .filter((edge) => edge.source === artworkId || edge.target === artworkId)
    .sort(
      (firstEdge, secondEdge) =>
        secondEdge.weight - firstEdge.weight ||
        firstEdge.source.localeCompare(secondEdge.source) ||
        firstEdge.target.localeCompare(secondEdge.target)
    );
}

function getConnectedArtworkId(edge: SemanticGraphEdge, artworkId: string) {
  return edge.source === artworkId ? edge.target : edge.source;
}

function generateAttentionOrder(
  artworks: CuratedArtwork[],
  semanticGraph: SemanticGraph
) {
  if (artworks.length === 0) {
    return [];
  }

  const sortedByWeight = [...artworks].sort(
    (firstArtwork, secondArtwork) =>
      secondArtwork.visualWeight - firstArtwork.visualWeight ||
      secondArtwork.attentionScore - firstArtwork.attentionScore ||
      firstArtwork.inputIndex - secondArtwork.inputIndex ||
      firstArtwork.id.localeCompare(secondArtwork.id)
  );
  const visitedArtworkIds = new Set<string>();
  const attentionOrder: string[] = [];
  let currentArtworkId = sortedByWeight[0].id;

  while (attentionOrder.length < artworks.length) {
    attentionOrder.push(currentArtworkId);
    visitedArtworkIds.add(currentArtworkId);

    const nextEdge = getEdgesForArtwork(semanticGraph, currentArtworkId).find(
      (edge) => !visitedArtworkIds.has(getConnectedArtworkId(edge, currentArtworkId))
    );

    if (nextEdge) {
      currentArtworkId = getConnectedArtworkId(nextEdge, currentArtworkId);
      continue;
    }

    const nextArtwork = sortedByWeight.find(
      (artwork) => !visitedArtworkIds.has(artwork.id)
    );

    if (!nextArtwork) {
      break;
    }

    currentArtworkId = nextArtwork.id;
  }

  return attentionOrder;
}

function getFaceWidth(face: GalleryFace) {
  return face === "front" ? ROOM_WIDTH : ROOM_DEPTH;
}

function getFaceLayoutBounds(face: GalleryFace) {
  const faceWidth = getFaceWidth(face);

  return {
    minX: -faceWidth / 2 + FACE_HORIZONTAL_PADDING,
    maxX: faceWidth / 2 - FACE_HORIZONTAL_PADDING,
    minY: FACE_BOTTOM_PADDING,
    maxY: ROOM_HEIGHT - FACE_TOP_PADDING
  };
}

function getArtworkScale(
  _artwork: CuratedArtwork,
  _role: LayoutArtworkRole,
  faceCount: number,
  _index: number
) {
  const densityScale = faceCount <= 1
    ? 1.18
    : faceCount <= 3
      ? 1
      : faceCount <= 6
        ? 0.86
        : 0.72;

  return clamp(densityScale, 0.66, 1.18);
}

function getDesiredBoundingBox(scale: number, _role: LayoutArtworkRole): ArtworkBoundingBox {
  const baseWidth = 1.42;
  const baseHeight = 1.02;

  return {
    width: clamp(baseWidth * scale, 0.72, 1.72),
    height: clamp(baseHeight * scale, 0.54, 1.24),
    margin: 0.34
  };
}

type PackedArtwork = {
  artwork: CuratedArtwork;
  role: LayoutArtworkRole;
  scale: number;
  boundingBox: ArtworkBoundingBox;
  semanticNarrativeRole: SemanticNarrativeRole;
  semanticEmphasis: number;
  semanticClusterId: string;
  attentionOrderIndex: number;
};

type PackedPosition = PackedArtwork & {
  x: number;
  y: number;
};

function hasCollision(
  newItem: Pick<PackedPosition, "x" | "y" | "boundingBox">,
  existingItems: Array<Pick<PackedPosition, "x" | "y" | "boundingBox">>
) {
  const newHalfWidth = newItem.boundingBox.width / 2 + newItem.boundingBox.margin / 2;
  const newHalfHeight = newItem.boundingBox.height / 2 + newItem.boundingBox.margin / 2;

  return existingItems.some((existingItem) => {
    const existingHalfWidth =
      existingItem.boundingBox.width / 2 + existingItem.boundingBox.margin / 2;
    const existingHalfHeight =
      existingItem.boundingBox.height / 2 + existingItem.boundingBox.margin / 2;

    return (
      Math.abs(newItem.x - existingItem.x) < newHalfWidth + existingHalfWidth &&
      Math.abs(newItem.y - existingItem.y) < newHalfHeight + existingHalfHeight
    );
  });
}

function isInsideFaceBounds(item: PackedPosition, face: GalleryFace) {
  const bounds = getFaceLayoutBounds(face);
  const halfWidth = item.boundingBox.width / 2;
  const halfHeight = item.boundingBox.height / 2;

  return (
    item.x - halfWidth >= bounds.minX &&
    item.x + halfWidth <= bounds.maxX &&
    item.y - halfHeight >= bounds.minY &&
    item.y + halfHeight <= bounds.maxY
  );
}

function scaleBoundingBoxToCell(
  boundingBox: ArtworkBoundingBox,
  cellWidth: number,
  cellHeight: number
): ArtworkBoundingBox {
  return {
    width: Math.max(0.02, Math.min(boundingBox.width, cellWidth - boundingBox.margin)),
    height: Math.max(0.02, Math.min(boundingBox.height, cellHeight - boundingBox.margin)),
    margin: boundingBox.margin
  };
}

function packRows(face: GalleryFace, items: PackedArtwork[]) {
  if (items.length === 0) {
    return [];
  }

  const bounds = getFaceLayoutBounds(face);
  const usableWidth = bounds.maxX - bounds.minX;
  const usableHeight = bounds.maxY - bounds.minY;
  const rows: PackedArtwork[][] = [];
  let currentRow: PackedArtwork[] = [];
  let currentRowWidth = 0;

  items.forEach((item) => {
    const itemWidth = item.boundingBox.width + item.boundingBox.margin;
    const nextWidth =
      currentRow.length === 0 ? itemWidth : currentRowWidth + itemWidth;

    if (currentRow.length > 0 && nextWidth > usableWidth) {
      rows.push(currentRow);
      currentRow = [item];
      currentRowWidth = itemWidth;
      return;
    }

    currentRow.push(item);
    currentRowWidth = nextWidth;
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  const rowHeights = rows.map((row) =>
    Math.max(...row.map((item) => item.boundingBox.height))
  );
  const totalHeight =
    rowHeights.reduce((sum, height) => sum + height, 0) +
    Math.max(0, rows.length - 1) * ARTWORK_MARGIN;

  if (totalHeight > usableHeight) {
    return null;
  }

  const packedItems: PackedPosition[] = [];
  let currentY = bounds.maxY - rowHeights[0] / 2;
  let hasInvalidPlacement = false;

  rows.forEach((row, rowIndex) => {
    const rowWidth =
      row.reduce((sum, item) => sum + item.boundingBox.width, 0) +
      Math.max(0, row.length - 1) * ARTWORK_MARGIN;
    let currentX = -rowWidth / 2;

    row.forEach((item) => {
      const positionedItem: PackedPosition = {
        ...item,
        x: currentX + item.boundingBox.width / 2,
        y: currentY
      };

      if (
        hasCollision(positionedItem, packedItems) ||
        !isInsideFaceBounds(positionedItem, face)
      ) {
        hasInvalidPlacement = true;
        return;
      }

      packedItems.push(positionedItem);
      currentX += item.boundingBox.width + ARTWORK_MARGIN;
    });

    const nextHeight = rowHeights[rowIndex + 1] ?? 0;
    currentY -= rowHeights[rowIndex] / 2 + ARTWORK_MARGIN + nextHeight / 2;
  });

  if (hasInvalidPlacement) {
    return null;
  }

  return packedItems.length === items.length ? packedItems : null;
}

function packGrid(face: GalleryFace, items: PackedArtwork[]) {
  if (items.length === 0) {
    return [];
  }

  const bounds = getFaceLayoutBounds(face);
  const usableWidth = bounds.maxX - bounds.minX;
  const usableHeight = bounds.maxY - bounds.minY;
  const faceAspect = usableWidth / usableHeight;
  const columnCount = Math.max(
    1,
    Math.ceil(Math.sqrt(items.length * faceAspect))
  );
  const rowCount = Math.ceil(items.length / columnCount);
  const cellWidth = usableWidth / columnCount;
  const cellHeight = usableHeight / rowCount;
  const packedItems: PackedPosition[] = [];

  items.forEach((item, index) => {
    const rowIndex = Math.floor(index / columnCount);
    const columnIndex = index % columnCount;
    const rowItemCount = Math.min(columnCount, items.length - rowIndex * columnCount);
    const rowWidth = rowItemCount * cellWidth;
    const x =
      -rowWidth / 2 + cellWidth / 2 + columnIndex * cellWidth;
    const y =
      bounds.maxY - cellHeight / 2 - rowIndex * cellHeight;
    const positionedItem: PackedPosition = {
      ...item,
      boundingBox: scaleBoundingBoxToCell(
        item.boundingBox,
        cellWidth,
        cellHeight
      ),
      x,
      y
    };

    packedItems.push(positionedItem);
  });

  return packedItems;
}

function packFaceArtworks(face: GalleryFace, items: PackedArtwork[]) {
  if (items.length === 0) {
    return [];
  }

  return packRows(face, items) ?? packGrid(face, items);
}

function createLayout(
  face: GalleryFace,
  item: PackedPosition
): ArtworkLayout {

  return {
    face,
    position: [item.x, item.y, 0],
    rotation: [0, 0, 0],
    scale: item.scale,
    boundingBox: item.boundingBox,
    role: item.role,
    narrativeRole:
      item.semanticNarrativeRole === "transition"
        ? "context"
        : item.role === "hero"
          ? "hero"
          : item.role === "support"
            ? "supporting"
            : "context",
    semanticNarrativeRole: item.semanticNarrativeRole,
    semanticEmphasis: item.semanticEmphasis
  };
}

function getArtworkById(artworks: CuratedArtwork[]) {
  return new Map(artworks.map((artwork) => [artwork.id, artwork]));
}

function getNormalizedAllocation(
  artworks: CuratedArtwork[],
  allocation?: Partial<UserWallAllocation>
): UserWallAllocation {
  if (!allocation) {
    return artworks.reduce<UserWallAllocation>(
      (nextAllocation, artwork, index) => {
        nextAllocation[FACE_ORDER[index % FACE_ORDER.length]].push(artwork.id);
        return nextAllocation;
      },
      {
        front: [],
        left: [],
        right: []
      }
    );
  }

  const artworkIds = new Set(artworks.map((artwork) => artwork.id));
  const usedIds = new Set<string>();
  const normalized: UserWallAllocation = {
    front: [],
    left: [],
    right: []
  };

  FACE_ORDER.forEach((face) => {
    (allocation?.[face] ?? []).forEach((artworkId) => {
      if (!artworkIds.has(artworkId) || usedIds.has(artworkId)) {
        return;
      }

      normalized[face].push(artworkId);
      usedIds.add(artworkId);
    });
  });

  artworks.forEach((artwork) => {
    if (!usedIds.has(artwork.id)) {
      normalized.front.push(artwork.id);
    }
  });

  return normalized;
}

function getFaceArtworks(
  artworksById: Map<string, CuratedArtwork>,
  allocation: UserWallAllocation,
  face: GalleryFace
) {
  return allocation[face]
    .map((artworkId) => artworksById.get(artworkId))
    .filter((artwork): artwork is CuratedArtwork => Boolean(artwork));
}

function getHeroArtwork(frontArtworks: CuratedArtwork[]) {
  return frontArtworks[0] ?? null;
}

function getClusterTags(artworks: CuratedArtwork[]) {
  const tagCounts = new Map<string, number>();

  artworks.forEach((artwork) => {
    artwork.semanticTags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    });
  });

  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([tag]) => tag);
}

function getAverageGraphSimilarity(graph: SemanticGraph, artworkIds: string[]) {
  if (artworkIds.length <= 1) {
    return 0;
  }

  const edgeWeights = graph.edges
    .filter(
      (edge) =>
        artworkIds.includes(edge.source) && artworkIds.includes(edge.target)
    )
    .map((edge) => edge.weight);

  if (edgeWeights.length === 0) {
    return 0;
  }

  return edgeWeights.reduce((sum, weight) => sum + weight, 0) / edgeWeights.length;
}

function getRelatedArtworkIds(graph: SemanticGraph, artworkIds: string[]) {
  const artworkIdSet = new Set(artworkIds);
  const relatedIds = new Set<string>();

  graph.edges.forEach((edge) => {
    if (artworkIdSet.has(edge.source) && !artworkIdSet.has(edge.target)) {
      relatedIds.add(edge.target);
    }

    if (artworkIdSet.has(edge.target) && !artworkIdSet.has(edge.source)) {
      relatedIds.add(edge.source);
    }
  });

  return [...relatedIds].sort();
}

function buildCluster(
  id: string,
  type: SemanticCluster["type"],
  zone: SemanticCluster["zone"],
  artworks: CuratedArtwork[],
  graph: SemanticGraph
): SemanticCluster {
  const artworkIds = artworks.map((artwork) => artwork.id);

  return {
    id,
    type,
    artworkIds,
    semanticTags: getClusterTags(artworks),
    zone,
    averageAttentionScore:
      artworks.length > 0
        ? artworks.reduce((sum, artwork) => sum + artwork.attentionScore, 0) /
          artworks.length
        : 0,
    relatedArtworkIds: getRelatedArtworkIds(graph, artworkIds),
    averageSimilarity: getAverageGraphSimilarity(graph, artworkIds)
  };
}

function buildFaceCluster(
  face: GalleryFace,
  artworks: CuratedArtwork[],
  graph: SemanticGraph
): SemanticCluster {
  return buildCluster(`${face}-face`, "face", face, artworks, graph);
}

function getColorTag(artwork: CuratedArtwork) {
  const colorTags = new Set([
    "black",
    "white",
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "pink",
    "gray",
    "grey",
    "warm",
    "cool",
    "dark",
    "light"
  ]);

  return artwork.semanticTags.find((tag) => colorTags.has(tag.toLowerCase()));
}

function getWeakConnectionIds(
  artworks: CuratedArtwork[],
  graph: SemanticGraph,
  mainPathIds: Set<string>
) {
  return artworks
    .filter((artwork) => {
      const degree = getEdgesForArtwork(graph, artwork.id).length;

      return degree <= 1 && !mainPathIds.has(artwork.id);
    })
    .map((artwork) => artwork.id);
}

function buildSemanticCurationLayer(
  artworks: CuratedArtwork[],
  faceArtworks: Record<GalleryFace, CuratedArtwork[]>
): SemanticCurationLayer {
  const semanticGraph = buildSemanticGraph(artworks);
  const attentionOrder = generateAttentionOrder(artworks, semanticGraph);
  const mainPathCount = Math.min(
    artworks.length,
    Math.max(1, Math.ceil(artworks.length * 0.45))
  );
  const mainPathIds = new Set(attentionOrder.slice(0, mainPathCount));
  const weakConnectionIds = new Set(
    getWeakConnectionIds(artworks, semanticGraph, mainPathIds)
  );
  const artworkById = new Map(artworks.map((artwork) => [artwork.id, artwork]));
  const clusterMap: ClusterMap = {};

  clusterMap.main_path = buildCluster(
    "main_path",
    "main_path",
    "front",
    attentionOrder
      .slice(0, mainPathCount)
      .map((artworkId) => artworkById.get(artworkId))
      .filter((artwork): artwork is CuratedArtwork => Boolean(artwork)),
    semanticGraph
  );

  (["calm", "dynamic"] as LayoutMood[]).forEach((mood, moodIndex) => {
    const moodArtworks = artworks.filter((artwork) => artwork.mood === mood);

    if (moodArtworks.length > 0) {
      clusterMap[`emotion:${mood}`] = buildCluster(
        `emotion:${mood}`,
        "emotion",
        moodIndex % 2 === 0 ? "left" : "right",
        moodArtworks,
        semanticGraph
      );
    }
  });

  const colorGroups = new Map<string, CuratedArtwork[]>();

  artworks.forEach((artwork) => {
    const colorTag = getColorTag(artwork);

    if (!colorTag) {
      return;
    }

    colorGroups.set(colorTag, [...(colorGroups.get(colorTag) ?? []), artwork]);
  });

  [...colorGroups.entries()]
    .sort((firstEntry, secondEntry) => secondEntry[1].length - firstEntry[1].length)
    .slice(0, 4)
    .forEach(([colorTag, colorArtworks], colorIndex) => {
      clusterMap[`color:${colorTag}`] = buildCluster(
        `color:${colorTag}`,
        "color",
        colorIndex % 2 === 0 ? "left" : "right",
        colorArtworks,
        semanticGraph
      );
    });

  const transitionArtworks = [...weakConnectionIds]
    .map((artworkId) => artworkById.get(artworkId))
    .filter((artwork): artwork is CuratedArtwork => Boolean(artwork));

  if (transitionArtworks.length > 0) {
    clusterMap.transition = buildCluster(
      "transition",
      "transition",
      "right",
      transitionArtworks,
      semanticGraph
    );
  }

  const sidePathArtworks = artworks.filter(
    (artwork) => !mainPathIds.has(artwork.id) && !weakConnectionIds.has(artwork.id)
  );

  if (sidePathArtworks.length > 0) {
    clusterMap.side_path = buildCluster(
      "side_path",
      "side_path",
      "left",
      sidePathArtworks,
      semanticGraph
    );
  }

  FACE_ORDER.forEach((face) => {
    clusterMap[`${face}-face`] = buildFaceCluster(
      face,
      faceArtworks[face],
      semanticGraph
    );
  });

  const signals = new Map<string, CurationSignal>();

  artworks.forEach((artwork) => {
    const attentionOrderIndex = attentionOrder.indexOf(artwork.id);
    const isMainPath = mainPathIds.has(artwork.id);
    const isTransition = weakConnectionIds.has(artwork.id);
    const semanticNarrativeRole: SemanticNarrativeRole = isMainPath
      ? "main_path"
      : isTransition
        ? "transition"
        : "side_path";
    const semanticEmphasis = 1;
    const semanticClusterId = semanticNarrativeRole === "main_path"
      ? "main_path"
      : semanticNarrativeRole === "transition"
        ? "transition"
        : artwork.mood === "calm"
          ? "emotion:calm"
          : "emotion:dynamic";

    signals.set(artwork.id, {
      semanticNarrativeRole,
      semanticEmphasis,
      semanticClusterId,
      attentionOrderIndex,
      suggestedZone: semanticNarrativeRole === "main_path"
        ? "front"
        : semanticNarrativeRole === "transition"
          ? "corner"
          : artwork.mood === "calm"
            ? "left"
            : "right"
    });
  });

  return {
    semanticGraph,
    attentionOrder,
    clusterMap,
    signals
  };
}

function generateFacePositionedArtworks(
  face: GalleryFace,
  artworks: CuratedArtwork[],
  heroArtworkId: string | null,
  curationLayer: SemanticCurationLayer
) {
  const packedArtworks = artworks.map((artwork, index) => {
    const signal = curationLayer.signals.get(artwork.id) ?? {
      semanticNarrativeRole: "side_path" as SemanticNarrativeRole,
      semanticEmphasis: 1,
      semanticClusterId: `${face}-face`,
      attentionOrderIndex: index,
      suggestedZone: face
    };
    const role: LayoutArtworkRole =
      heroArtworkId === artwork.id
        ? "hero"
        : signal.semanticNarrativeRole === "transition"
          ? "context"
          : "support";
    const scale = getArtworkScale(artwork, role, artworks.length, index);

    return {
      artwork,
      role,
      scale,
      boundingBox: getDesiredBoundingBox(scale, role),
      semanticNarrativeRole: signal.semanticNarrativeRole,
      semanticEmphasis: signal.semanticEmphasis,
      semanticClusterId: signal.semanticClusterId,
      attentionOrderIndex: signal.attentionOrderIndex
    };
  });

  return packFaceArtworks(face, packedArtworks).map((item) => ({
    artworkId: item.artwork.id,
    semanticClusterId: item.semanticClusterId,
    curatorRole: item.role,
    semanticNarrativeRole: item.semanticNarrativeRole,
    semanticEmphasis: item.semanticEmphasis,
    attentionOrderIndex: item.attentionOrderIndex,
    layout: createLayout(face, item)
  }));
}

export function generateLayout(
  face: GalleryFace,
  artworks: LayoutArtwork[],
  curationLayer?: SemanticCurationLayer
) {
  const faceArtworks = normalizeArtworks(artworks);
  const heroArtwork = face === "front" ? getHeroArtwork(faceArtworks) : null;
  const layer =
    curationLayer ??
    buildSemanticCurationLayer(faceArtworks, {
      front: face === "front" ? faceArtworks : [],
      left: face === "left" ? faceArtworks : [],
      right: face === "right" ? faceArtworks : []
    });

  return generateFacePositionedArtworks(
    face,
    faceArtworks,
    heroArtwork?.id ?? null,
    layer
  );
}

export function generateUserDrivenLayout(
  artworks: LayoutArtwork[],
  allocation?: Partial<UserWallAllocation>
): UserDrivenLayoutPlan {
  const curatedArtworks = normalizeArtworks(artworks);

  if (curatedArtworks.length === 0) {
    const emptySemanticGraph: SemanticGraph = {
      nodes: [],
      edges: []
    };

    return {
      positionedArtworks: [],
      clusters: [],
      heroArtworkId: null,
      semanticGraph: emptySemanticGraph,
      clusterMap: {}
    };
  }

  const normalizedAllocation = getNormalizedAllocation(curatedArtworks, allocation);
  const artworksById = getArtworkById(curatedArtworks);
  const faceArtworks = {
    front: getFaceArtworks(artworksById, normalizedAllocation, "front"),
    left: getFaceArtworks(artworksById, normalizedAllocation, "left"),
    right: getFaceArtworks(artworksById, normalizedAllocation, "right")
  };
  const curationLayer = buildSemanticCurationLayer(curatedArtworks, faceArtworks);
  const heroArtworkId =
    curationLayer.attentionOrder[0] ?? getHeroArtwork(faceArtworks.front)?.id ?? null;
  const positionedArtworks = FACE_ORDER.flatMap((face) =>
    generateLayout(face, faceArtworks[face], curationLayer)
  );

  return {
    positionedArtworks: curatedArtworks
      .map((artwork) =>
        positionedArtworks.find((positioned) => positioned.artworkId === artwork.id)
      )
      .filter((item): item is PositionedArtwork => Boolean(item)),
    clusters: Object.values(curationLayer.clusterMap),
    heroArtworkId,
    semanticGraph: curationLayer.semanticGraph,
    clusterMap: curationLayer.clusterMap
  };
}

export function buildArtworkLayouts(
  artworks: LayoutArtwork[],
  allocation?: Partial<UserWallAllocation>
) {
  return generateUserDrivenLayout(artworks, allocation).positionedArtworks.map(
    (positionedArtwork) => positionedArtwork.layout
  );
}
