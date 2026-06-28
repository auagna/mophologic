"use client";

import { useMemo } from "react";
import { buildBubbleShape } from "@/lib/generateBubbleShape";
import { toSvgPoint, VIEWBOX } from "@/lib/geometry";
import { presets, useFormLabStore } from "@/store/useFormLabStore";
import type { Bubble, PresetName } from "@/types/formLab";
import { Button } from "./ui/Button";

type ModulePlacement = {
  x: number;
  y: number;
  rotate?: number;
};

const arrangements: { title: string; modules: ModulePlacement[]; scale: number }[] = [
  { title: "2-3인 테이블", modules: [{ x: 105, y: 55 }], scale: 0.18 },
  { title: "4인 테이블", modules: [{ x: 42, y: 62 }, { x: 162, y: 62 }], scale: 0.16 },
  { title: "6인 테이블", modules: [{ x: 18, y: 65 }, { x: 115, y: 65 }, { x: 212, y: 65 }], scale: 0.14 },
  {
    title: "Big Table",
    modules: Array.from({ length: 8 }, (_, index) => ({ x: 26 + (index % 4) * 64, y: 35 + Math.floor(index / 4) * 70 })),
    scale: 0.09
  },
  { title: "L-shape", modules: [{ x: 55, y: 38 }, { x: 55, y: 110 }, { x: 145, y: 110 }], scale: 0.13 },
  { title: "Zigzag", modules: [{ x: 25, y: 48 }, { x: 92, y: 88 }, { x: 160, y: 48 }, { x: 228, y: 88 }], scale: 0.1 }
];

export function AssemblyPreview() {
  const state = useFormLabStore();
  const bubbleShape = useMemo(() => buildBubbleShape(state), [state]);
  const applyPreset = useFormLabStore((store) => store.applyPreset);

  return (
    <aside className="lab-scrollbar overflow-auto border border-lab-border bg-lab-panel shadow-panel lg:max-h-[calc(100vh-82px)]">
      <section className="grid gap-2 border-b border-lab-border p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase leading-none">Assemble Preview</h2>
          <span className="text-[10px] text-lab-muted">
            {state.widthMm} x {state.depthMm}
          </span>
        </div>
        <div className="grid gap-2">
          {arrangements.map((arrangement) => (
            <PreviewItem
              key={arrangement.title}
              title={arrangement.title}
              guidePath={bubbleShape.boundaryPath}
              massBubbles={bubbleShape.massBubbles}
              carveBubbles={bubbleShape.carveBubbles}
              modules={arrangement.modules}
              scale={arrangement.scale}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-2 p-3">
        <h2 className="text-[11px] font-semibold uppercase leading-none">Presets</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(presets) as PresetName[]).map((name) => (
            <Button key={name} onClick={() => applyPreset(name)} className="justify-start">
              {name}
            </Button>
          ))}
        </div>
      </section>
    </aside>
  );
}

function PreviewItem({
  title,
  guidePath,
  massBubbles,
  carveBubbles,
  modules,
  scale
}: {
  title: string;
  guidePath: string;
  massBubbles: Bubble[];
  carveBubbles: Bubble[];
  modules: ModulePlacement[];
  scale: number;
}) {
  const safeId = title.replace(/[^a-zA-Z0-9]/g, "-");
  return (
    <article className="border border-lab-border bg-[#0b0d10]">
      <div className="flex items-center justify-between border-b border-lab-border px-2 py-1.5">
        <h3 className="text-[11px] font-medium leading-none">{title}</h3>
        <span className="text-[10px] leading-none text-lab-muted">{modules.length} mod</span>
      </div>
      <svg viewBox="0 0 300 170" className="block h-[122px] w-full bg-[#12100d]">
        <defs>
          <clipPath id={`preview-boundary-${safeId}`}>
            <path d={guidePath} />
          </clipPath>
          <filter id={`preview-metaball-${safeId}`} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -10" result="threshold" />
          </filter>
        </defs>
        <rect width="300" height="170" fill="#16130f" />
        <path d="M 24 86 H 276 M 150 18 V 152" stroke="#f2efe5" strokeWidth="0.7" opacity="0.15" />
        {modules.map((module, index) => (
          <g key={index} transform={`translate(${module.x} ${module.y}) rotate(${module.rotate ?? 0}) scale(${scale}) translate(${-VIEWBOX.cx} ${-VIEWBOX.cy})`}>
            <path d={guidePath} fill="none" stroke="#f2efe5" strokeDasharray="8 10" strokeWidth="7" opacity="0.25" />
            <g clipPath={`url(#preview-boundary-${safeId})`} filter={`url(#preview-metaball-${safeId})`}>
              {massBubbles.map((bubble) => {
                const point = toSvgPoint(bubble);
                return <circle key={bubble.id} cx={point.x} cy={point.y} r={bubble.r * Math.min(VIEWBOX.width, VIEWBOX.height)} fill="#050505" />;
              })}
            </g>
            {carveBubbles.map((bubble) => {
              const point = toSvgPoint(bubble);
              return <circle key={bubble.id} cx={point.x} cy={point.y} r={bubble.r * Math.min(VIEWBOX.width, VIEWBOX.height)} fill="#16130f" stroke="#f2efe5" strokeWidth="2" opacity="0.88" />;
            })}
          </g>
        ))}
      </svg>
    </article>
  );
}
