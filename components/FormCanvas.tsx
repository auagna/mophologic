"use client";

import { LockKeyhole } from "lucide-react";
import { MouseEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { boundaryPath, clampPointToBoundary, fromSvgPoint, toSvgPoint, VIEWBOX } from "@/lib/geometry";
import { generatePattern } from "@/lib/generatePattern";
import { connectionPointsForShape, generateOrganicShapePath } from "@/lib/generateShape";
import { useFormLabStore } from "@/store/useFormLabStore";

export function FormCanvas() {
  const state = useFormLabStore();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [draggingPointId, setDraggingPointId] = useState<string | null>(null);

  const shapePath = useMemo(() => generateOrganicShapePath(state), [state]);
  const guidePath = useMemo(() => boundaryPath(state.boundaryShape), [state.boundaryShape]);
  const pattern = useMemo(() => generatePattern(state), [state.seed, state.patternType, state.patternDensity, state.patternScale, state.patternStrokeWidth]);
  const connectionPoints = useMemo(() => connectionPointsForShape(state), [state.connectionPointCount, state.boundaryShape, state.connectionPointType]);

  const pointFromEvent = useCallback((event: MouseEvent<SVGSVGElement> | PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return fromSvgPoint({
      x: ((event.clientX - rect.left) / rect.width) * VIEWBOX.width,
      y: ((event.clientY - rect.top) / rect.height) * VIEWBOX.height
    });
  }, []);

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!draggingPointId) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const clamped = clampPointToBoundary(point, state.boundaryShape);
    state.updateControlPoint(draggingPointId, clamped.x, clamped.y);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selectedPointId) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        state.deleteControlPoint(selectedPointId);
        setSelectedPointId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPointId, state]);

  return (
    <section className="flex min-h-[520px] flex-col border border-lab-border bg-lab-panel shadow-panel lg:min-h-0">
      <div className="flex min-h-10 items-center justify-between border-b border-lab-border px-3">
        <div className="text-[11px] uppercase text-lab-muted">
          {state.boundaryShape} / {state.widthMm} x {state.depthMm} mm
        </div>
        <div className="text-[11px] tabular-nums text-lab-muted">seed {state.seed}</div>
      </div>
      <div className="grid flex-1 place-items-center p-3">
        <svg
          ref={svgRef}
          data-form-lab-canvas
          viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
          className="h-full max-h-[72vh] min-h-[430px] w-full touch-none border border-[#d3cfc4] bg-lab-canvas"
          role="img"
          aria-label="Generated FORM LAB SVG canvas"
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDraggingPointId(null)}
          onPointerLeave={() => setDraggingPointId(null)}
          onDoubleClick={(event) => {
            const point = pointFromEvent(event);
            if (!point) return;
            const clamped = clampPointToBoundary(point, state.boundaryShape);
            state.addControlPoint(clamped.x, clamped.y);
          }}
        >
          <defs>
            <clipPath id="form-lab-clip">
              <path d={shapePath} />
            </clipPath>
            <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 H 0 V 32" fill="none" stroke="#d7d2c5" strokeWidth="0.8" />
            </pattern>
          </defs>

          <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="#f2efe5" />
          {state.showGrid ? <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="url(#grid)" opacity="0.45" /> : null}
          {state.showBoundary ? <path d={guidePath} fill="none" stroke="#7f776a" strokeDasharray="8 8" strokeWidth="2" opacity="0.72" /> : null}

          <path d={shapePath} fill="#050505" stroke="#050505" strokeWidth="2.5" />

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

          {state.showControlPoints ? (
            <g>
              {connectionPoints.map((point) => {
                const svgPoint = toSvgPoint(point);
                return (
                  <g key={point.id} transform={`translate(${svgPoint.x} ${svgPoint.y}) rotate(${(point.angle * 180) / Math.PI})`}>
                    <path d={point.type === "female" ? "M -10 0 H 10" : point.type === "male" ? "M -8 -5 L 0 0 L -8 5 M 0 0 H 10" : "M -8 0 H 8 M 0 -8 V 8"} stroke="#4e9dff" strokeWidth="3" strokeLinecap="round" />
                  </g>
                );
              })}
            </g>
          ) : null}

          {state.showControlPoints ? (
            <g>
              {state.controlPoints.map((point) => {
                const svgPoint = toSvgPoint(point);
                const selected = point.id === selectedPointId;
                return (
                  <g key={point.id}>
                    <circle
                      cx={svgPoint.x}
                      cy={svgPoint.y}
                      r={selected ? 8 : 6}
                      fill={point.locked ? "#f2efe5" : "#ffffff"}
                      stroke={selected ? "#4e9dff" : "#050505"}
                      strokeWidth={point.locked ? 3 : 2}
                      strokeDasharray={point.locked ? "2 3" : undefined}
                      className="cursor-grab active:cursor-grabbing"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        setSelectedPointId(point.id);
                        if (event.shiftKey) {
                          state.toggleLockPoint(point.id);
                          return;
                        }
                        setDraggingPointId(point.id);
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                    />
                    {point.locked ? <LockKeyhole x={svgPoint.x - 5} y={svgPoint.y - 19} width={10} height={10} color="#050505" strokeWidth={2.4} /> : null}
                  </g>
                );
              })}
            </g>
          ) : null}
        </svg>
      </div>
    </section>
  );
}
