"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { formatMacro } from "@/lib/macros";
import { macroKeys, type Macros } from "@/lib/types";
export const macroLabels = {
  calories: "Calories",
  protein: "Protein",
  fiber: "Fiber",
  fat: "Fat",
};
export function MacroValues({
  values,
  prominent = false,
}: {
  values: Macros;
  prominent?: boolean;
}) {
  return (
    <div className={`macro-values ${prominent ? "prominent" : ""}`}>
      {macroKeys.map((key) => (
        <div key={key}>
          <span className="macro-label">{macroLabels[key]}</span>
          <span className="macro-number">
            {formatMacro(key, values[key])}
            <small>{key === "calories" ? "kcal" : "g"}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
export function MacroInputs({
  values,
  onChange,
}: {
  values: Macros;
  onChange: (values: Macros) => void;
}) {
  return (
    <div className="macro-inputs">
      {macroKeys.map((key) => (
        <label key={key}>
          {macroLabels[key]}{" "}
          <span className="quiet">{key === "calories" ? "kcal" : "g"}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="9999999"
            step="any"
            required
            value={Number.isNaN(values[key]) ? "" : values[key]}
            onChange={(e) =>
              onChange({
                ...values,
                [key]: e.target.value === "" ? NaN : Number(e.target.value),
              })
            }
          />
        </label>
      ))}
    </div>
  );
}
export function Sheet({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`sheet ${wide ? "sheet-wide" : ""}`}
      aria-labelledby="sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="sheet-header">
        <h2 id="sheet-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
