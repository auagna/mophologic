"use client";

import { useMemo } from "react";
import { buildSignedFieldPath } from "@/lib/signedField";
import { useSimStore } from "@/store/useSimStore";
import type { Bubble } from "@/types";

const layouts = [
  { label: "Single module", transforms: [{ x: 150, y: 58, s: 0.2 }] },
  { label: "2 modules linear", transforms: [{ x: 92, y: 58, s: 0.17 }, { x: 204, y: 58, s: 0.17 }] },
  { label: "3 modules linear", transforms: [{ x: 58, y: 58, s: 0.14 }, { x: 150, y: 58, s: 0.14 }, { x: 242, y: 58, s: 0.14 }] },
  {
    label: "2 x 4 big table",
    transforms: Array.from({ length: 8 }, (_, index) => ({ x: 56 + (index % 4) * 62, y: 42 + Math.floor(index / 4) * 42, s: 0.092 }))
  },
  { label: "zigzag", transforms: [{ x: 54, y: 68, s: 0.13 }, { x: 104, y: 42, s: 0.13 }, { x: 154, y: 68, s: 0.13 }, { x: 204, y: 42, s: 0.13 }, { x: 254, y: 68, s: 0.13 }] }
];

export function ModulePreview() {
  const boundary = useSimStore((state) => state.boundary);
  const bubbles = useSimStore((state) => state.bubbles);
  const params = useSimStore((state) => state.params);
  const mass = bubbles.filter((bubble) => bubble.kind === "mass");
  const carve = bubbles.filter((bubble) => bubble.kind === "carve");
  const fieldPath = useMemo(() => buildSignedFieldPath(bubbles, boundary, params, { step: 7 }), [bubbles, boundary, params]);

  return (
    <aside className="lab-scrollbar max-h-[calc(100vh-5rem)] overflow-auto border border-lab-border bg-lab-panel shadow-panel">
      <div className="grid gap-3 p-3">
        <div className="flex items-center justify-between border-b border-lab-border pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-normal text-lab-text">Module Preview</h2>
          <span className="text-[11px] text-lab-muted">{mass.length} mass / {carve.length} carve</span>
        </div>
        {layouts.map((layout, index) => (
          <section key={layout.label} className="border border-lab-border bg-[#0b0d10]">
            <div className="flex items-center justify-between border-b border-lab-border px-2 py-1.5">
              <span className="text-[11px] text-lab-text">{layout.label}</span>
              <span className="text-[10px] text-lab-muted">{layout.transforms.length} mod</span>
            </div>
            <svg viewBox="0 0 300 112" className="h-[112px] w-full bg-[#11100d]">
              <line x1="20" y1="56" x2="280" y2="56" stroke="#2b2d31" strokeWidth="1" />
              <line x1="150" y1="18" x2="150" y2="96" stroke="#2b2d31" strokeWidth="1" />
              {layout.transforms.map((transform, transformIndex) => (
                <ModuleGlyph key={transformIndex} transform={transform} mass={mass} carve={carve} fieldPath={fieldPath} />
              ))}
            </svg>
          </section>
        ))}
      </div>
    </aside>
  );
}

function ModuleGlyph({
  transform,
  mass,
  carve,
  fieldPath
}: {
  transform: { x: number; y: number; s: number };
  mass: Bubble[];
  carve: Bubble[];
  fieldPath: string;
}) {
  return (
    <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.s}) translate(-450 -310)`}>
      <path d={fieldPath} fill="#050505" stroke="#050505" strokeLinejoin="round" strokeWidth="2" />
      <g opacity="0.4">
        {mass.slice(0, 12).map((bubble) => (
          <circle key={`m-${bubble.id}`} cx={bubble.x} cy={bubble.y} r={bubble.r} fill="none" stroke="#f4f1e8" strokeWidth="4" />
        ))}
        {carve.map((bubble) => (
          <circle key={`c-${bubble.id}`} cx={bubble.x} cy={bubble.y} r={bubble.r} fill="none" stroke="#f4f1e8" strokeWidth="4" />
        ))}
      </g>
    </g>
  );
}
