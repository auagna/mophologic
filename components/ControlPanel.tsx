"use client";

import { Pause, Play, RefreshCw, Shuffle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Slider } from "@/components/ui/Slider";
import { useSimStore } from "@/store/useSimStore";
import type { Boundary, PatternMode, SimParams } from "@/types";

const boundaryOptions: Array<{ value: Boundary["shape"]; label: string }> = [
  { value: "circle", label: "Circle" },
  { value: "ellipse", label: "Ellipse" },
  { value: "rectangle", label: "Rect" },
  { value: "capsule", label: "Capsule" }
];

const patternOptions: Array<{ value: PatternMode; label: string }> = [
  { value: "metaball", label: "Metaball" },
  { value: "network", label: "Network" },
  { value: "cellular", label: "Cellular" },
  { value: "ring", label: "Ring" },
  { value: "bubble", label: "Bubble" },
  { value: "carved", label: "Carved" }
];

const generationOptions: Array<{ value: SimParams["generationMode"]; label: string }> = [
  { value: "bubble", label: "Bubble" },
  { value: "axis", label: "Axis" },
  { value: "hybrid", label: "Hybrid" }
];

export function ControlPanel() {
  const boundary = useSimStore((state) => state.boundary);
  const params = useSimStore((state) => state.params);
  const isPaused = useSimStore((state) => state.isPaused);
  const selectedId = useSimStore((state) => state.selectedId);
  const patternMode = useSimStore((state) => state.patternMode);
  const visual = useSimStore((state) => state.visual);
  const setBoundaryShape = useSimStore((state) => state.setBoundaryShape);
  const updateBoundary = useSimStore((state) => state.updateBoundary);
  const updateParam = useSimStore((state) => state.updateParam);
  const randomizeSeed = useSimStore((state) => state.randomizeSeed);
  const resetSimulation = useSimStore((state) => state.resetSimulation);
  const setPaused = useSimStore((state) => state.setPaused);
  const deleteSelected = useSimStore((state) => state.deleteSelected);
  const setPatternMode = useSimStore((state) => state.setPatternMode);
  const toggleVisual = useSimStore((state) => state.toggleVisual);

  return (
    <aside className="lab-scrollbar max-h-[calc(100vh-5rem)] overflow-auto border border-lab-border bg-lab-panel shadow-panel">
      <div className="grid gap-5 p-3">
        <section className="grid gap-3">
          <PanelTitle>Simulation</PanelTitle>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => setPaused(!isPaused)}>
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
              {isPaused ? "Play" : "Pause"}
            </Button>
            <Button onClick={resetSimulation}>
              <RefreshCw size={14} />
              Reset
            </Button>
            <Button onClick={randomizeSeed}>
              <Shuffle size={14} />
              Randomize
            </Button>
            <Button variant="danger" onClick={deleteSelected} disabled={!selectedId}>
              <Trash2 size={14} />
              Delete
            </Button>
          </div>
          <label className="grid gap-1.5 text-[11px] text-lab-muted">
            Seed
            <input
              type="number"
              value={params.seed}
              onChange={(event) => updateParam("seed", Number(event.target.value))}
              className="h-8 border border-lab-border bg-[#0b0d10] px-2 text-[12px] tabular-nums text-lab-text outline-none focus:border-lab-blue"
            />
          </label>
          <SegmentedControl value={params.generationMode} options={generationOptions} onChange={(value) => updateParam("generationMode", value)} className="grid-cols-3" />
        </section>

        <section className="grid gap-3">
          <PanelTitle>Boundary</PanelTitle>
          <SegmentedControl value={boundary.shape} options={boundaryOptions} onChange={setBoundaryShape} className="grid-cols-4" />
          <Slider label="Width" value={boundary.width} min={240} max={760} step={10} suffix=" px" onChange={(value) => updateBoundary("width", value)} />
          <Slider label="Height" value={boundary.height} min={220} max={540} step={10} suffix=" px" onChange={(value) => updateBoundary("height", value)} />
          <Slider label="Padding" value={boundary.padding} min={0} max={70} step={1} suffix=" px" onChange={(value) => updateBoundary("padding", value)} />
        </section>

        <section className="grid gap-3">
          <PanelTitle>+ Bubbles</PanelTitle>
          <Slider label="+ Count" value={params.bubbleCount} min={0} max={70} step={1} onChange={(value) => updateParam("bubbleCount", value)} />
          <Slider label="+ Min Radius" value={params.minRadius} min={8} max={70} step={1} suffix=" px" onChange={(value) => updateParam("minRadius", Math.min(value, params.maxRadius))} />
          <Slider label="+ Max Radius" value={params.maxRadius} min={12} max={110} step={1} suffix=" px" onChange={(value) => updateParam("maxRadius", Math.max(value, params.minRadius))} />
        </section>

        <section className="grid gap-3">
          <PanelTitle>- Bubbles</PanelTitle>
          <Slider label="- Count" value={params.carveCount} min={0} max={24} step={1} onChange={(value) => updateParam("carveCount", value)} />
          <Slider label="- Min Radius" value={params.carveMinRadius} min={8} max={80} step={1} suffix=" px" onChange={(value) => updateParam("carveMinRadius", Math.min(value, params.carveMaxRadius))} />
          <Slider label="- Max Radius" value={params.carveMaxRadius} min={12} max={128} step={1} suffix=" px" onChange={(value) => updateParam("carveMaxRadius", Math.max(value, params.carveMinRadius))} />
        </section>

        <section className="grid gap-3">
          <PanelTitle>Axis</PanelTitle>
          <Slider label="Axis Count" value={params.axisCount} min={1} max={8} step={1} onChange={(value) => updateParam("axisCount", value)} />
          <Slider label="Axis Length" value={params.axisLength} min={80} max={520} step={10} suffix=" px" onChange={(value) => updateParam("axisLength", value)} />
          <Slider label="Axis Angle" value={params.axisAngle} min={-90} max={90} step={1} suffix="°" onChange={(value) => updateParam("axisAngle", value)} />
          <Slider label="Axis Thickness" value={params.axisThickness} min={12} max={120} step={2} suffix=" px" onChange={(value) => updateParam("axisThickness", value)} />
        </section>

        <section className="grid gap-3">
          <PanelTitle>Forces</PanelTitle>
          <Slider label="Attraction" value={Math.round(params.attractionStrength * 1000)} min={0} max={40} step={1} onChange={(value) => updateParam("attractionStrength", value / 1000)} />
          <Slider label="Repulsion" value={Math.round(params.repulsionStrength * 1000)} min={10} max={180} step={1} onChange={(value) => updateParam("repulsionStrength", value / 1000)} />
          <Slider label="Damping" value={Math.round(params.damping * 100)} min={70} max={98} step={1} suffix="%" onChange={(value) => updateParam("damping", value / 100)} />
          <Slider label="Link Distance" value={params.linkDistance} min={10} max={120} step={1} suffix=" px" onChange={(value) => updateParam("linkDistance", value)} />
          <Slider label="Boundary Force" value={Math.round(params.boundaryForce * 100)} min={10} max={100} step={1} suffix="%" onChange={(value) => updateParam("boundaryForce", value / 100)} />
        </section>

        <section className="grid gap-3">
          <PanelTitle>Visual</PanelTitle>
          <Slider label="Merge Blur" value={params.mergeBlur} min={2} max={30} step={1} suffix=" px" onChange={(value) => updateParam("mergeBlur", value)} />
          <div className="grid grid-cols-2 gap-2">
            <ColorControl label="Bubble Surface" value={params.bubbleFillColor} onChange={(value) => updateParam("bubbleFillColor", value)} />
            <ColorControl label="Axis Surface" value={params.axisFillColor} onChange={(value) => updateParam("axisFillColor", value)} />
          </div>
          <SegmentedControl value={patternMode} options={patternOptions} onChange={setPatternMode} className="grid-cols-2" />
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={visual.showMergedShape} onClick={() => toggleVisual("showMergedShape")}>
              Merged
            </Toggle>
            <Toggle active={visual.showBubbles} onClick={() => toggleVisual("showBubbles")}>
              Bubbles
            </Toggle>
            <Toggle active={visual.showLinks} onClick={() => toggleVisual("showLinks")}>
              Links
            </Toggle>
            <Toggle active={visual.showCarveBubbles} onClick={() => toggleVisual("showCarveBubbles")}>
              Carve
            </Toggle>
          </div>
        </section>
      </div>
    </aside>
  );
}

function PanelTitle({ children }: { children: string }) {
  return <h2 className="border-b border-lab-border pb-2 text-[11px] font-semibold uppercase tracking-normal text-lab-text">{children}</h2>;
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5 text-[11px] text-lab-muted">
      {label}
      <span className="flex h-8 items-center gap-2 border border-lab-border bg-[#0b0d10] px-2">
        <input
          type="color"
          aria-label={label}
          value={value}
          onInput={(event) => onChange(event.currentTarget.value)}
          onChange={(event) => onChange(event.currentTarget.value)}
          className="h-5 w-8 cursor-pointer border-0 bg-transparent p-0"
        />
        <span className="min-w-0 flex-1 truncate text-[10px] uppercase tabular-nums text-lab-text">{value}</span>
      </span>
    </label>
  );
}

function Toggle({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <Button active={active} onClick={onClick} variant="ghost">
      {children}
    </Button>
  );
}
