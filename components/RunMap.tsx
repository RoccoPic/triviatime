"use client";

import type { MapNode, RunMapData } from "@/lib/map";

// ── Layout constants (wave-1 defaults; overridden dynamically per render) ─────
const CANVAS_W = 700;
const PADDING_X = 44;
const ROW_SPACING = 80;

// How long (ms) the token glide animation takes — keep in sync with page.tsx
export const TOKEN_MOVE_MS = 700;

// ── Node appearance ───────────────────────────────────────────────────────────
const NODE_ICON: Record<string, string> = {
  battle: "✠",   // ✠ Maltese cross
  elite:  "♛",   // ♛ queen
  boss:   "☠",   // ☠ skull
  shop:   "❖",   // ❖ diamond
  rest:   "♥",   // ♥ heart
  event:  "?",
};

const NODE_STROKE: Record<string, string> = {
  battle: "#6b6551",
  elite:  "#c9913d",
  boss:   "#9a1c2b",
  shop:   "#4ade80",
  rest:   "#60a5fa",
  event:  "#a78bfa",
};

const NODE_FILL: Record<string, string> = {
  battle: "#1a0d12",
  elite:  "#1f1200",
  boss:   "#1f0a0a",
  shop:   "#061a0e",
  rest:   "#060f1a",
  event:  "#100818",
};

const NODE_LABEL: Record<string, string> = {
  battle: "Battle",
  elite:  "Elite",
  boss:   "Boss",
  shop:   "Bazaar",
  rest:   "Hearth",
  event:  "Omen",
};

// ── Position helper (takes dynamic layout values) ─────────────────────────────
function nodePos(
  node: MapNode,
  allNodes: MapNode[],
  colStep: number,
  centerY: number,
): { x: number; y: number } {
  const inCol = allNodes.filter((n) => n.col === node.col).length;
  const x = PADDING_X + node.col * colStep;
  const y = centerY + (node.row - (inCol - 1) / 2) * ROW_SPACING;
  return { x, y };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface RunMapProps {
  mapData: RunMapData;
  availableNodeIds: string[];
  onSelect: (nodeId: string) => void;
  selecting?: boolean;      // disable clicks while a request is in flight
  enteringNodeId?: string;  // node the player just clicked — token animates here
}

export function RunMap({
  mapData,
  availableNodeIds,
  onSelect,
  selecting,
  enteringNodeId,
}: RunMapProps) {
  const { nodes, completedNodeIds } = mapData;

  // ── Dynamic layout (scales for higher-wave maps) ──────────────────────────
  const numCols = nodes.length > 0 ? Math.max(...nodes.map((n) => n.col)) + 1 : 6;
  const maxRow  = nodes.length > 0 ? Math.max(...nodes.map((n) => n.row))      : 2;
  const NODE_R  = numCols <= 6 ? 26 : numCols <= 8 ? 22 : 19;
  const CANVAS_H = Math.max(280, (maxRow + 1) * ROW_SPACING + 100);
  const COL_STEP = (CANVAS_W - 2 * PADDING_X) / Math.max(numCols - 1, 1);
  const CENTER_Y = CANVAS_H / 2;

  const posMap = Object.fromEntries(nodes.map((n) => [n.id, nodePos(n, nodes, COL_STEP, CENTER_Y)]));

  // Token sits at the entering node (if mid-click) else the last completed node.
  const lastCompletedId = completedNodeIds[completedNodeIds.length - 1] ?? null;
  const tokenNodeId = enteringNodeId ?? lastCompletedId;
  const tokenPos = tokenNodeId ? posMap[tokenNodeId] : null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(214,160,74,0.2)" }}
    >
      <svg
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className="w-full"
        style={{ minWidth: 340 }}
      >

        {/* ── Edges ─────────────────────────────────────────────────── */}
        {nodes.map((node) =>
          node.nextIds.map((nextId) => {
            const from = posMap[node.id];
            const to = posMap[nextId];
            if (!from || !to) return null;

            const bothDone =
              completedNodeIds.includes(node.id) && completedNodeIds.includes(nextId);
            const activated =
              completedNodeIds.includes(node.id) || availableNodeIds.includes(node.id);

            return (
              <line
                key={`${node.id}-${nextId}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={bothDone ? "#3d3028" : activated ? "#4a3a28" : "#2a1e14"}
                strokeWidth={bothDone ? 2 : 1.5}
                strokeDasharray={bothDone ? undefined : "5 4"}
              />
            );
          })
        )}

        {/* ── Nodes ─────────────────────────────────────────────────── */}
        {nodes.map((node) => {
          const { x, y } = posMap[node.id];
          const completed = completedNodeIds.includes(node.id);
          const available = availableNodeIds.includes(node.id);
          const stroke = available
            ? "#d6a04a"
            : completed
            ? "#3d3028"
            : NODE_STROKE[node.type] ?? "#6b6551";

          return (
            <g
              key={node.id}
              onClick={available && !selecting ? () => onSelect(node.id) : undefined}
              className={available && !selecting ? "map-node-available" : undefined}
            >
              {/* Pulse ring for available nodes */}
              {available && (
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_R + 9}
                  fill="none"
                  stroke="#d6a04a"
                  strokeWidth={1.5}
                  opacity={0.4}
                />
              )}

              {/* Main circle */}
              <circle
                cx={x}
                cy={y}
                r={NODE_R}
                fill={completed ? "#0f0710" : NODE_FILL[node.type] ?? "#1a0d12"}
                stroke={stroke}
                strokeWidth={available ? 2.5 : 1.5}
                opacity={completed ? 0.4 : 1}
              />

              {/* Icon */}
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={completed ? 14 : 16}
                fill={completed ? "#3d3028" : available ? "#d6a04a" : "#ecdab4"}
                fontFamily="system-ui, sans-serif"
              >
                {completed ? "✓" : NODE_ICON[node.type] ?? "?"}
              </text>

              {/* Category / type label below node */}
              {!completed && (
                <text
                  x={x}
                  y={y + NODE_R + 13}
                  textAnchor="middle"
                  fontSize={9}
                  fill={available ? "#d6a04a" : "#6b6551"}
                  fontFamily="system-ui, sans-serif"
                >
                  {node.categoryName ?? NODE_LABEL[node.type]}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Player token (dragon) ──────────────────────────────────── */}
        {tokenPos && (
          <g
            pointerEvents="none"
            style={{
              transform: `translate(${tokenPos.x}px, ${tokenPos.y}px)`,
              transition: `transform ${TOKEN_MOVE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          >
            {/* Glow halo */}
            <circle
              r={NODE_R + 7}
              fill="rgba(214,160,74,0.08)"
              stroke="#d6a04a"
              strokeWidth={1.5}
              opacity={0.75}
            />
            {/* Pixel-art dragon logo — scale(-1,1) flips horizontally around x=0 (the centre) */}
            <image
              href="/logo.png"
              x={-15}
              y={-15}
              width={30}
              height={30}
              transform="scale(-1, 1)"
              style={{ imageRendering: "pixelated" }}
            />
          </g>
        )}
      </svg>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-x-5 gap-y-1 px-4 pb-3 text-xs"
        style={{
          color: "var(--text-muted, #b8a882)",
          borderTop: "1px solid rgba(214,160,74,0.12)",
          paddingTop: "0.5rem",
        }}
      >
        <span><span style={{ color: "#ecdab4" }}>✠</span> Battle</span>
        <span><span style={{ color: "#c9913d" }}>♛</span> Elite · harder + relic</span>
        <span><span style={{ color: "#9a1c2b" }}>☠</span> Boss · final battle + relic</span>
        <span><span style={{ color: "#4ade80" }}>❖</span> Bazaar · free items</span>
        <span><span style={{ color: "#60a5fa" }}>♥</span> Hearth · +1 life</span>
        <span><span style={{ color: "#a78bfa" }}>?</span> Omen · unknown</span>
      </div>
    </div>
  );
}
