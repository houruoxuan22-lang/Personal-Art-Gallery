export type NarrativeRole =
  | "opening"
  | "hero"
  | "supporting"
  | "context"
  | "closing";

export type NarrativeZone = "entry" | "left_wall" | "center_wall" | "right_wall";

export type CuratableArtwork = {
  id: string;
  importance: number;
  visualWeight: number;
};

export type ExhibitionPlanItem = {
  artworkId: string;
  narrativeRole: NarrativeRole;
  zone: NarrativeZone;
  zoneIndex: number;
  zoneCount: number;
};

export type ExhibitionPlan = {
  items: ExhibitionPlanItem[];
};

const zoneOrder: NarrativeZone[] = [
  "entry",
  "left_wall",
  "center_wall",
  "right_wall"
];

function getSortedArtworks(artworks: CuratableArtwork[]) {
  return artworks
    .map((artwork, index) => ({
      artwork,
      index,
      score: artwork.importance * 0.72 + artwork.visualWeight * 0.28
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.index - b.index ||
        a.artwork.id.localeCompare(b.artwork.id)
    );
}

function assignNarrativeRoles(artworks: CuratableArtwork[]) {
  const sorted = getSortedArtworks(artworks);
  const roles = new Map<string, NarrativeRole>();
  const heroCount = artworks.length >= 7 ? 2 : 1;

  sorted.slice(0, heroCount).forEach(({ artwork }) => {
    roles.set(artwork.id, "hero");
  });

  const originalOrder = artworks.filter((artwork) => !roles.has(artwork.id));

  if (originalOrder[0]) {
    roles.set(originalOrder[0].id, "opening");
  }

  if (originalOrder.length > 1) {
    roles.set(originalOrder[originalOrder.length - 1].id, "closing");
  }

  artworks.forEach((artwork) => {
    if (roles.has(artwork.id)) {
      return;
    }

    roles.set(artwork.id, artwork.importance < 0.4 ? "context" : "supporting");
  });

  return roles;
}

function getZoneForRole(role: NarrativeRole, supportingIndex: number) {
  if (role === "opening") {
    return "entry";
  }

  if (role === "hero") {
    return "center_wall";
  }

  if (role === "closing") {
    return "right_wall";
  }

  if (role === "supporting") {
    return supportingIndex % 2 === 0 ? "left_wall" : "right_wall";
  }

  return supportingIndex % 2 === 0 ? "entry" : "right_wall";
}

export function generateExhibitionPlan(
  artworks: CuratableArtwork[]
): ExhibitionPlan {
  const roles = assignNarrativeRoles(artworks);
  const zoneBuckets: Record<NarrativeZone, ExhibitionPlanItem[]> = {
    entry: [],
    left_wall: [],
    center_wall: [],
    right_wall: []
  };
  let supportingIndex = 0;

  artworks.forEach((artwork) => {
    const narrativeRole = roles.get(artwork.id) ?? "context";
    const zone = getZoneForRole(narrativeRole, supportingIndex);

    if (narrativeRole === "supporting" || narrativeRole === "context") {
      supportingIndex += 1;
    }

    zoneBuckets[zone].push({
      artworkId: artwork.id,
      narrativeRole,
      zone,
      zoneIndex: 0,
      zoneCount: 0
    });
  });

  const items = zoneOrder.flatMap((zone) => {
    return zoneBuckets[zone].map((item, zoneIndex) => ({
      ...item,
      zoneIndex,
      zoneCount: zoneBuckets[zone].length
    }));
  });

  return {
    items
  };
}
