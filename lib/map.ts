// ─── Map types & generation ──────────────────────────────────────────────────

export type NodeType = "battle" | "elite" | "boss" | "shop" | "rest" | "event";

export interface MapNode {
  id: string;         // "c{col}r{row}"
  col: number;        // 0-indexed column
  row: number;        // 0-indexed row within column
  type: NodeType;
  categoryId: string | null;  // null for shop / rest / event nodes
  categoryName?: string;      // denormalized for display
  nextIds: string[];          // IDs of nodes this connects to in col+1
  themeSlug?: string;         // event nodes only: category slug used to pick the themed event
}

export interface RunMapData {
  nodes: MapNode[];
  completedNodeIds: string[];  // in order of completion
}

// Column layout: number of nodes per column (first and last are always 1)
// Wave 1 → 6 cols, each extra wave adds one middle column (capped at 4 extra = 10 cols total).
export function getColumnSizes(wave = 1): number[] {
  const extra = Math.min(wave - 1, 4);
  const sizes: number[] = [1, 2, 3];
  for (let i = 0; i < extra; i++) sizes.push(3 + Math.floor(i / 2)); // 3, 3, 4, 4
  sizes.push(3, 2, 1);
  return sizes;
}

export const MAP_NUM_COLS = 6; // wave-1 default (used for display constants only)

function pickType(col: number, totalCols: number): NodeType {
  // First column is always a battle; last column is always the boss
  if (col === 0) return "battle";
  if (col === totalCols - 1) return "boss";
  const r = Math.random();
  if (r < 0.42) return "battle";
  if (r < 0.60) return "elite";
  if (r < 0.74) return "shop";
  if (r < 0.86) return "rest";
  return "event";
}

/** Generate a full run map from a pool of categories.
 *  Each battle/elite node gets a unique shuffled category assigned to it. */
export function generateMap(
  categories: { id: string; name: string; slug?: string }[],
  wave = 1,
): RunMapData {
  const columnSizes = getColumnSizes(wave);
  const shuffled = [...categories].sort(() => Math.random() - 0.5);
  let catIdx = 0;

  const nodes: MapNode[] = [];

  for (let col = 0; col < columnSizes.length; col++) {
    for (let row = 0; row < columnSizes[col]; row++) {
      const type = pickType(col, columnSizes.length);
      const needsCat = type === "battle" || type === "elite" || type === "boss";
      const cat = needsCat ? shuffled[catIdx++ % shuffled.length] : undefined;

      // Event nodes get a random category slug to determine their thematic character.
      // The slug is stored on the node so the same event appears on page refresh.
      const themeSlug =
        type === "event"
          ? categories[Math.floor(Math.random() * categories.length)]?.slug
          : undefined;

      nodes.push({
        id: `c${col}r${row}`,
        col,
        row,
        type,
        categoryId: cat?.id ?? null,
        categoryName: cat?.name,
        nextIds: [],
        ...(themeSlug !== undefined ? { themeSlug } : {}),
      });
    }
  }

  // ── Build edges ────────────────────────────────────────────────────────────
  // Each node connects to 1–2 nodes in the next column.
  // Every next-column node must have at least one incoming edge.
  // Rule: shops never link directly to other shops (if a non-shop target exists).
  for (let col = 0; col < columnSizes.length - 1; col++) {
    const cur = nodes.filter((n) => n.col === col);
    const nxt = nodes.filter((n) => n.col === col + 1);

    for (const node of cur) {
      const count = nxt.length === 1 ? 1 : Math.random() < 0.4 ? 2 : 1;
      // Shops prefer non-shop destinations; fall back to any if none exist.
      const eligibleNxt = node.type === "shop" ? nxt.filter((n) => n.type !== "shop") : nxt;
      const pool = eligibleNxt.length > 0 ? eligibleNxt : nxt;
      const shuffledNxt = [...pool].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(count, shuffledNxt.length); i++) {
        if (!node.nextIds.includes(shuffledNxt[i].id)) {
          node.nextIds.push(shuffledNxt[i].id);
        }
      }
    }

    // Guarantee every next node is reachable.
    // Shop destinations prefer non-shop sources to avoid shop→shop chains.
    for (const nxtNode of nxt) {
      if (!cur.some((n) => n.nextIds.includes(nxtNode.id))) {
        const eligibleSrc = nxtNode.type === "shop" ? cur.filter((n) => n.type !== "shop") : cur;
        const srcPool = eligibleSrc.length > 0 ? eligibleSrc : cur;
        const rand = srcPool[Math.floor(Math.random() * srcPool.length)];
        if (!rand.nextIds.includes(nxtNode.id)) {
          rand.nextIds.push(nxtNode.id);
        }
      }
    }
  }

  return { nodes, completedNodeIds: [] };
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export function getNodeById(
  mapData: RunMapData,
  id: string
): MapNode | undefined {
  return mapData.nodes.find((n) => n.id === id);
}

/** Node IDs the player may enter next (empty = run complete). */
export function getAvailableNodeIds(mapData: RunMapData): string[] {
  const { nodes, completedNodeIds } = mapData;
  if (completedNodeIds.length === 0) {
    return nodes.filter((n) => n.col === 0).map((n) => n.id);
  }
  const lastId = completedNodeIds[completedNodeIds.length - 1];
  const lastNode = nodes.find((n) => n.id === lastId);
  if (!lastNode) return [];
  return lastNode.nextIds.filter((id) => !completedNodeIds.includes(id));
}

/** True when the player has completed a node in the final column. */
export function isMapComplete(mapData: RunMapData): boolean {
  const maxCol = Math.max(...mapData.nodes.map((n) => n.col));
  return mapData.completedNodeIds.some(
    (id) => mapData.nodes.find((n) => n.id === id)?.col === maxCol
  );
}

/** 1-indexed "floor" number for display, derived from the current node column. */
export function nodeToFloorNumber(node: MapNode): number {
  return node.col + 1;
}
