import type { Stamp as StampName } from "@/lib/types";

export function Stamp({ name }: { name: StampName }) {
  if (name === "VETO" || name === "ALLOW") {
    return <span className="stamp" data-kind={name}>{name}</span>;
  }
  return <span className="plain">{name}</span>;
}

export function price(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 100)}¢`;
}

export function signed(value: number): string {
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}
