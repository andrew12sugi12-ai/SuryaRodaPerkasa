// How a product is sorted into the Bicycle vs Sparepart inventory reports.
//
// Rule (agreed with the business): a product that is attached as a component
// (part A / B) of a bike ALWAYS belongs to the Bicycle report and must never
// appear in the Sparepart report — the company doesn't assemble bikes, the
// toke does, so the parts are tracked under bicycles. An assembled-bike product
// (one with its own bill of materials) and anything tagged Category = Sepeda
// also count as bicycle items. Everything else is a sparepart.

type ScopeProduct = {
  category?: string;
  components: { length: number };
  usedInBikes?: { length: number };
};

/** True when the product is used as a part of at least one bike. */
export function isBikeComponent(p: ScopeProduct): boolean {
  return (p.usedInBikes?.length ?? 0) > 0;
}

/** True when the product is a finished bike built from a bill of materials. */
export function isAssembledBike(p: ScopeProduct): boolean {
  return p.components.length > 0;
}

/** Belongs to the Bicycle (Sepeda) inventory report. */
export function isBicycleItem(p: ScopeProduct): boolean {
  return isBikeComponent(p) || isAssembledBike(p) || p.category === "BICYCLE";
}

/** Belongs to the Sparepart inventory report. Never a bike component. */
export function isSparepartItem(p: ScopeProduct): boolean {
  return !isBicycleItem(p);
}
