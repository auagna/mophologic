"use client";

import { MouseEvent, PointerEvent, useEffect, useMemo, useRef } from "react";
import { Download, FileImage } from "lucide-react";
import { boundaryPath, VIEWBOX } from "@/lib/boundary";
import { exportPng, exportSvg } from "@/lib/svgExport";
import { axisNodesForAxes, linksForBubbles } from "@/lib/forces";
import { buildSignedFieldPath } from "@/lib/signedField";
import { Button } from "@/components/ui/Button";
import { useSimStore } from "@/store/useSimStore";
import type { AxisNode, Bubble } from "@/types";

type DragTarget =
  | { type: "bubble"; id: string }
  | { type: "axis-node"; axisId: string; role: AxisNode["role"] }
  | { type: "axis"; axisId: string; lastX: number; lastY: number };

export function ForceCanvas() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragTarget = useRef<DragTarget | null>(null);
  const frameRef = useRef<number | null>(null);
  const boundary = useSimStore((state) => state.boundary);
  const params = useSimStore((state) => state.params);
  const bubbles = useSimStore((state) => state.bubbles);
  const axes = useSimStore((state) => state.axes);
  const selectedId = useSimStore((state) => state.selectedId);
  const patternMode = useSimStore((state) => state.patternMode);
  const visual = useSimStore((state) => state.visual);
  const isPaused = useSimStore((state) => state.isPaused);
  const moveBubble = useSimStore((state) => state.moveBubble);
  const moveAxisNode = useSimStore((state) => state.moveAxisNode);
  const translateAxis = useSimStore((state) => state.translateAxis);
  const selectBubble = useSimStore((state) => state.selectBubble);
  const selectAxisNode = useSimStore((state) => state.selectAxisNode);
  const toggleFixed = useSimStore((state) => state.toggleFixed);
  const addBubble = useSimStore((state) => state.addBubble);
  const deleteSelected = useSimStore((state) => state.deleteSelected);

  const bPath = useMemo(() => boundaryPath(boundary), [boundary]);
  const massBubbles = useMemo(() => bubbles.filter((bubble) => bubble.kind === "mass"), [bubbles]);
  const carveBubbles = useMemo(() => bubbles.filter((bubble) => bubble.kind === "carve"), [bubbles]);
  const selectedBubble = useMemo(() => bubbles.find((bubble) => bubble.id === selectedId) ?? null, [bubbles, selectedId]);
  const axisFieldBubbles = useMemo(() => carveBubbles.map((bubble) => ({ ...bubble, vx: 0, vy: 0 })), [carveBubbles]);
  const links = useMemo(() => linksForBubbles(bubbles, params), [bubbles, params]);
  const axisNodes = useMemo(() => axisNodesForAxes(axes), [axes]);
  const fixedAxisIds = useMemo(() => new Set(axes.filter((axis) => axis.fixed).map((axis) => axis.id)), [axes]);
  const fieldPath = useMemo(() => buildSignedFieldPath(bubbles, axes, boundary, params), [bubbles, axes, boundary, params]);
  const bubbleFieldPath = useMemo(() => buildSignedFieldPath(bubbles, [], boundary, params), [bubbles, boundary, params]);
  const axisFieldPath = useMemo(() => buildSignedFieldPath(axisFieldBubbles, axes, boundary, params), [axisFieldBubbles, axes, boundary, params]);

  useEffect(() => {
    function tick() {
      if (!useSimStore.getState().isPaused) {
        useSimStore.getState().step();
      }
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected]);

  const pointFromEvent = (event: MouseEvent<SVGSVGElement> | PointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEWBOX.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEWBOX.height
    };
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const target = dragTarget.current;
    if (!target) return;
    const point = pointFromEvent(event);
    if (!point) return;
    if (target.type === "bubble") {
      moveBubble(target.id, point.x, point.y);
      return;
    }
    if (target.type === "axis") {
      translateAxis(target.axisId, point.x - target.lastX, point.y - target.lastY);
      dragTarget.current = { ...target, lastX: point.x, lastY: point.y };
      return;
    }
    moveAxisNode(target.axisId, target.role, point.x, point.y);
  };

  const onPointerUp = () => {
    dragTarget.current = null;
  };

  const onDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    const point = pointFromEvent(event);
    if (!point) return;
    event.preventDefault();
    addBubble(event.altKey ? "carve" : "mass", point.x, point.y);
  };

  return (
    <section className="flex min-h-[620px] flex-col border border-lab-border bg-lab-panel shadow-panel">
      <div className="flex min-h-10 items-center justify-between border-b border-lab-border px-3">
        <div className="text-[11px] uppercase text-lab-muted">
          force graph / {boundary.shape} / variant seed {params.seed}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => svgRef.current && exportSvg(svgRef.current)}>
            <Download size={14} />
            SVG
          </Button>
          <Button onClick={() => svgRef.current && void exportPng(svgRef.current)}>
            <FileImage size={14} />
            PNG
          </Button>
        </div>
      </div>

      <div className="grid flex-1 place-items-center p-3">
        <svg
          ref={svgRef}
          data-force-canvas
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="h-full min-h-[520px] w-full touch-none border border-[#d3cfc4] bg-lab-canvas"
          role="img"
          aria-label="Animated force bubble generator"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onDoubleClick={onDoubleClick}
        >
          <defs>
            <clipPath id="force-boundary-clip">
              <path d={bPath} />
            </clipPath>
            <clipPath id="force-field-shape-clip">
              <path d={fieldPath} />
            </clipPath>
            <pattern id="force-grid" width="34" height="34" patternUnits="userSpaceOnUse">
              <path d="M 34 0 H 0 V 34" fill="none" stroke="#d7d2c5" strokeWidth="0.7" />
            </pattern>
          </defs>

          <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="#f2efe5" />
          <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="url(#force-grid)" opacity="0.38" />
          {params.showGrid ? <DesignGrid boundary={boundary} columns={params.gridColumns} rows={params.gridRows} /> : null}
          <path d={bPath} fill="none" stroke="#776f63" strokeDasharray="7 7" strokeWidth="2" />

          {visual.showLinks || patternMode === "network" ? (
            <g clipPath="url(#force-boundary-clip)" pointerEvents="none">
              {axes.map((axis) => (
                <g key={axis.id} data-axis-id={axis.id}>
                  <line
                    x1={axis.x1}
                    y1={axis.y1}
                    x2={axis.x2}
                    y2={axis.y2}
                    stroke={selectedId === axis.id ? "#ffffff" : "#4e9dff"}
                    strokeLinecap="round"
                    strokeWidth={Math.max(2, axis.thickness * 0.08)}
                    strokeDasharray={axis.fixed ? "7 5" : undefined}
                    opacity="0.42"
                  />
                </g>
              ))}
              {links.map((link) => (
                <line key={`${link.a.id}-${link.b.id}`} x1={link.a.x} y1={link.a.y} x2={link.b.x} y2={link.b.y} stroke="#6d7480" strokeWidth="1.2" opacity={link.opacity * 0.82} />
              ))}
            </g>
          ) : null}

          {visual.showMergedShape || patternMode === "metaball" || patternMode === "carved" ? (
            <g clipPath="url(#force-boundary-clip)" data-signed-field-shape>
              {params.surfaceMode === "merge" ? (
                <path
                  d={fieldPath}
                  fill={params.bubbleFillColor}
                  stroke={params.bubbleFillColor}
                  strokeLinejoin="round"
                  strokeWidth="1.4"
                  fillRule="nonzero"
                  pointerEvents="none"
                  data-field-path
                  data-merged-field-path
                />
              ) : (
                <>
                  <path d={fieldPath} fill="none" stroke="none" pointerEvents="none" data-field-path />
                  <path
                    d={bubbleFieldPath}
                    fill={params.bubbleFillColor}
                    stroke={params.bubbleFillColor}
                    strokeLinejoin="round"
                    strokeWidth="1.4"
                    fillRule="nonzero"
                    pointerEvents="none"
                    data-bubble-field-path
                  />
                  {axes.length > 0 ? (
                    <path
                      d={axisFieldPath}
                      fill={params.axisFillColor}
                      stroke={params.axisFillColor}
                      strokeLinejoin="round"
                      strokeWidth="1.4"
                      fillRule="nonzero"
                      pointerEvents="none"
                      data-axis-field-path
                    />
                  ) : null}
                </>
              )}
              <g clipPath="url(#force-field-shape-clip)">{renderPattern(patternMode, massBubbles, links)}</g>
            </g>
          ) : null}

          {axes.length > 0 ? (
            <g clipPath="url(#force-boundary-clip)" data-axis-line-control-layer>
              {axes.map((axis) => (
                <g key={`control-${axis.id}`} data-axis-id={axis.id}>
                  <line
                    x1={axis.x1}
                    y1={axis.y1}
                    x2={axis.x2}
                    y2={axis.y2}
                    stroke={selectedId === axis.id ? "#ffffff" : "#4e9dff"}
                    strokeLinecap="round"
                    strokeWidth={Math.max(2, axis.thickness * 0.1)}
                    strokeDasharray={axis.fixed ? "7 5" : undefined}
                    opacity="0.62"
                    pointerEvents="none"
                  />
                  <line
                    x1={axis.x1}
                    y1={axis.y1}
                    x2={axis.x2}
                    y2={axis.y2}
                    stroke="transparent"
                    strokeLinecap="round"
                    strokeWidth={Math.max(8, axis.thickness * 0.24)}
                    pointerEvents="stroke"
                    className={axis.fixed ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
                    onPointerDown={(event) => {
                      const point = pointFromEvent(event);
                      if (!point) return;
                      event.stopPropagation();
                      selectAxisNode(axis.id);
                      if (event.shiftKey) {
                        toggleFixed(axis.id);
                        return;
                      }
                      if (axis.fixed) return;
                      dragTarget.current = { type: "axis", axisId: axis.id, lastX: point.x, lastY: point.y };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                  />
                </g>
              ))}
            </g>
          ) : null}

          {visual.showBubbles || patternMode === "bubble" || patternMode === "ring" ? (
            <g>
              {massBubbles.map((bubble) => (
                <BubbleCircle
                  key={bubble.id}
                  bubble={bubble}
                  selected={bubble.id === selectedId}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    selectBubble(bubble.id);
                    if (event.shiftKey) {
                      toggleFixed(bubble.id);
                      return;
                    }
                    if (bubble.fixed) return;
                    dragTarget.current = { type: "bubble", id: bubble.id };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                />
              ))}
            </g>
          ) : null}

          {visual.showCarveBubbles || patternMode === "carved" ? (
            <g>
              {carveBubbles.map((bubble) => (
                <BubbleCircle
                  key={bubble.id}
                  bubble={bubble}
                  selected={bubble.id === selectedId}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    selectBubble(bubble.id);
                    if (event.shiftKey) {
                      toggleFixed(bubble.id);
                      return;
                    }
                    if (bubble.fixed) return;
                    dragTarget.current = { type: "bubble", id: bubble.id };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                />
              ))}
            </g>
          ) : null}

          <g data-carve-guide-layer pointerEvents="none">
            {carveBubbles.map((bubble) => (
              <CarveBubbleGuide key={`carve-guide-${bubble.id}`} bubble={bubble} selected={bubble.id === selectedId} />
            ))}
          </g>

          <g data-bubble-control-layer>
            {bubbles.map((bubble) => (
              <BubbleHandle
                key={`handle-${bubble.id}`}
                bubble={bubble}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  selectBubble(bubble.id);
                  if (event.shiftKey) {
                    toggleFixed(bubble.id);
                    return;
                  }
                  if (bubble.fixed) return;
                  dragTarget.current = { type: "bubble", id: bubble.id };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
              />
            ))}
          </g>

          {selectedBubble ? <SelectedBubbleGuide bubble={selectedBubble} /> : null}

          {axes.length > 0 ? (
            <g clipPath="url(#force-boundary-clip)" data-axis-control-layer>
              {axisNodes.map((node) => (
                <AxisNodeGuide
                  key={node.id}
                  node={node}
                  selected={node.id === selectedId}
                  fixed={fixedAxisIds.has(node.axisId)}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    selectAxisNode(node.id);
                    if (event.shiftKey) {
                      toggleFixed(node.axisId);
                      return;
                    }
                    if (fixedAxisIds.has(node.axisId)) return;
                    dragTarget.current = { type: "axis-node", axisId: node.axisId, role: node.role };
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                />
              ))}
            </g>
          ) : null}

          {isPaused ? (
            <text x={24} y={VIEWBOX.height - 24} fill="#776f63" fontSize="14">
              motion stopped
            </text>
          ) : null}
        </svg>
      </div>
    </section>
  );
}

function DesignGrid({ boundary, columns, rows }: { boundary: { cx: number; cy: number; width: number; height: number; padding: number }; columns: number; rows: number }) {
  const safeColumns = Math.max(1, columns);
  const safeRows = Math.max(1, rows);
  const width = Math.max(1, boundary.width - boundary.padding * 2);
  const height = Math.max(1, boundary.height - boundary.padding * 2);
  const left = boundary.cx - width / 2;
  const top = boundary.cy - height / 2;
  const verticals = Array.from({ length: safeColumns + 1 }, (_, index) => left + (width * index) / safeColumns);
  const horizontals = Array.from({ length: safeRows + 1 }, (_, index) => top + (height * index) / safeRows);

  return (
    <g data-design-grid pointerEvents="none">
      <rect x={left} y={top} width={width} height={height} fill="none" stroke="#9b9386" strokeWidth="1" opacity="0.28" />
      {verticals.map((x, index) => (
        <line key={`v-${index}`} x1={x} y1={top} x2={x} y2={top + height} stroke="#9b9386" strokeWidth="0.9" opacity={index === 0 || index === safeColumns ? 0.32 : 0.22} />
      ))}
      {horizontals.map((y, index) => (
        <line key={`h-${index}`} x1={left} y1={y} x2={left + width} y2={y} stroke="#9b9386" strokeWidth="0.9" opacity={index === 0 || index === safeRows ? 0.32 : 0.22} />
      ))}
    </g>
  );
}

function CarveBubbleGuide({ bubble, selected }: { bubble: Bubble; selected: boolean }) {
  return (
    <g data-carve-guide-id={bubble.id}>
      <circle
        cx={bubble.x}
        cy={bubble.y}
        r={bubble.r}
        fill="rgba(255,255,255,0.18)"
        stroke={selected ? "#14110d" : "#6f675d"}
        strokeDasharray={bubble.fixed ? "6 4" : "4 3"}
        strokeWidth={selected ? 2.6 : 1.7}
        opacity="0.92"
      />
      <text x={bubble.x} y={bubble.y + 5} fill="#3f382f" fontSize={Math.max(10, bubble.r * 0.5)} textAnchor="middle" opacity="0.82">
        -
      </text>
    </g>
  );
}

function BubbleHandle({ bubble, onPointerDown }: { bubble: Bubble; onPointerDown: (event: PointerEvent<SVGCircleElement>) => void }) {
  return (
    <circle
      data-bubble-control-id={bubble.id}
      cx={bubble.x}
      cy={bubble.y}
      r={bubble.r}
      fill="transparent"
      pointerEvents="all"
      className={bubble.fixed ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
      onPointerDown={onPointerDown}
    />
  );
}

function SelectedBubbleGuide({ bubble }: { bubble: Bubble }) {
  const isCarve = bubble.kind === "carve";
  return (
    <g data-selected-bubble-guide={bubble.id} pointerEvents="none">
      <circle cx={bubble.x} cy={bubble.y} r={bubble.r} fill="none" stroke={isCarve ? "#16120d" : "#07101d"} strokeWidth="4.4" opacity="0.72" />
      <circle cx={bubble.x} cy={bubble.y} r={bubble.r} fill="none" stroke={isCarve ? "#f8f4ea" : "#7db7ff"} strokeDasharray="7 4" strokeWidth="2.2" />
      <text
        x={bubble.x}
        y={bubble.y + 5}
        fill={isCarve ? "#16120d" : "#4e9dff"}
        stroke={isCarve ? "#f8f4ea" : "none"}
        strokeWidth={isCarve ? 0.8 : 0}
        fontSize={bubble.r * 0.44}
        textAnchor="middle"
        opacity="0.95"
      >
        {isCarve ? "-" : "+"}
      </text>
    </g>
  );
}

function AxisNodeGuide({
  node,
  selected,
  fixed,
  onPointerDown
}: {
  node: AxisNode;
  selected: boolean;
  fixed?: boolean;
  onPointerDown: (event: PointerEvent<SVGCircleElement>) => void;
}) {
  return (
    <g data-axis-node-id={node.id} data-axis-id={node.axisId}>
      <circle
        cx={node.x}
        cy={node.y}
        r={Math.max(14, node.r * 0.7)}
        fill="transparent"
        pointerEvents="all"
        className={fixed ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
        onPointerDown={onPointerDown}
      />
      <circle
        cx={node.x}
        cy={node.y}
        r={node.r}
        fill="rgba(78,157,255,0.08)"
        stroke={selected ? "#ffffff" : "#4e9dff"}
        strokeDasharray={fixed ? "2 5" : "5 4"}
        strokeWidth={selected ? 3 : 1.7}
        pointerEvents="all"
        className={fixed ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
        onPointerDown={onPointerDown}
      />
      <text x={node.x} y={node.y + 5} fill="#4e9dff" fontSize={node.r * 0.42} textAnchor="middle" pointerEvents="none" opacity={fixed ? 0.42 : 0.72}>
        +
      </text>
    </g>
  );
}

function BubbleCircle({
  bubble,
  selected,
  onPointerDown
}: {
  bubble: Bubble;
  selected: boolean;
  onPointerDown: (event: PointerEvent<SVGCircleElement>) => void;
}) {
  const isCarve = bubble.kind === "carve";
  return (
    <>
      <circle
        data-bubble-id={bubble.id}
        cx={bubble.x}
        cy={bubble.y}
        r={bubble.r}
        fill={isCarve ? "rgba(255,255,255,0.46)" : "rgba(78,157,255,0.13)"}
        stroke={selected ? (isCarve ? "#9b9386" : "#ffffff") : isCarve ? "#9b9386" : bubble.fixed ? "#2f7fd2" : "#4e9dff"}
        strokeDasharray={bubble.fixed ? "6 4" : undefined}
        strokeWidth={selected ? 3 : 1.6}
        className={bubble.fixed ? "cursor-default" : "cursor-grab active:cursor-grabbing"}
        onPointerDown={onPointerDown}
      />
      <text
        x={bubble.x}
        y={bubble.y + 5}
        fill={isCarve ? "#776f63" : "#4e9dff"}
        fontSize={bubble.r * 0.44}
        textAnchor="middle"
        pointerEvents="none"
        opacity={selected ? 0.95 : 0.58}
      >
        {isCarve ? "-" : "+"}
      </text>
    </>
  );
}

function renderPattern(patternMode: string, massBubbles: Bubble[], links: ReturnType<typeof linksForBubbles>) {
  if (patternMode === "bubble") {
    return massBubbles.map((bubble) => <circle key={`pattern-${bubble.id}`} cx={bubble.x} cy={bubble.y} r={bubble.r * 0.42} fill="none" stroke="#f4f1e8" strokeWidth="2" opacity="0.68" />);
  }

  if (patternMode === "ring") {
    return massBubbles.flatMap((bubble) => [0.35, 0.58, 0.78].map((scale) => <circle key={`ring-${bubble.id}-${scale}`} cx={bubble.x} cy={bubble.y} r={bubble.r * scale} fill="none" stroke="#f4f1e8" strokeWidth="1.3" opacity="0.56" />));
  }

  if (patternMode === "cellular") {
    return massBubbles.flatMap((bubble) =>
      nearestBubbles(bubble, massBubbles, 3).map((near) => (
        <line key={`cell-${bubble.id}-${near.id}`} x1={bubble.x} y1={bubble.y} x2={near.x} y2={near.y} stroke="#f4f1e8" strokeWidth="1.15" opacity="0.48" />
      ))
    );
  }

  if (patternMode === "network") {
    return links.map((link) => <line key={`net-${link.a.id}-${link.b.id}`} x1={link.a.x} y1={link.a.y} x2={link.b.x} y2={link.b.y} stroke="#f4f1e8" strokeWidth="1.2" opacity="0.48" />);
  }

  if (patternMode === "carved") {
    return massBubbles.map((bubble) => <circle key={`dot-${bubble.id}`} cx={bubble.x} cy={bubble.y} r={Math.max(2, bubble.r * 0.08)} fill="#f4f1e8" opacity="0.52" />);
  }

  return null;
}

function nearestBubbles(origin: Bubble, bubbles: Bubble[], count: number) {
  return bubbles
    .filter((bubble) => bubble.id !== origin.id)
    .map((bubble) => ({ bubble, d: Math.hypot(bubble.x - origin.x, bubble.y - origin.y) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, count)
    .map((item) => item.bubble);
}
