/**
 * Core Business Logic: Inventory Reservation and Allocation
 * 
 * Formula:
 * available = item.quantity - SUM(allocated_qty of request_items in 'pending' status for the same item)
 * allocated_qty = MIN(requested_qty, MAX(available, 0))
 * shortfall_qty = requested_qty - allocated_qty
 */

export interface AllocationResult {
  requestedQty: number;
  availableStock: number;
  allocatedQty: number;
  shortfallQty: number;
}

/**
 * Computes available stock for an item given its physical stock and the sum of pending allocated quantities.
 */
export function computeAvailableStock(
  physicalStock: number,
  pendingAllocatedSum: number
): number {
  return Math.max(0, physicalStock - Math.max(0, pendingAllocatedSum));
}

/**
 * Computes item allocation given requested quantity and current available stock.
 */
export function computeItemAllocation(
  requestedQty: number,
  availableStock: number
): AllocationResult {
  const reqQty = Math.max(0, requestedQty);
  const avail = Math.max(0, availableStock);

  const allocatedQty = Math.min(reqQty, avail);
  const shortfallQty = reqQty - allocatedQty;

  return {
    requestedQty: reqQty,
    availableStock: avail,
    allocatedQty,
    shortfallQty,
  };
}
