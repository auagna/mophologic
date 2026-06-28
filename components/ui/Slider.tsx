"use client";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
  onChange: (value: number) => void;
};

export function Slider({ label, value, min, max, step = 1, suffix, hint, onChange }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between gap-2 text-[11px] text-lab-muted">
        <span>{label}</span>
        <span className="tabular-nums text-lab-text">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-lab-border accent-lab-blue"
        style={{
          background: `linear-gradient(90deg, #4e9dff ${percent}%, #2a2f36 ${percent}%)`
        }}
      />
      {hint ? <span className="text-[10px] leading-tight text-lab-muted/70">{hint}</span> : null}
    </label>
  );
}
