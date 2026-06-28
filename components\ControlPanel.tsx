"use client";

import { Dice5, RotateCcw } from "lucide-react";
import { useFormLabStore } from "@/store/useFormLabStore";
import type { BoundaryShape, ConnectionPointCount, ConnectionPointType, Symmetry, TangentRule } from "@/types/formLab";
import { Button } from "./ui/Button";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Slider } from "./ui/Slider";

const boundaryOptions: { value: BoundaryShape; label: string }[] = [
  { value: "rectangle", label: "Rectangle" },
  { value: "square", label: "Square" },
  { value: "circle", label: "정원 / Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "capsule", label: "Capsule" },
  { value: "roundedRect", label: "Rounded Rect" },
  { value: "freeform", label: "Freeform" }
];

const tangentOptions: { value: TangentRule; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "capsule", label: "Capsule" },
  { value: "flat", label: "Flat" },
  { value: "point", label: "Point" },
  { value: "blob", label: "Blob" },
  { value: "stem", label: "Stem" }
];

const symmetryOptions: { value: Symmetry; label: string }[] = [
  { value: "none", label: "None" },
  { value: "x", label: "X" },
  { value: "y", label: "Y" },
  { value: "radial", label: "Radial" }
];

export function ControlPanel() {
  const state = useFormLabStore();
  const dimensionLocked = state.boundaryShape === "circle" || state.boundaryShape === "square";

  return (
    <aside className="lab-scrollbar overflow-auto border border-lab-border bg-lab-panel shadow-panel lg:max-h-[calc(100vh-82px)]">
      <PanelSection title="Boundary Shape">
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
        <Button onClick={() => {
          state.updateParam("widthMm", 700);
          state.updateParam("depthMm", 700);
        }} className="w-full">
          <RotateCcw size={13} />
          Fit to Canvas
        </Button>
      </PanelSection>

      <PanelSection title="Form Generation">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <NumberField label="Seed" value={state.seed} onChange={(value) => state.updateParam("seed", value)} />
          <Button onClick={state.randomizeSeed} title="Randomize seed" aria-label="Randomize seed" className="self-end">
            <Dice5 size={14} />
          </Button>
        </div>
        <Slider label="Density" value={state.density} min={0} max={100} onChange={(value) => state.updateParam("density", value)} />
        <Slider label="Roundness" value={state.roundness} min={0} max={100} onChange={(value) => state.updateParam("roundness", value)} />
        <Slider label="Connection" value={state.connection} min={0} max={100} onChange={(value) => state.updateParam("connection", value)} />
        <Slider label="Organic Noise" value={state.organicNoise} min={0} max={100} onChange={(value) => state.updateParam("organicNoise", value)} />
        <Slider label="Concave / Convex" value={state.concaveAmount} min={-100} max={100} hint="음푹  -  볼록" onChange={(value) => state.updateParam("concaveAmount", value)} />
        <Slider label="Neck Width" value={state.neckWidth} min={0} max={100} onChange={(value) => state.updateParam("neckWidth", value)} />
      </PanelSection>

      <PanelSection title="Tangent Rule">
        <SegmentedControl value={state.tangentRule} options={tangentOptions} onChange={state.setTangentRule} className="grid-cols-3" />
      </PanelSection>

      <PanelSection title="Symmetry">
        <SegmentedControl value={state.symmetry} options={symmetryOptions} onChange={state.setSymmetry} />
      </PanelSection>

      <PanelSection title="Connection Points">
        <div className="grid grid-cols-4 gap-1.5">
          {([4, 6, 8, 12] as ConnectionPointCount[]).map((count) => (
            <Button key={count} active={state.connectionPointCount === count} onClick={() => state.setConnectionPointCount(count)}>
              {count}
            </Button>
          ))}
        </div>
        <SegmentedControl
          value={state.connectionPointType}
          options={(["male", "female", "universal"] as ConnectionPointType[]).map((value) => ({ value, label: value }))}
          onChange={state.setConnectionPointType}
        />
        <label className="flex items-center justify-between gap-3 text-[11px] text-lab-muted">
          Show connection points
          <input type="checkbox" checked={state.showControlPoints} onChange={(event) => state.updateParam("showControlPoints", event.target.checked)} className="h-4 w-4 accent-lab-blue" />
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
