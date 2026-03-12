import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Clock,
  Coffee,
  LogOut,
  Minus,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
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
import { useActor } from "../../hooks/useActor";
import { useEmailAuth } from "../../hooks/useEmailAuth";

type CartItem = { item: MenuItem; qty: number };

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  inprogress: "Preparing",
  done: "Ready",
  paid: "Completed",
};

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-500/20 text-yellow-400";
    case "inprogress":
      return "bg-blue-500/20 text-blue-400";
    case "done":
      return "bg-green-500/20 text-green-400";
    case "paid":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

interface ReceiptData {
  order: OrderEntry;
  paymentMethod: PaymentMethod;
}

export default function CashierPage() {
  const { actor } = useActor();
  const { logout } = useEmailAuth();
  const qc = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>(PaymentMethod.cash);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastOrderNum, setLastOrderNum] = useState<bigint | null>(null);
  const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set());
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [payOrderId, setPayOrderId] = useState<bigint | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>(PaymentMethod.cash);
  const sessionStartRef = useRef<number>(Date.now());

  const { data: items = [] } = useQuery({
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
    refetchInterval: 8000,
  });

  // Only show orders from this session (created after page load) and not completed
  const sessionOrders = allOrders.filter((o) => {
    const createdMs = Number(o.createdAt / 1_000_000n);
    return (
      createdMs >= sessionStartRef.current - 60000 && // within 1min before page load
      !cancelledIds.has(o.id.toString()) &&
      o.status !== OrderStatus.paid
    );
  });

  const orderMut = useMutation({
    mutationFn: () =>
      actor!.createOrder(
        cart.map((c) => ({
          menuItemId: c.item.id,
          itemName: c.item.name,
          quantity: BigInt(c.qty),
          unitPrice: c.item.price,
        })),
        payment,
        notes,
      ),
    onSuccess: async (id) => {
      const orders = await actor!.getOrdersByStatus(OrderStatus.pending);
      const found = orders.find((o) => o.id === id);
      setLastOrderNum(found?.orderNumber ?? id);
      setCart([]);
      setNotes("");
      setConfirmOpen(true);
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
      if (order) setReceiptData({ order, paymentMethod: method });
      qc.invalidateQueries({ queryKey: ["cashier", "orders"] });
      setPayOrderId(null);
    },
  });

  const visibleItems =
    selectedCat === "all"
      ? items
      : items.filter((i) => i.categoryId.toString() === selectedCat);

  const addToCart = (item: MenuItem) => {
    if (!item.isAvailable || item.stockQuantity <= 0n) return;
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing)
        return prev.map((c) =>
          c.item.id === item.id ? { ...c, qty: c.qty + 1 } : c,
        );
      return [...prev, { item, qty: 1 }];
    });
  };

  const updateQty = (itemId: bigint, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0),
    );
  };

  const total = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);

  return (
    <div className="min-h-screen flex flex-col" data-ocid="cashier.section">
      <header className="h-14 flex items-center px-4 border-b border-border bg-card shrink-0">
        <Coffee className="w-5 h-5 text-primary mr-2" />
        <span className="font-bold text-foreground">Cashier</span>
        <span className="ml-2 text-xs text-muted-foreground">
          — Delicious Cafe
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          data-ocid="cashier.logout.button"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Menu + Active Orders */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Category Filter */}
          <div className="flex gap-2 p-3 overflow-x-auto shrink-0 border-b border-border bg-card">
            <button
              type="button"
              data-ocid="cashier.cat.all.tab"
              onClick={() => setSelectedCat("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
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
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCat === cat.id.toString()
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-3">
            {visibleItems.length === 0 ? (
              <div
                data-ocid="cashier.items.empty_state"
                className="text-center text-muted-foreground py-12 text-sm"
              >
                No items available.
              </div>
            ) : (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
                data-ocid="cashier.items.list"
              >
                {visibleItems.map((item, i) => {
                  const unavailable =
                    !item.isAvailable || item.stockQuantity <= 0n;
                  const inCart = cart.find((c) => c.item.id === item.id);
                  return (
                    <button
                      type="button"
                      key={item.id.toString()}
                      data-ocid={`cashier.item.${i + 1}`}
                      onClick={() => addToCart(item)}
                      disabled={unavailable}
                      className={`relative p-4 rounded-xl border text-left transition-all ${
                        unavailable
                          ? "opacity-40 cursor-not-allowed border-border bg-card"
                          : "border-border bg-card hover:border-primary hover:bg-accent active:scale-95"
                      } ${inCart ? "border-primary ring-1 ring-primary" : ""}`}
                    >
                      <p className="font-semibold text-sm text-foreground leading-tight">
                        {item.name}
                      </p>
                      <p className="text-primary font-bold mt-2">
                        ${item.price.toFixed(2)}
                      </p>
                      {unavailable && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          Unavailable
                        </Badge>
                      )}
                      {inCart && (
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                          {inCart.qty}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Orders Section */}
          {sessionOrders.length > 0 && (
            <div
              className="border-t border-border p-3 bg-card/50"
              data-ocid="cashier.active-orders.section"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Active Orders
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {sessionOrders.map((order, i) => (
                  <div
                    key={order.id.toString()}
                    data-ocid={`cashier.active-order.item.${i + 1}`}
                    className="min-w-[180px] bg-card border border-border rounded-lg p-2.5 shrink-0"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">
                        #{order.orderNumber.toString()}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(order.status)}`}
                      >
                        {ORDER_STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {order.items
                        .map((it) => `${it.itemName} x${it.quantity}`)
                        .join(", ")}
                    </p>
                    <p className="text-xs font-semibold text-primary mb-2">
                      ${order.totalAmount.toFixed(2)}
                    </p>
                    <div className="flex gap-1">
                      {order.status === OrderStatus.pending && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-xs border-destructive text-destructive hover:bg-destructive/10"
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
                          className="flex-1 h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                          data-ocid={`cashier.active-order.pay.${i + 1}`}
                          onClick={() => {
                            setPayOrderId(order.id);
                            setPayMethod(PaymentMethod.cash);
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

        {/* Cart Panel */}
        <div
          className="w-72 lg:w-80 border-l border-border bg-card flex flex-col shrink-0"
          data-ocid="cashier.cart.panel"
        >
          <div className="p-3 border-b border-border flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Order</span>
            {cart.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {cart.reduce((s, c) => s + c.qty, 0)} items
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <p
                data-ocid="cashier.cart.empty_state"
                className="text-center text-muted-foreground text-sm py-8"
              >
                Cart is empty.
                <br />
                Tap items to add.
              </p>
            ) : (
              cart.map((c, i) => (
                <div
                  key={c.item.id.toString()}
                  data-ocid={`cashier.cart.item.${i + 1}`}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {c.item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${(c.item.price * c.qty).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      data-ocid={`cashier.cart.minus.${i + 1}`}
                      onClick={() => updateQty(c.item.id, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-5 text-center text-xs font-bold">
                      {c.qty}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      data-ocid={`cashier.cart.plus.${i + 1}`}
                      onClick={() => updateQty(c.item.id, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-destructive"
                      data-ocid={`cashier.cart.delete.${i + 1}`}
                      onClick={() =>
                        setCart((prev) =>
                          prev.filter((x) => x.item.id !== c.item.id),
                        )
                      }
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-border space-y-3">
            <Input
              data-ocid="cashier.notes.input"
              placeholder="Order notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm h-9"
            />
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="cashier.payment.cash.toggle"
                onClick={() => setPayment(PaymentMethod.cash)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  payment === PaymentMethod.cash
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                data-ocid="cashier.payment.card.toggle"
                onClick={() => setPayment(PaymentMethod.card)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  payment === PaymentMethod.card
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                Card
              </button>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Total</span>
              <span className="text-primary text-lg">${total.toFixed(2)}</span>
            </div>
            <Button
              data-ocid="cashier.placeorder.primary_button"
              className="w-full h-11 text-base"
              disabled={cart.length === 0 || orderMut.isPending}
              onClick={() => orderMut.mutate()}
            >
              {orderMut.isPending ? "Placing..." : "Place Order"}
            </Button>
          </div>
        </div>
      </div>

      {/* Order Placed Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          data-ocid="cashier.success.dialog"
          className="text-center"
        >
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-3">
              <CheckCircle className="w-12 h-12 text-green-400" />
              Order Placed!
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Order{" "}
            <span className="text-primary font-bold">
              #{lastOrderNum?.toString()}
            </span>{" "}
            has been sent to the kitchen.
          </p>
          <Button
            data-ocid="cashier.success.close_button"
            onClick={() => setConfirmOpen(false)}
            className="w-full mt-2"
          >
            New Order
          </Button>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog
        open={!!payOrderId}
        onOpenChange={(o) => !o && setPayOrderId(null)}
      >
        <DialogContent data-ocid="cashier.pay.dialog">
          <DialogHeader>
            <DialogTitle>Mark Order as Paid</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select payment method:
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPayMethod(PaymentMethod.cash)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                payMethod === PaymentMethod.cash
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPayMethod(PaymentMethod.card)}
              className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                payMethod === PaymentMethod.card
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              Card
            </button>
          </div>
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              data-ocid="cashier.pay.cancel_button"
              onClick={() => setPayOrderId(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              data-ocid="cashier.pay.confirm_button"
              disabled={markPaidMut.isPending}
              onClick={() => {
                if (payOrderId)
                  markPaidMut.mutate({
                    orderId: payOrderId,
                    method: payMethod,
                  });
              }}
            >
              {markPaidMut.isPending ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog
        open={!!receiptData}
        onOpenChange={(o) => !o && setReceiptData(null)}
      >
        <DialogContent data-ocid="cashier.receipt.dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Payment Received
            </DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div id="receipt-printable" className="space-y-3">
              <div className="text-center border-b border-border pb-3">
                <p className="font-bold text-lg">Delicious Cafe</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(
                    Number(receiptData.order.createdAt / 1_000_000n),
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Order #{receiptData.order.orderNumber.toString()}
                </p>
                <ul className="space-y-1">
                  {receiptData.order.items.map((item) => (
                    <li
                      key={item.itemName}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.itemName} x{item.quantity.toString()}
                      </span>
                      <span>
                        ${(item.unitPrice * Number(item.quantity)).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">
                  ${receiptData.order.totalAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Payment</span>
                <span className="capitalize">{receiptData.paymentMethod}</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  data-ocid="cashier.receipt.close_button"
                  onClick={() => setReceiptData(null)}
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
          )}
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #receipt-printable { display: block !important; }
          [data-radix-dialog-overlay] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
