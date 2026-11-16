import { createContext, useContext } from 'react';

/** Per-table state the cards read without every board passing it down. */
export interface TableInfo {
  /** Changes on every new deal. */
  dealId: number;
  /** True while a fresh deal is being laid out: cards mounting now are dealt in. */
  dealing: boolean;
  /** Cards the hint is pointing at. */
  hinted: ReadonlySet<string>;
}

export const TableContext = createContext<TableInfo>({ dealId: 0, dealing: false, hinted: new Set() });
export const useTableInfo = () => useContext(TableContext);

/** Dealing order within one deal, so cards land one after another. */
const order = { dealId: -1, next: 0 };
export function nextDealSlot(dealId: number): number {
  if (order.dealId !== dealId) {
    order.dealId = dealId;
    order.next = 0;
  }
  return order.next++;
}
