// @forge/dom-engine
// Gutenberg block fingerprint: stable addressing across saves.

export interface BlockFingerprint {
  readonly hash: string;
  readonly blockName: string;
  readonly stableAttrs: Record<string, unknown>;
  readonly siblingIndex: number;
}

/**
 * Compute a fingerprint for a Gutenberg block.
 * Stable attrs exclude content that Forge itself might change.
 */
export function computeBlockFingerprint(
  blockName: string,
  attrs: Record<string, unknown>,
  siblingIndex: number,
  stableAttrKeys: string[] = ["anchor", "className", "id", "align"],
): BlockFingerprint {
  const stableAttrs: Record<string, unknown> = {};
  for (const key of stableAttrKeys) {
    if (key in attrs) {
      stableAttrs[key] = attrs[key];
    }
  }

  const parts = [blockName, JSON.stringify(stableAttrs), String(siblingIndex)];
  const hash = simpleHash(parts.join("|"));

  return {
    hash,
    blockName,
    stableAttrs,
    siblingIndex,
  };
}

/**
 * Compare two fingerprints for equality.
 */
export function fingerprintsEqual(a: BlockFingerprint, b: BlockFingerprint): boolean {
  return a.hash === b.hash && a.blockName === b.blockName && a.siblingIndex === b.siblingIndex;
}

/**
 * Compute a simple hash string from input.
 */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}
