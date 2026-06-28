"use client";

import { clsx } from "clsx";

type Option<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string>({ value, options, onChange, className }: SegmentedControlProps<T>) {
  return (
    <div className={clsx("grid rounded border border-lab-border bg-[#0b0d10] p-0.5", className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            "h-7 rounded-sm px-2 text-[10px] font-semibold uppercase leading-none tracking-normal text-lab-muted transition hover:text-lab-text",
            value === option.value && "bg-lab-blue text-[#07101d] shadow-sm"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
