"use client";

import { MouseEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage } from "lucide-react";
import { boundaryPath, VIEWBOX } from "@/lib/boundary";
import { exportPng, exportSvg } from "@/lib/svgExport";
import { linksForBubbles } from "@/lib/forces";
import { buildSignedFieldPath } from "@/lib/signedField";
import { Button } from "@/components/ui/Button";
import { useSimStore } from "@/store/useSimStore";
import type { Bubble } from "@/types";

export function ForceCanvas() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragId = useRef<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const [frame, setFrame] = useState(0);
  const boundary = useSimStore((state) => state.boundary);
  const params = useSimStore((state) => state.params);
  const bubbles = useSimStore((state) => state.bubbles);
  const selectedId = useSimStore((state) => state.selectedId);
  const patternMode = useSimStore((state) => state.patternMode);
  const visual = useSimStore((state) => state.visual);
  const isPaused = useSimStore((state) => state.isPaused);
  const moveBubble = useSimStore((state) => state.moveBubble);
  const selectBubble = useSimStore((state) => state.selectBubble);
  const toggleFixed = useSimStore((state) => state.toggleFixed);
  const addBubble = useSimStore((state) => state.addBubble);
  const deleteSelected = useSimStore((state) => state.deleteSelected);

  const bPath = useMemo(() => boundaryPath(boundary), [boundary]);
  const massBubbles = useMemo(() => bubbles.filter((bubble) => bubble.kind === "mass"), [bubbles]);
  const carveBubbles = useMemo(() => bubbles.filter((bubble) => bubble.kind === "carve"), [bubbles]);
  const links = useMemo(() => linksForBubbles(bubbles, params), [bubbles, params]);
  const fieldPath = useMemo(() => buildSignedFieldPath(bubbles, boundary, params), [bubbles, boundary, params]);

  useEffect(() => {
    function tick() {
      if (!useSimStore.getState().isPaused) {
        useSimStore.getState().step();
        setFrame((value) => (value + 1) % 100000);
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

  const pointFromEvent = (event: MouseEvent<SVGSVGElement> | PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * VIEWBOX.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEWBOX.height
    };
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragId.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    moveBubble(dragId.current, point.x, point.y);
  };

  const onPointerUp = () => {
    dragId.current = null;
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
          force graph / {boundary.shape} / seed {params.seed} / frame {frame}
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
          <path d={bPath} fill="none" stroke="#776f63" strokeDasharray="7 7" strokeWidth="2" />

          {visual.showLinks || patternMode === "network" ? (
            <g clipPath="url(#force-boundary-clip)">
              {links.map((link) => (
                <line key={`${link.a.id}-${link.b.id}`} x1={link.a.x} y1={link.a.y} x2={link.b.x} y2={link.b.y} stroke="#6d7480" strokeWidth="1.2" opacity={link.opacity * 0.82} />
              ))}
            </g>
          ) : null}

          {visual.showMergedShape || patternMode === "metaball" || patternMode === "carved" ? (
            <g clipPath="url(#force-boundary-clip)" data-signed-field-shape>
              <path d={fieldPath} fill="#050505" fillRule="nonzero" data-field-path />
              <g clipPath="url(#force-field-shape-clip)">{renderPattern(patternMode, massBubbles, links)}</g>
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
                    dragId.current = bubble.id;
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
                    dragId.current = bubble.id;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                />
              ))}
            </g>
          ) : null}

          {isPaused ? <text x={24} y={VIEWBOX.height - 24} fill="#776f63" fontSize="14">paused</text> : null}
        </svg>
      </div>
    </section>
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
    <circle
      data-bubble-id={bubble.id}
      cx={bubble.x}
      cy={bubble.y}
      r={bubble.r}
      fill={isCarve ? "rgba(255,255,255,0.46)" : "rgba(78,157,255,0.13)"}
      stroke={selected ? "#ffffff" : isCarve ? "#f2efe5" : bubble.fixed ? "#2f7fd2" : "#4e9dff"}
      strokeDasharray={bubble.fixed ? "6 4" : undefined}
      strokeWidth={selected ? 3 : 1.6}
      className="cursor-grab active:cursor-grabbing"
      onPointerDown={onPointerDown}
    />
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
