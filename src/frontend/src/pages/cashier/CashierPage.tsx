import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Coffee,
  LogOut,
  Minus,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  type Category,
  type MenuItem,
  type OrderEntry,
  OrderStatus,
  PaymentMethod,
} from "../../backend";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { ScrollArea } from "../../components/ui/scroll-area";
import { useActor } from "../../hooks/useActor";
import { useEmailAuth } from "../../hooks/useEmailAuth";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CartItem {
  item: MenuItem;
  qty: number;
  note: string;
}

interface OrderTab {
  id: string;
  label: string;
  cart: CartItem[];
  notes: string;
  payment: PaymentMethod;
  /** Set after placing the order */
  placedOrderId: bigint | null;
  placedOrderNumber: bigint | null;
  placedAt: number | null;
}

function createTab(index: number): OrderTab {
  return {
    id: crypto.randomUUID(),
    label: `Order ${index}`,
    cart: [],
    notes: "",
    payment: PaymentMethod.cash,
    placedOrderId: null,
    placedOrderNumber: null,
    placedAt: null,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  inprogress: "Preparing",
  done: "Ready",
  paid: "Completed",
};

function statusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "inprogress":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "done":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "paid":
      return "bg-muted/60 text-muted-foreground border-border";
    default:
      return "bg-muted/60 text-muted-foreground border-border";
  }
}

function fmtOrderNum(n: bigint) {
  return `#${n.toString().padStart(3, "0")}`;
}

// ─── Receipt Component ────────────────────────────────────────────────────────

interface ReceiptProps {
  order: OrderEntry;
  paymentMethod: PaymentMethod;
  onClose: () => void;
}

function ReceiptDialog({ order, paymentMethod, onClose }: ReceiptProps) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-ocid="cashier.receipt.dialog" className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Payment Received
          </DialogTitle>
        </DialogHeader>
        <div id="receipt-printable" className="space-y-3">
          <div className="text-center border-b border-border pb-3">
            <p className="font-bold text-lg">Delicious Cafe</p>
            <p className="text-xs text-muted-foreground">
              {new Date(Number(order.createdAt / 1_000_000n)).toLocaleString()}
            </p>
            <p className="text-sm font-semibold mt-1">
              {fmtOrderNum(order.orderNumber)}
            </p>
          </div>
          <ul className="space-y-1">
            {order.items.map((it) => (
              <li key={it.itemName} className="flex justify-between text-sm">
                <span>
                  {it.itemName} ×{it.quantity.toString()}
                </span>
                <span>${(it.unitPrice * Number(it.quantity)).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-border pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-primary">
              ${order.totalAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Payment</span>
            <span className="capitalize">{paymentMethod}</span>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              data-ocid="cashier.receipt.close_button"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              className="flex-1"
              data-ocid="cashier.receipt.print_button"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CashierPage() {
  const { actor } = useActor();
  const { logout } = useEmailAuth();
  const qc = useQueryClient();

  // ── Tab state ──
  const tabCounterRef = useRef(1);
  const [tabs, setTabs] = useState<OrderTab[]>(() => [createTab(1)]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  function updateTab(id: string, patch: Partial<OrderTab>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function addTab() {
    tabCounterRef.current += 1;
    const tab = createTab(tabCounterRef.current);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }

  function closeTab(id: string) {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    if (tab.cart.length > 0 && tab.placedOrderId === null) {
      if (!confirm("This order has items. Close anyway?")) return;
    }
    const remaining = tabs.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      tabCounterRef.current += 1;
      const fresh = createTab(tabCounterRef.current);
      setTabs([fresh]);
      setActiveTabId(fresh.id);
    } else {
      setTabs(remaining);
      if (activeTabId === id) {
        setActiveTabId(remaining[remaining.length - 1].id);
      }
    }
  }

  // ── Category filter ──
  const [selectedCat, setSelectedCat] = useState<string>("all");

  // ── Receipt / pay dialogs ──
  const [receiptData, setReceiptData] = useState<{
    order: OrderEntry;
    payment: PaymentMethod;
  } | null>(null);
  const [payDialogOrderId, setPayDialogOrderId] = useState<bigint | null>(null);
  const [payDialogMethod, setPayDialogMethod] = useState<PaymentMethod>(
    PaymentMethod.cash,
  );

  // ── Session tracking for active orders strip ──
  const sessionStartRef = useRef<number>(Date.now());
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());

  // ── Queries ──
  const { data: menuItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => actor!.getAllMenuItems(),
    enabled: !!actor,
    refetchInterval: 30000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => actor!.getAllCategories(),
    enabled: !!actor,
  });

  const { data: allOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ["cashier", "orders"],
    queryFn: () => actor!.getAllOrders(),
    enabled: !!actor,
    refetchInterval: 6000,
  });

  // Active orders for bottom strip: from this session, not cancelled, not paid
  const sessionOrders = allOrders.filter((o) => {
    const createdMs = Number(o.createdAt / 1_000_000n);
    return (
      createdMs >= sessionStartRef.current - 60000 &&
      !cancelledIds.has(o.id.toString()) &&
      o.status !== OrderStatus.paid
    );
  });

  // Live status for placed orders in tabs
  function getLiveOrder(orderId: bigint | null): OrderEntry | undefined {
    if (!orderId) return undefined;
    return allOrders.find((o) => o.id === orderId);
  }

  // ── Mutations ──
  const placeMut = useMutation({
    mutationFn: (tab: OrderTab) =>
      actor!.createOrder(
        tab.cart.map((c) => ({
          menuItemId: c.item.id,
          itemName: c.item.name,
          quantity: BigInt(c.qty),
          unitPrice: c.item.price,
        })),
        tab.payment,
        tab.cart
          .filter((c) => c.note.trim())
          .map((c) => `${c.item.name}: ${c.note}`)
          .join(" | ") +
          (tab.notes.trim()
            ? `${tab.cart.some((c) => c.note.trim()) ? " | " : ""}Order note: ${tab.notes}`
            : ""),
      ),
    onSuccess: async (orderId, tab) => {
      const orders = await actor!.getOrdersByStatus(OrderStatus.pending);
      const found = orders.find((o) => o.id === orderId);
      updateTab(tab.id, {
        placedOrderId: orderId,
        placedOrderNumber: found?.orderNumber ?? orderId,
        placedAt: Date.now(),
        cart: [],
        notes: "",
      });
      refetchOrders();
    },
  });

  const cancelMut = useMutation({
    mutationFn: async (orderId: bigint) => {
      await actor!.updateOrderNotes(orderId, "[CANCELLED]");
      await actor!.updateOrderStatus(orderId, OrderStatus.paid);
    },
    onSuccess: (_, orderId) => {
      setCancelledIds((prev) => new Set([...prev, orderId.toString()]));
      // Also clear from tabs
      setTabs((prev) =>
        prev.map((t) =>
          t.placedOrderId === orderId
            ? {
                ...t,
                placedOrderId: null,
                placedOrderNumber: null,
                placedAt: null,
              }
            : t,
        ),
      );
      refetchOrders();
    },
  });

  const markPaidMut = useMutation({
    mutationFn: async ({
      orderId,
      method,
    }: { orderId: bigint; method: PaymentMethod }) => {
      await actor!.updateOrderStatus(orderId, OrderStatus.paid);
      return { orderId, method };
    },
    onSuccess: ({ orderId, method }) => {
      const order = allOrders.find((o) => o.id === orderId);
      if (order) setReceiptData({ order, payment: method });
      qc.invalidateQueries({ queryKey: ["cashier", "orders"] });
      setPayDialogOrderId(null);
    },
  });

  // ── Cart helpers ──
  function setCart(tabId: string, updater: (prev: CartItem[]) => CartItem[]) {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, cart: updater(t.cart) } : t)),
    );
  }

  function addToCart(item: MenuItem) {
    if (!item.isAvailable || item.stockQuantity <= 0n) return;
    setCart(activeTab.id, (prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing)
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c,
        );
      return [...prev, { item, qty: 1, note: "" }];
    });
  }

  function updateQty(itemId: bigint, delta: number) {
    setCart(activeTab.id, (prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0),
    );
  }

  function removeItem(itemId: bigint) {
    setCart(activeTab.id, (prev) => prev.filter((c) => c.item.id !== itemId));
  }

  function setItemNote(itemId: bigint, note: string) {
    setCart(activeTab.id, (prev) =>
      prev.map((c) => (c.item.id === itemId ? { ...c, note } : c)),
    );
  }

  const visibleItems =
    selectedCat === "all"
      ? menuItems
      : menuItems.filter((i) => i.categoryId.toString() === selectedCat);

  const cartTotal = activeTab.cart.reduce(
    (sum, c) => sum + c.item.price * c.qty,
    0,
  );
  const cartItemCount = activeTab.cart.reduce((s, c) => s + c.qty, 0);

  const liveOrder = getLiveOrder(activeTab.placedOrderId);
  const canPlaceOrder =
    activeTab.cart.length > 0 &&
    !placeMut.isPending &&
    !activeTab.placedOrderId;

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      data-ocid="cashier.section"
    >
      {/* ── Header ── */}
      <header className="h-14 flex items-center px-4 border-b border-border bg-card shrink-0 z-10">
        <Coffee className="w-5 h-5 text-primary mr-2" />
        <span className="font-bold text-foreground tracking-tight">
          Cashier
        </span>
        <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">
          — Delicious Cafe
        </span>

        {/* Order tabs */}
        <div className="flex-1 flex items-center gap-1 mx-4 overflow-x-auto hide-scrollbar">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const live = getLiveOrder(tab.placedOrderId);
            const tabLabel = tab.placedOrderNumber
              ? fmtOrderNum(tab.placedOrderNumber)
              : tab.label;
            return (
              <button
                key={tab.id}
                type="button"
                data-ocid="cashier.order.tab"
                onClick={() => setActiveTabId(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
                }`}
              >
                <ShoppingCart className="w-3 h-3" />
                <span>{tabLabel}</span>
                {live && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(
                      live.status,
                    )}`}
                  >
                    {ORDER_STATUS_LABEL[live.status] ?? live.status}
                  </span>
                )}
                {tab.cart.length > 0 && !tab.placedOrderId && (
                  <span className="w-4 h-4 rounded-full bg-primary-foreground/20 text-[10px] flex items-center justify-center font-bold">
                    {tab.cart.reduce((s, c) => s + c.qty, 0)}
                  </span>
                )}
                {tabs.length > 1 && (
                  <button
                    type="button"
                    aria-label="Close tab"
                    data-ocid="cashier.order.close_button"
                    className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-black/20 ml-0.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </button>
            );
          })}
          <button
            type="button"
            data-ocid="cashier.new_order.button"
            onClick={addTab}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            title="New Order"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto shrink-0"
          data-ocid="cashier.logout.button"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {/* ── Main body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Menu + Active Orders */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Category Filter */}
          <div className="flex gap-2 px-3 py-2.5 overflow-x-auto shrink-0 border-b border-border bg-card hide-scrollbar">
            <button
              type="button"
              data-ocid="cashier.cat.all.tab"
              onClick={() => setSelectedCat("all")}
              className={`min-w-[48px] px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCat === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-accent"
              }`}
            >
              All
            </button>
            {categories.map((cat: Category) => (
              <button
                type="button"
                key={cat.id.toString()}
                data-ocid="cashier.cat.tab"
                onClick={() => setSelectedCat(cat.id.toString())}
                className={`min-w-[48px] px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCat === cat.id.toString()
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {visibleItems.length === 0 ? (
              <div
                data-ocid="cashier.items.empty_state"
                className="text-center text-muted-foreground py-16 text-sm"
              >
                No items available in this category.
              </div>
            ) : (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                data-ocid="cashier.items.list"
              >
                {visibleItems.map((item, i) => {
                  const unavailable =
                    !item.isAvailable || item.stockQuantity <= 0n;
                  const inCart = activeTab.cart.find(
                    (c) => c.item.id === item.id,
                  );
                  return (
                    <button
                      type="button"
                      key={item.id.toString()}
                      data-ocid={`cashier.item.${i + 1}`}
                      onClick={() => addToCart(item)}
                      disabled={unavailable || !!activeTab.placedOrderId}
                      className={`relative p-4 rounded-xl border text-left transition-all min-h-[90px] ${
                        unavailable || activeTab.placedOrderId
                          ? "opacity-40 cursor-not-allowed border-border bg-card"
                          : "border-border bg-card hover:border-primary hover:bg-accent active:scale-95 cursor-pointer"
                      } ${inCart ? "border-primary ring-1 ring-primary/50" : ""}`}
                    >
                      {inCart && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold shadow-sm">
                          {inCart.qty}
                        </span>
                      )}
                      <p className="font-semibold text-sm text-foreground leading-snug pr-6">
                        {item.name}
                      </p>
                      <p className="text-primary font-bold mt-2 text-base">
                        ${item.price.toFixed(2)}
                      </p>
                      {unavailable && (
                        <Badge
                          variant="secondary"
                          className="mt-1 text-xs px-1.5"
                        >
                          Out of Stock
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Orders Strip */}
          {sessionOrders.length > 0 && (
            <div
              className="border-t border-border bg-card/50 shrink-0"
              data-ocid="cashier.active-orders.section"
            >
              <div className="px-3 pt-2 pb-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Orders
                </p>
              </div>
              <div className="flex gap-2 px-3 pb-3 overflow-x-auto hide-scrollbar">
                {sessionOrders.map((order, i) => (
                  <div
                    key={order.id.toString()}
                    data-ocid={`cashier.active-order.item.${i + 1}`}
                    className="min-w-[180px] max-w-[200px] bg-card border border-border rounded-xl p-3 shrink-0"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-foreground">
                        {fmtOrderNum(order.orderNumber)}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColor(
                          order.status,
                        )}`}
                      >
                        {ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-1.5 line-clamp-2">
                      {order.items
                        .map((it) => `${it.itemName} ×${it.quantity}`)
                        .join(", ")}
                    </p>
                    <p className="text-sm font-bold text-primary mb-2">
                      ${order.totalAmount.toFixed(2)}
                    </p>
                    <div className="flex gap-1.5">
                      {order.status === OrderStatus.pending && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                          data-ocid={`cashier.active-order.cancel.${i + 1}`}
                          disabled={cancelMut.isPending}
                          onClick={() => cancelMut.mutate(order.id)}
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      )}
                      {order.status === OrderStatus.done && (
                        <Button
                          size="sm"
                          className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                          data-ocid={`cashier.active-order.pay.${i + 1}`}
                          onClick={() => {
                            setPayDialogOrderId(order.id);
                            setPayDialogMethod(PaymentMethod.cash);
                          }}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Cart Panel ── */}
        <div
          className="w-72 lg:w-80 border-l border-border bg-card flex flex-col shrink-0"
          data-ocid="cashier.cart.panel"
        >
          {/* Cart header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">
              {activeTab.placedOrderNumber
                ? fmtOrderNum(activeTab.placedOrderNumber)
                : activeTab.label}
            </span>
            {cartItemCount > 0 && !activeTab.placedOrderId && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
              </Badge>
            )}
            {liveOrder && (
              <span
                className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold border ${statusColor(
                  liveOrder.status,
                )}`}
              >
                {ORDER_STATUS_LABEL[liveOrder.status] ?? liveOrder.status}
              </span>
            )}
          </div>

          {/* Cart body */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {/* Placed order view */}
              {activeTab.placedOrderId && liveOrder ? (
                <div className="space-y-3">
                  <div className="text-center py-4">
                    <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-sm">
                      Order sent to kitchen!
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {fmtOrderNum(activeTab.placedOrderNumber!)}
                    </p>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {liveOrder.items.map((it) => (
                      <li
                        key={it.itemName}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-foreground">
                          {it.itemName} ×{it.quantity.toString()}
                        </span>
                        <span className="text-muted-foreground">
                          ${(it.unitPrice * Number(it.quantity)).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between font-bold pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">
                      ${liveOrder.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  {liveOrder.status === OrderStatus.pending && (
                    <Button
                      variant="outline"
                      className="w-full h-11 border-destructive/50 text-destructive hover:bg-destructive/10"
                      data-ocid="cashier.cart.cancel_button"
                      disabled={cancelMut.isPending}
                      onClick={() => cancelMut.mutate(liveOrder.id)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                  {liveOrder.status === OrderStatus.done && (
                    <Button
                      className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                      data-ocid="cashier.cart.pay_button"
                      onClick={() => {
                        setPayDialogOrderId(liveOrder.id);
                        setPayDialogMethod(PaymentMethod.cash);
                      }}
                    >
                      Mark as Paid
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground"
                    data-ocid="cashier.cart.new_order.button"
                    onClick={addTab}
                  >
                    + New Order Tab
                  </Button>
                </div>
              ) : activeTab.cart.length === 0 ? (
                <div
                  data-ocid="cashier.cart.empty_state"
                  className="text-center text-muted-foreground text-sm py-12"
                >
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Cart is empty.</p>
                  <p className="text-xs mt-1">Tap menu items to add.</p>
                </div>
              ) : (
                activeTab.cart.map((c, i) => (
                  <div
                    key={c.item.id.toString()}
                    data-ocid={`cashier.cart.item.${i + 1}`}
                    className="bg-secondary/50 rounded-lg p-2.5 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">
                          {c.item.name}
                        </p>
                        <p className="text-xs text-primary font-medium">
                          ${(c.item.price * c.qty).toFixed(2)}
                          <span className="text-muted-foreground font-normal ml-1">
                            (${c.item.price.toFixed(2)} each)
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        data-ocid={`cashier.cart.delete.${i + 1}`}
                        className="w-6 h-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        onClick={() => removeItem(c.item.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Qty row */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-card rounded-lg border border-border">
                        <button
                          type="button"
                          data-ocid={`cashier.cart.minus.${i + 1}`}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => updateQty(c.item.id, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">
                          {c.qty}
                        </span>
                        <button
                          type="button"
                          data-ocid={`cashier.cart.plus.${i + 1}`}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => updateQty(c.item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <Input
                        className="flex-1 h-8 text-xs"
                        placeholder="Item note..."
                        data-ocid={`cashier.cart.item_note.${i + 1}`}
                        value={c.note}
                        onChange={(e) => setItemNote(c.item.id, e.target.value)}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Cart footer */}
          {!activeTab.placedOrderId && (
            <div className="p-3 border-t border-border space-y-3 shrink-0">
              <Input
                data-ocid="cashier.notes.input"
                placeholder="Order note (e.g. Table 3)..."
                value={activeTab.notes}
                onChange={(e) =>
                  updateTab(activeTab.id, { notes: e.target.value })
                }
                className="text-sm h-9"
              />
              {/* Payment toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid="cashier.payment.cash.toggle"
                  onClick={() =>
                    updateTab(activeTab.id, { payment: PaymentMethod.cash })
                  }
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab.payment === PaymentMethod.cash
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-accent"
                  }`}
                >
                  💵 Cash
                </button>
                <button
                  type="button"
                  data-ocid="cashier.payment.card.toggle"
                  onClick={() =>
                    updateTab(activeTab.id, { payment: PaymentMethod.card })
                  }
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab.payment === PaymentMethod.card
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-accent"
                  }`}
                >
                  💳 Card
                </button>
              </div>
              {/* Total */}
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Total
                </span>
                <span className="text-2xl font-bold text-primary">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
              {/* Place Order */}
              <Button
                data-ocid="cashier.placeorder.primary_button"
                className="w-full h-12 text-base font-semibold"
                disabled={!canPlaceOrder}
                onClick={() => placeMut.mutate(activeTab)}
              >
                {placeMut.isPending ? "Placing..." : "Place Order"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Mark as Paid Dialog ── */}
      <Dialog
        open={!!payDialogOrderId}
        onOpenChange={(o) => !o && setPayDialogOrderId(null)}
      >
        <DialogContent data-ocid="cashier.pay.dialog">
          <DialogHeader>
            <DialogTitle>Mark Order as Paid</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select payment method:
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setPayDialogMethod(PaymentMethod.cash)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                payDialogMethod === PaymentMethod.cash
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-accent"
              }`}
            >
              💵 Cash
            </button>
            <button
              type="button"
              onClick={() => setPayDialogMethod(PaymentMethod.card)}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-colors ${
                payDialogMethod === PaymentMethod.card
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-accent"
              }`}
            >
              💳 Card
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              data-ocid="cashier.pay.cancel_button"
              onClick={() => setPayDialogOrderId(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              data-ocid="cashier.pay.confirm_button"
              disabled={markPaidMut.isPending}
              onClick={() => {
                if (payDialogOrderId)
                  markPaidMut.mutate({
                    orderId: payDialogOrderId,
                    method: payDialogMethod,
                  });
              }}
            >
              {markPaidMut.isPending ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Receipt Dialog ── */}
      {receiptData && (
        <ReceiptDialog
          order={receiptData.order}
          paymentMethod={receiptData.payment}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* Print styles */}
      <style>{`
        .hide-scrollbar { scrollbar-width: none; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        @media print {
          body > * { display: none !important; }
          #receipt-printable { display: block !important; }
          [data-radix-dialog-overlay] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
