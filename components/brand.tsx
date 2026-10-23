import { ChartNoAxesColumnIncreasing } from "lucide-react";
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark">
        <ChartNoAxesColumnIncreasing size={23} strokeWidth={2} />
      </span>
      MacroMine
      <span className="brand-dot" />
    </span>
  );
}
