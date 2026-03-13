import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Download,
  Search,
  ShoppingBag,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import type { OrderEntry } from "../../backend";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { useActor } from "../../hooks/useActor";
import { loadCafeSettings } from "./CafeSettings";

type QuickFilter = "today" | "week" | "month" | "custom";

function getQuickRange(filter: QuickFilter): { start: string; end: string } {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  if (filter === "today") {
    const s = fmt(today);
    return { start: s, end: s };
  }
  if (filter === "week") {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return { start: fmt(start), end: fmt(today) };
  }
  if (filter === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: fmt(start), end: fmt(today) };
  }
  return { start: fmt(today), end: fmt(today) };
}

function fmtOrderNum(n: bigint) {
  return `#${n.toString().padStart(3, "0")}`;
}

function exportCSV(orders: OrderEntry[]) {
  const rows = [
    ["Order #", "Date", "Items", "Total", "Payment", "Status"],
    ...orders.map((o) => [
      fmtOrderNum(o.orderNumber),
      new Date(Number(o.createdAt / 1_000_000n)).toLocaleString(),
      o.items.map((i) => `${i.itemName}x${i.quantity}`).join(" | "),
      o.totalAmount.toFixed(2),
      o.paymentMethod,
      o.status,
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sales-report-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function OrderDetailDialog({
  order,
  onClose,
}: { order: OrderEntry; onClose: () => void }) {
  const cafe = loadCafeSettings();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        data-ocid="reports.order_detail.dialog"
        className="max-w-sm"
      >
        <DialogHeader>
          <DialogTitle>Order {fmtOrderNum(order.orderNumber)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-center border-b border-border pb-3">
            <p className="font-bold text-base">{cafe.name || "Cafe"}</p>
            {cafe.address && (
              <p className="text-xs text-muted-foreground">{cafe.address}</p>
            )}
            {cafe.phone && (
              <p className="text-xs text-muted-foreground">{cafe.phone}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(Number(order.createdAt / 1_000_000n)).toLocaleString()}
            </p>
          </div>
          <div className="space-y-1.5">
            {order.items.map((it) => (
              <div key={it.itemName} className="flex justify-between text-sm">
                <span>
                  {it.itemName}{" "}
                  <span className="text-muted-foreground">
                    x{it.quantity.toString()}
                  </span>
                </span>
                <span className="font-medium">
                  ${(it.unitPrice * Number(it.quantity)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary">
              ${order.totalAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Payment</span>
            <span className="capitalize">{order.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Status</span>
            <span className="capitalize">{order.status}</span>
          </div>
          {order.notes && (
            <div className="text-xs text-muted-foreground border-t border-border pt-2">
              <span className="font-medium">Notes: </span>
              {order.notes}
            </div>
          )}
          <Button
            variant="outline"
            className="w-full mt-2"
            data-ocid="reports.order_detail.close_button"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SalesReports() {
  const { actor } = useActor();
  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [applied, setApplied] = useState({ start: todayStr, end: todayStr });
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("today");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderEntry | null>(null);

  const applyQuickFilter = (filter: QuickFilter) => {
    setActiveFilter(filter);
    if (filter !== "custom") {
      const range = getQuickRange(filter);
      setStartDate(range.start);
      setEndDate(range.end);
      setApplied(range);
    }
  };

  const toNano = (dateStr: string, end = false) => {
    const d = new Date(dateStr);
    if (end) d.setHours(23, 59, 59, 999);
    else d.setHours(0, 0, 0, 0);
    return BigInt(d.getTime()) * 1_000_000n;
  };

  const startNano = toNano(applied.start);
  const endNano = toNano(applied.end, true);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", "range", applied.start, applied.end],
    queryFn: () => actor!.getOrdersInTimeRange(startNano, endNano),
    enabled: !!actor,
  });

  const { data: revenue = 0 } = useQuery({
    queryKey: ["revenue", "range", applied.start, applied.end],
    queryFn: () => actor!.getTotalRevenueInTimeRange(startNano, endNano),
    enabled: !!actor,
  });

  const { data: topItems = [] } = useQuery({
    queryKey: ["topItems", "range", applied.start, applied.end],
    queryFn: () => actor!.getTopSellingItems(startNano, endNano, 10n),
    enabled: !!actor,
  });

  const avg = orders.length > 0 ? revenue / orders.length : 0;

  const filteredOrders = search.trim()
    ? orders.filter((o) => {
        const q = search.toLowerCase();
        const numMatch =
          fmtOrderNum(o.orderNumber).toLowerCase().includes(q) ||
          o.orderNumber.toString().includes(q);
        const itemMatch = o.items.some((i) =>
          i.itemName.toLowerCase().includes(q),
        );
        return numMatch || itemMatch;
      })
    : orders;

  const quickFilters: { id: QuickFilter; label: string }[] = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-5" data-ocid="reports.section">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div
            className="flex gap-2 flex-wrap"
            data-ocid="reports.quickfilter.tab"
          >
            {quickFilters.map((f) => (
              <button
                key={f.id}
                type="button"
                data-ocid={`reports.${f.id}.tab`}
                onClick={() => applyQuickFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {activeFilter === "custom" && (
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-xs text-muted-foreground mb-1">From</p>
                <Input
                  id="reports-start-date"
                  data-ocid="reports.start.input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <Input
                  id="reports-end-date"
                  data-ocid="reports.end.input"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button
                data-ocid="reports.apply.button"
                onClick={() => setApplied({ start: startDate, end: endDate })}
              >
                Apply
              </Button>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="reports.search_input"
              placeholder="Search by order # or item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-primary">
              ${revenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <ShoppingBag className="w-3.5 h-3.5" />
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Avg. Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">${avg.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length === 0 ? (
              <p
                className="text-muted-foreground text-sm"
                data-ocid="reports.topitems.empty_state"
              >
                No data for this period.
              </p>
            ) : (
              <div className="space-y-2">
                {topItems.map((item) => (
                  <div
                    key={item.name}
                    data-ocid="reports.topitem.item"
                    className="flex justify-between text-sm"
                  >
                    <span>{item.name}</span>
                    <span className="text-primary font-semibold">
                      {item.totalQuantitySold.toString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Order History</CardTitle>
            {filteredOrders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                data-ocid="reports.csv.button"
                onClick={() => exportCSV(filteredOrders)}
                className="h-7 text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                CSV
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p
                data-ocid="reports.orders.loading_state"
                className="text-muted-foreground text-sm"
              >
                Loading...
              </p>
            ) : filteredOrders.length === 0 ? (
              <p
                data-ocid="reports.orders.empty_state"
                className="text-muted-foreground text-sm"
              >
                {search
                  ? "No orders match your search."
                  : "No orders in this period."}
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {filteredOrders
                  .slice()
                  .reverse()
                  .map((order, i) => (
                    <button
                      type="button"
                      key={order.id.toString()}
                      data-ocid={`reports.order.${i + 1}`}
                      className="w-full flex justify-between text-sm border-b border-border pb-2 cursor-pointer hover:bg-accent/50 rounded px-1 py-1 transition-colors text-left"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div>
                        <span className="font-medium">
                          #{order.orderNumber.toString().padStart(3, "0")}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(
                            Number(order.createdAt / 1_000_000n),
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-primary">
                          ${order.totalAmount.toFixed(2)}
                        </span>
                        <span className="ml-2 text-xs capitalize text-muted-foreground">
                          {order.paymentMethod}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedOrder && (
        <OrderDetailDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
