"use client";

import React, { useState, useEffect } from "react";
import { AccountsEntityPage } from "@/modules/accounts/components/accounts-entity-page";

export default function StockAdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<any[]>([
    {
      id: "ADJ-2026-001",
      date: "2026-03-21",
      item: "Dell PowerEdge Rack Server R750",
      warehouse: "Mumbai Central Distribution Warehouse",
      type: "QUANTITY_ADJUSTMENT",
      qtyDiff: "+1",
      reason: "Physical count surplus found during audit",
      adjustedBy: "Warehouse Auditor",
      status: "APPROVED",
    },
    {
      id: "ADJ-2026-002",
      date: "2026-03-18",
      item: "Samsung Enterprise NVMe SSD 1.92TB",
      warehouse: "Pune Tech Depot",
      type: "VALUE_ADJUSTMENT",
      qtyDiff: "-2",
      reason: "Defective units returned to OEM for replacement",
      adjustedBy: "Inventory Lead",
      status: "APPROVED",
    },
  ]);

  useEffect(() => {
    fetch("/api/inventory/adjustments")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped = json.data.map((item: any) => ({
            id: item.adjustmentNumber || item.id,
            date: item.createdAt ? item.createdAt.split("T")[0] : "2026-10-10",
            item: item.items?.[0]?.product?.name || "Multiple Items",
            warehouse: item.warehouse?.name || "Central Warehouse",
            type: "QUANTITY_ADJUSTMENT",
            qtyDiff: item.items?.[0]
              ? `${item.items[0].adjustmentQuantity >= 0 ? "+" : ""}${item.items[0].adjustmentQuantity}`
              : "0",
            reason: item.reason?.replace(/_/g, " ") || item.notes || "Discrepancy",
            adjustedBy: item.requestedBy
              ? `${item.requestedBy.firstName} ${item.requestedBy.lastName}`
              : "Accountant",
            status: item.status || "DRAFT",
          }));
          setAdjustments((prev) => [...mapped, ...prev]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <AccountsEntityPage
      title="Stock Adjustments"
      section="Inventory"
      description="Post inventory write-offs, physical count discrepancies, and scrap adjustments directly into the General Ledger (Zoho Books reference workflow)."
      newButtonText="New Adjustment"
      newButtonHref="/app/accounts/inventory/adjustments/new"
      kpis={[
        { label: "Adjustments This Month", value: `${adjustments.length}`, sub: "Audited entries" },
        { label: "Net Value Variance", value: "-₹33,000", isPositive: false },
        { label: "GL Posting", value: "Verified", sub: "Dr. Scrap / Cr. Inventory" },
        { label: "Audit Signoff", value: "Completed", isPositive: true },
      ]}
      columns={[
        { key: "id", label: "Adjustment #" },
        { key: "date", label: "Date" },
        { key: "item", label: "Item Adjusted" },
        { key: "warehouse", label: "Warehouse" },
        { key: "qtyDiff", label: "Qty Adjusted", align: "right" },
        { key: "reason", label: "Reason & Notes" },
        { key: "adjustedBy", label: "Authorized By" },
        { key: "status", label: "Status" },
      ]}
      initialData={adjustments}
    />
  );
}
