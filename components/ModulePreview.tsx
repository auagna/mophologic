"use client";

import { useMemo } from "react";
import { VIEWBOX } from "@/lib/boundary";
import { axisNodesForAxes } from "@/lib/forces";
import { buildSignedFieldPath } from "@/lib/signedField";
import { useSimStore } from "@/store/useSimStore";

export function ModulePreview() {
  const boundary = useSimStore((state) => state.boundary);
  const bubbles = useSimStore((state) => state.bubbles);
  const axes = useSimStore((state) => state.axes);
  const params = useSimStore((state) => state.params);
  const mass = bubbles.filter((bubble) => bubble.kind === "mass");
  const carve = bubbles.filter((bubble) => bubble.kind === "carve");
  const axisNodes = axisNodesForAxes(axes);
  const fieldPath = useMemo(() => buildSignedFieldPath(bubbles, axes, boundary, params, { step: 8 }), [bubbles, axes, boundary, params]);
  const bubbleFieldPath = useMemo(() => buildSignedFieldPath(bubbles, [], boundary, params, { step: 8 }), [bubbles, boundary, params]);
  const axisFieldPath = useMemo(() => buildSignedFieldPath(carve, axes, boundary, params, { step: 8 }), [carve, axes, boundary, params]);
  const columns = Math.max(1, params.moduleColumns);
  const rows = Math.max(1, params.moduleRows);

  return (
    <aside className="lab-scrollbar max-h-[calc(100vh-5rem)] overflow-auto border border-lab-border bg-lab-panel shadow-panel">
      <div className="grid gap-3 p-3">
        <div className="flex items-center justify-between border-b border-lab-border pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-normal text-lab-text">Module Split</h2>
          <span className="text-[11px] text-lab-muted">
            {columns} x {rows} / {columns * rows} parts
          </span>
        </div>

        <section className="border border-lab-border bg-[#0b0d10]">
          <div className="flex items-center justify-between border-b border-lab-border px-2 py-1.5">
            <span className="text-[11px] text-lab-text">Table surface division</span>
            <span className="text-[10px] text-lab-muted">
              {mass.length} + / {axes.length} axis / {carve.length} -
            </span>
          </div>
          <svg viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`} className="aspect-[1.45] w-full bg-[#11100d]" data-module-split-preview>
            <defs>
              <clipPath id="module-split-field-clip">
                <path d={fieldPath} />
              </clipPath>
            </defs>
            <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="#11100d" />
            <line x1="70" y1={VIEWBOX.height / 2} x2={VIEWBOX.width - 70} y2={VIEWBOX.height / 2} stroke="#2b2d31" strokeWidth="2" />
            <line x1={VIEWBOX.width / 2} y1="70" x2={VIEWBOX.width / 2} y2={VIEWBOX.height - 70} stroke="#2b2d31" strokeWidth="2" />

            {params.surfaceMode === "merge" ? (
              <path d={fieldPath} fill={params.bubbleFillColor} stroke={params.bubbleFillColor} strokeLinejoin="round" strokeWidth="2" />
            ) : (
              <>
                {axes.length > 0 ? <path d={axisFieldPath} fill={params.axisFillColor} stroke={params.axisFillColor} strokeLinejoin="round" strokeWidth="2" /> : null}
                <path d={bubbleFieldPath} fill={params.bubbleFillColor} stroke={params.bubbleFillColor} strokeLinejoin="round" strokeWidth="2" />
              </>
            )}

            <g clipPath="url(#module-split-field-clip)" data-module-split-lines>
              {Array.from({ length: columns - 1 }, (_, index) => {
                const x = ((index + 1) / columns) * VIEWBOX.width;
                return <line key={`col-${index}`} x1={x} y1="0" x2={x} y2={VIEWBOX.height} stroke="#f4f1e8" strokeWidth="5" opacity="0.78" />;
              })}
              {Array.from({ length: rows - 1 }, (_, index) => {
                const y = ((index + 1) / rows) * VIEWBOX.height;
                return <line key={`row-${index}`} x1="0" y1={y} x2={VIEWBOX.width} y2={y} stroke="#f4f1e8" strokeWidth="5" opacity="0.78" />;
              })}
            </g>

            <g opacity="0.34">
              {axes.map((axis) => (
                <line key={axis.id} x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} stroke="#f4f1e8" strokeLinecap="round" strokeWidth={Math.max(4, axis.thickness * 0.12)} />
              ))}
              {axisNodes.map((node) => (
                <circle key={node.id} cx={node.x} cy={node.y} r={node.r} fill="none" stroke="#f4f1e8" strokeWidth="4" />
              ))}
            </g>
          </svg>
        </section>
      </div>
    </aside>
  );
}
