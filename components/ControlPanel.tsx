"use client";

import { Dice5, RotateCcw } from "lucide-react";
import { useFormLabStore } from "@/store/useFormLabStore";
import type { BoundaryShape } from "@/types/formLab";
import { Button } from "./ui/Button";
import { Slider } from "./ui/Slider";

const boundaryOptions: { value: BoundaryShape; label: string }[] = [
  { value: "circle", label: "정원 / Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "rectangle", label: "Rectangle" },
  { value: "square", label: "Square" },
  { value: "capsule", label: "Capsule" },
  { value: "freeform", label: "Custom Area" }
];

export function ControlPanel() {
  const state = useFormLabStore();
  const dimensionLocked = state.boundaryShape === "circle" || state.boundaryShape === "square";

  return (
    <aside className="lab-scrollbar overflow-auto border border-lab-border bg-lab-panel shadow-panel lg:max-h-[calc(100vh-82px)]">
      <PanelSection title="Boundary">
        <div className="grid grid-cols-2 gap-1.5">
          {boundaryOptions.map((option) => (
            <Button key={option.value} active={state.boundaryShape === option.value} onClick={() => state.setBoundaryShape(option.value)} className="justify-start">
              {option.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Width mm" value={state.widthMm} onChange={(value) => state.updateParam("widthMm", value)} />
          <NumberField label="Depth mm" value={state.depthMm} disabled={dimensionLocked} onChange={(value) => state.updateParam("depthMm", value)} />
        </div>
        <Slider label="Padding" value={state.padding} min={0} max={90} suffix=" mm" onChange={(value) => state.updateParam("padding", value)} />
        <Button
          onClick={() => {
            state.updateParam("widthMm", 700);
            state.updateParam("depthMm", 700);
            state.updateParam("padding", 34);
          }}
          className="w-full"
        >
          <RotateCcw size={13} />
          Fit Boundary
        </Button>
      </PanelSection>

      <PanelSection title="Bubble">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <NumberField label="Seed" value={state.seed} onChange={(value) => state.updateParam("seed", value)} />
          <Button onClick={state.randomizeSeed} title="Randomize seed" aria-label="Randomize seed" className="self-end">
            <Dice5 size={14} />
          </Button>
        </div>
        <Slider label="Count" value={state.bubbleCount} min={4} max={90} onChange={(value) => state.updateParam("bubbleCount", value)} />
        <Slider label="Min Radius" value={state.minRadius} min={12} max={120} suffix=" mm" onChange={(value) => state.updateParam("minRadius", value)} />
        <Slider label="Max Radius" value={state.maxRadius} min={20} max={180} suffix=" mm" onChange={(value) => state.updateParam("maxRadius", value)} />
        <Slider label="Size Variation" value={state.sizeVariation} min={0} max={100} onChange={(value) => state.updateParam("sizeVariation", value)} />
      </PanelSection>

      <PanelSection title="Behavior">
        <Slider label="Attraction" value={state.attraction} min={0} max={100} onChange={(value) => state.updateParam("attraction", value)} />
        <Slider label="Repulsion" value={state.repulsion} min={0} max={100} onChange={(value) => state.updateParam("repulsion", value)} />
        <Slider label="Merge Distance" value={state.mergeDistance} min={0} max={120} suffix=" mm" onChange={(value) => state.updateParam("mergeDistance", value)} />
        <Slider label="Boundary Stick" value={state.boundaryStick} min={0} max={100} onChange={(value) => state.updateParam("boundaryStick", value)} />
        <Button onClick={state.regenerateBubbles} className="w-full">
          <RotateCcw size={13} />
          Regenerate Bubbles
        </Button>
      </PanelSection>

      <PanelSection title="Carve / Concave">
        <Slider label="Carve Bubble Count" value={state.carveBubbleCount} min={0} max={24} onChange={(value) => state.updateParam("carveBubbleCount", value)} />
        <Slider label="Carve Radius" value={state.carveRadius} min={10} max={150} suffix=" mm" onChange={(value) => state.updateParam("carveRadius", value)} />
        <Slider label="Carve Depth" value={state.carveDepth} min={0} max={100} hint="subtract bubbles create inward dents" onChange={(value) => state.updateParam("carveDepth", value)} />
        <label className="flex items-center justify-between gap-3 text-[11px] text-lab-muted">
          Edge Carve Only
          <input type="checkbox" checked={state.edgeCarveOnly} onChange={(event) => state.updateParam("edgeCarveOnly", event.target.checked)} className="h-4 w-4 accent-lab-blue" />
        </label>
      </PanelSection>

      <PanelSection title="Output">
        <label className="flex items-center justify-between gap-3 text-[11px] text-lab-muted">
          Show Generated Bubbles
          <input type="checkbox" checked={state.showBubbles} onChange={(event) => state.updateParam("showBubbles", event.target.checked)} className="h-4 w-4 accent-lab-blue" />
        </label>
        <label className="flex items-center justify-between gap-3 text-[11px] text-lab-muted">
          Show Boundary
          <input type="checkbox" checked={state.showBoundary} onChange={(event) => state.updateParam("showBoundary", event.target.checked)} className="h-4 w-4 accent-lab-blue" />
        </label>
      </PanelSection>
    </aside>
  );
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-b border-lab-border p-3 last:border-b-0">
      <h2 className="text-[11px] font-semibold uppercase leading-none text-lab-text">{title}</h2>
      {children}
    </section>
  );
}

function NumberField({ label, value, disabled, onChange }: { label: string; value: number; disabled?: boolean; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-[10px] uppercase text-lab-muted">
      {label}
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-8 w-full border border-lab-border bg-[#0b0d10] px-2 text-[12px] text-lab-text outline-none transition focus:border-lab-blue disabled:opacity-55"
      />
    </label>
  );
}
