"use client";

import type { MapNode, RunMapData } from "@/lib/map";

// ── Layout constants ──────────────────────────────────────────────────────────
const CANVAS_W = 700;
const CANVAS_H = 280;
const PADDING_X = 44;
const NODE_R = 26;
const NUM_COLS = 6;
const COL_STEP = (CANVAS_W - 2 * PADDING_X) / (NUM_COLS - 1); // ~122
const CENTER_Y = CANVAS_H / 2;
const ROW_SPACING = 86;

// ── Node appearance ───────────────────────────────────────────────────────────
const NODE_ICON: Record<string, string> = {
  battle: "⚔",
  elite:  "♛",
  shop:   "✦",
  rest:   "❤",
  event:  "?",
};

const NODE_STROKE: Record<string, string> = {
  battle: "#71717a",
  elite:  "#d97706",
  shop:   "#22c55e",
  rest:   "#3b82f6",
  event:  "#a855f7",
};

const NODE_FILL: Record<string, string> = {
  battle: "#18181b",
  elite:  "#1c1200",
  shop:   "#071a0a",
  rest:   "#070f1a",
  event:  "#0e0718",
};

const NODE_LABEL: Record<string, string> = {
  battle: "Battle",
  elite:  "Elite",
  shop:   "Shop",
  rest:   "Rest",
  event:  "Event",
};

// ── Position helper ───────────────────────────────────────────────────────────
function nodePos(node: MapNode, allNodes: MapNode[]): { x: number; y: number } {
  const inCol = allNodes.filter((n) => n.col === node.col).length;
  const x = PADDING_X + node.col * COL_STEP;
  const y = CENTER_Y + (node.row - (inCol - 1) / 2) * ROW_SPACING;
  return { x, y };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface RunMapProps {
  mapData: RunMapData;
  availableNodeIds: string[];
  onSelect: (nodeId: string) => void;
  selecting?: boolean; // disable all clicks while a request is in flight
}

export function RunMap({ mapData, availableNodeIds, onSelect, selecting }: RunMapProps) {
  const { nodes, completedNodeIds } = mapData;
  const posMap = Object.fromEntries(nodes.map((n) => [n.id, nodePos(n, nodes)]));

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 overflow-hidden">
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
                stroke={bothDone ? "#52525b" : activated ? "#3f3f46" : "#27272a"}
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
            ? "#f59e0b"
            : completed
            ? "#3f3f46"
            : NODE_STROKE[node.type] ?? "#52525b";

          return (
            <g
              key={node.id}
              onClick={available && !selecting ? () => onSelect(node.id) : undefined}
              style={{ cursor: available && !selecting ? "pointer" : "default" }}
            >
              {/* Pulse ring for available nodes */}
              {available && (
                <circle
                  cx={x}
                  cy={y}
                  r={NODE_R + 9}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  opacity={0.35}
                />
              )}

              {/* Main circle */}
              <circle
                cx={x}
                cy={y}
                r={NODE_R}
                fill={completed ? "#09090b" : NODE_FILL[node.type] ?? "#18181b"}
                stroke={stroke}
                strokeWidth={available ? 2.5 : 1.5}
                opacity={completed ? 0.45 : 1}
              />

              {/* Icon */}
              <text
                x={x}
                y={y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={completed ? 14 : 16}
                fill={completed ? "#52525b" : available ? "#fbbf24" : "#e4e4e7"}
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
                  fill={available ? "#fbbf24" : "#52525b"}
                  fontFamily="system-ui, sans-serif"
                >
                  {node.categoryName ?? NODE_LABEL[node.type]}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 px-4 pb-3 text-xs text-zinc-500">
        <span><span className="text-zinc-300">⚔</span> Battle</span>
        <span><span className="text-amber-500">♛</span> Elite · harder + more $</span>
        <span><span className="text-green-500">✦</span> Shop · free items</span>
        <span><span className="text-blue-500">❤</span> Rest · +1 life</span>
        <span><span className="text-purple-400">?</span> Event · unknown encounter</span>
      </div>
    </div>
  );
}
