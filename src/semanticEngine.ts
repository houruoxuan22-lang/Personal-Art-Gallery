export type SemanticArtworkInput = {
  id: string;
  src: string;
  title: string;
  description: string;
  importance: number;
  visualWeight: number;
  curatorRole: "hero" | "support" | "context";
};

export type SemanticProfile = {
  semanticTags: string[];
  semanticVector: number[];
  attentionScore: number;
};

const VECTOR_DIMENSIONS = 12;
const TOKEN_LIMIT = 8;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashText(text: string) {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function getSemanticTokens(artwork: SemanticArtworkInput, index: number) {
  const tokens = [
    ...tokenize(artwork.title),
    ...tokenize(artwork.description)
  ];
  const uniqueTokens = [...new Set(tokens)];

  if (uniqueTokens.length > 0) {
    return uniqueTokens.slice(0, TOKEN_LIMIT);
  }

  return [`artwork-${index + 1}`, artwork.id.slice(0, 12)];
}

function normalizeVector(vector: number[]) {
  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0)
  );

  if (magnitude <= 0.0001) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

function buildSemanticVector(tokens: string[], artwork: SemanticArtworkInput) {
  const vector = Array.from({ length: VECTOR_DIMENSIONS }, () => 0);

  tokens.forEach((token, tokenIndex) => {
    const hash = hashText(token);
    const dimension = hash % VECTOR_DIMENSIONS;
    const secondaryDimension = (hash >>> 5) % VECTOR_DIMENSIONS;
    const sign = hash % 2 === 0 ? 1 : -1;
    const weight = 1 + Math.min(token.length, 12) / 18 + tokenIndex * 0.015;

    vector[dimension] += sign * weight;
    vector[secondaryDimension] += sign * 0.38;
  });

  const identityHash = hashText(`${artwork.id}|${artwork.src}|${artwork.title}`);
  vector[identityHash % VECTOR_DIMENSIONS] += 0.16;
  vector[(identityHash >>> 7) % VECTOR_DIMENSIONS] += 0.1;

  return normalizeVector(vector);
}

export function generateSemanticProfile(
  artwork: SemanticArtworkInput,
  index: number
): SemanticProfile {
  const semanticTags = getSemanticTokens(artwork, index);
  const semanticVector = buildSemanticVector(semanticTags, artwork);
  const roleWeight = {
    hero: 0.94,
    support: 0.62,
    context: 0.3
  }[artwork.curatorRole];
  const titleEnergy = clamp(semanticTags.length / TOKEN_LIMIT, 0, 1);
  const orderSignal = 1 / (index + 2);
  const attentionScore = clamp(
    artwork.importance * 0.42 +
      artwork.visualWeight * 0.34 +
      roleWeight * 0.16 +
      titleEnergy * 0.05 +
      orderSignal * 0.03,
    0,
    1
  );

  return {
    semanticTags,
    semanticVector,
    attentionScore
  };
}
