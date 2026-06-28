"use client";

import { PointerEvent, useCallback, useMemo, useRef, useState } from "react";
import { buildBubbleShape } from "@/lib/generateBubbleShape";
import { generatePattern } from "@/lib/generatePattern";
import { fromSvgPoint, toSvgPoint, VIEWBOX } from "@/lib/geometry";
import { useFormLabStore } from "@/store/useFormLabStore";
import type { Bubble } from "@/types/formLab";

type DragTarget = {
  id: string;
  kind: Bubble["kind"];
} | null;

export function FormCanvas() {
  const state = useFormLabStore();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  const bubbleShape = useMemo(() => buildBubbleShape(state), [state]);
  const pattern = useMemo(() => generatePattern(state), [state.seed, state.patternType, state.patternDensity, state.patternScale, state.patternStrokeWidth]);

  const pointFromEvent = useCallback((event: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return fromSvgPoint({
      x: ((event.clientX - rect.left) / rect.width) * VIEWBOX.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEWBOX.height
    });
  }, []);

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragTarget) return;
    const point = pointFromEvent(event);
    if (!point) return;
    if (dragTarget.kind === "carve") {
      state.updateCarveBubble(dragTarget.id, point.x, point.y);
    } else {
      state.updateBubble(dragTarget.id, point.x, point.y);
    }
  };

  return (
    <section className="flex min-h-[520px] flex-col border border-lab-border bg-lab-panel shadow-panel lg:min-h-0">
      <div className="flex min-h-10 items-center justify-between border-b border-lab-border px-3">
        <div className="text-[11px] uppercase text-lab-muted">
          area-contained bubble generator / {state.boundaryShape} / {state.widthMm} x {state.depthMm} mm
        </div>
        <div className="text-[11px] tabular-nums text-lab-muted">
          seed {state.seed} · {state.bubbles.length} bubbles · {state.carveBubbles.length} carve
        </div>
      </div>
      <div className="grid flex-1 place-items-center p-3">
        <svg
          ref={svgRef}
          data-form-lab-canvas
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="h-full max-h-[72vh] min-h-[430px] w-full touch-none border border-[#d3cfc4] bg-lab-canvas"
          role="img"
          aria-label="Area-contained bubble generated FORM LAB SVG canvas"
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragTarget(null)}
          onPointerLeave={() => setDragTarget(null)}
        >
          <defs>
            <clipPath id="form-lab-clip">
              <path d={bubbleShape.shapePath} />
            </clipPath>
            <mask id="form-lab-carve-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={VIEWBOX.width} height={VIEWBOX.height}>
              <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="black" />
              <path d={bubbleShape.shapePath} fill="white" />
              {bubbleShape.carveBubbles.map((bubble) => {
                const point = toSvgPoint(bubble);
                return <circle key={bubble.id} cx={point.x} cy={point.y} r={bubble.r * Math.min(VIEWBOX.width, VIEWBOX.height)} fill="black" />;
              })}
            </mask>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 H 0 V 32" fill="none" stroke="#d7d2c5" strokeWidth="0.8" />
            </pattern>
          </defs>

          <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="#f2efe5" />
          {state.showGrid ? <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="url(#grid)" opacity="0.45" /> : null}
          {state.showBoundary ? <path d={bubbleShape.boundaryPath} fill="none" stroke="#7f776a" strokeDasharray="8 8" strokeWidth="2" opacity="0.72" /> : null}

          {state.showBubbles ? (
            <g opacity="0.85">
              {bubbleShape.matterBubbles.map((bubble) => {
                const point = toSvgPoint(bubble);
                return (
                  <circle
                    key={bubble.id}
                    cx={point.x}
                    cy={point.y}
                    r={bubble.r * Math.min(VIEWBOX.width, VIEWBOX.height)}
                    fill="rgba(78,157,255,0.1)"
                    stroke={bubble.stuck ? "#2f7fd2" : "#4e9dff"}
                    strokeDasharray={bubble.stuck ? "6 4" : undefined}
                    strokeWidth="2"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setDragTarget({ id: bubble.id, kind: "matter" });
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                  />
                );
              })}
              {bubbleShape.carveBubbles.map((bubble) => {
                const point = toSvgPoint(bubble);
                return (
                  <circle
                    key={bubble.id}
                    cx={point.x}
                    cy={point.y}
                    r={bubble.r * Math.min(VIEWBOX.width, VIEWBOX.height)}
                    fill="rgba(255,255,255,0.3)"
                    stroke="#f2efe5"
                    strokeWidth="2"
                    className="cursor-grab active:cursor-grabbing"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      setDragTarget({ id: bubble.id, kind: "carve" });
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                  />
                );
              })}
            </g>
          ) : null}

          <g mask="url(#form-lab-carve-mask)">
            <path d={bubbleShape.shapePath} fill={state.mode === "graphic" ? "#050505" : "#070707"} stroke="#050505" strokeWidth="2.5" />
            {state.showPattern ? (
              <g clipPath="url(#form-lab-clip)" opacity={state.mode === "table" ? 0.7 : 0.95}>
                {pattern.map((element, index) =>
                  element.kind === "line" ? (
                    <path key={index} d={element.d} fill="none" stroke="#f5f2e9" strokeWidth={element.strokeWidth ?? state.patternStrokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity="0.88" />
                  ) : (
                    <circle key={index} cx={element.cx} cy={element.cy} r={element.r} fill={element.fill ?? "none"} stroke="#f5f2e9" strokeWidth={element.strokeWidth ?? state.patternStrokeWidth} opacity="0.88" />
                  )
                )}
              </g>
            ) : null}
          </g>
        </svg>
      </div>
    </section>
  );
}
