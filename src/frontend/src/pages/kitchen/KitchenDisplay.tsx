import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Coffee, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type OrderEntry, OrderStatus } from "../../backend";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useActor } from "../../hooks/useActor";
import { useEmailAuth } from "../../hooks/useEmailAuth";

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function timeAgo(nanoseconds: bigint): string {
  const ms = Number(nanoseconds / 1_000_000n);
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} mins ago`;
}

export default function KitchenDisplay() {
  const { actor } = useActor();
  const { logout } = useEmailAuth();
  const qc = useQueryClient();
  const [tick, setTick] = useState(0);

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["kitchen", "pending"],
    queryFn: () => actor!.getOrdersByStatus(OrderStatus.pending),
    enabled: !!actor,
    refetchInterval: 5000,
  });

  const { data: inProgressOrders = [] } = useQuery({
    queryKey: ["kitchen", "inprogress"],
    queryFn: () => actor!.getOrdersByStatus(OrderStatus.inprogress),
    enabled: !!actor,
    refetchInterval: 5000,
  });

  const { data: readyOrders = [] } = useQuery({
    queryKey: ["kitchen", "done"],
    queryFn: () => actor!.getOrdersByStatus(OrderStatus.done),
    enabled: !!actor,
    refetchInterval: 5000,
  });

  // New order beep detection
  const prevIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      for (const o of [...pendingOrders, ...inProgressOrders, ...readyOrders]) {
        prevIds.current.add(o.id.toString());
      }
      if (
        pendingOrders.length > 0 ||
        inProgressOrders.length > 0 ||
        readyOrders.length > 0
      ) {
        initialized.current = true;
      }
      return;
    }
    const allIds = new Set(
      [...pendingOrders, ...inProgressOrders, ...readyOrders].map((o) =>
        o.id.toString(),
      ),
    );
    let newCount = 0;
    for (const id of allIds) {
      if (!prevIds.current.has(id)) newCount++;
    }
    if (newCount > 0) {
      for (let i = 0; i < Math.min(newCount, 3); i++)
        setTimeout(() => playBeep(), i * 400);
    }
    prevIds.current = allIds;
  }, [pendingOrders, inProgressOrders, readyOrders]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);
  void tick;

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: bigint; status: OrderStatus }) =>
      actor!.updateOrderStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kitchen"] });
    },
  });

  const OrderCard = ({
    order,
    column,
  }: { order: OrderEntry; column: "pending" | "inprogress" | "done" }) => (
    <div
      data-ocid="kitchen.order.card"
      className={`rounded-xl border p-4 space-y-3 ${
        column === "pending"
          ? "border-primary/50 bg-card ring-1 ring-primary/30"
          : column === "inprogress"
            ? "border-yellow-500/40 bg-yellow-500/5"
            : "border-green-500/40 bg-green-500/5"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <Badge
            className={`text-xs font-semibold ${
              column === "pending"
                ? "bg-primary/20 text-primary hover:bg-primary/20"
                : column === "inprogress"
                  ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20"
                  : "bg-green-500/20 text-green-400 hover:bg-green-500/20"
            }`}
          >
            {column === "pending"
              ? "NEW"
              : column === "inprogress"
                ? "PREPARING"
                : "READY"}
          </Badge>
          <p className="font-bold text-lg mt-1">
            #{order.orderNumber.toString()}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {timeAgo(order.createdAt)}
        </div>
      </div>

      <ul className="space-y-1">
        {order.items.map((item) => (
          <li
            key={`${item.menuItemId.toString()}-${item.itemName}`}
            className="flex justify-between text-sm"
          >
            <span className="font-medium">{item.itemName}</span>
            <span className="text-primary font-bold">
              x{item.quantity.toString()}
            </span>
          </li>
        ))}
      </ul>

      {order.notes && order.notes !== "[CANCELLED]" && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">
          Note: {order.notes}
        </p>
      )}

      <div className="pt-1">
        {column === "pending" && (
          <Button
            data-ocid="kitchen.order.start.button"
            className="w-full"
            onClick={() =>
              updateMut.mutate({ id: order.id, status: OrderStatus.inprogress })
            }
            disabled={updateMut.isPending}
          >
            Start Preparing
          </Button>
        )}
        {column === "inprogress" && (
          <Button
            data-ocid="kitchen.order.ready.button"
            variant="outline"
            className="w-full border-yellow-500 text-yellow-400 hover:bg-yellow-500/20"
            onClick={() =>
              updateMut.mutate({ id: order.id, status: OrderStatus.done })
            }
            disabled={updateMut.isPending}
          >
            Mark Ready
          </Button>
        )}
        {column === "done" && (
          <Button
            data-ocid="kitchen.order.complete.button"
            variant="outline"
            className="w-full border-green-500 text-green-400 hover:bg-green-500/20"
            onClick={() =>
              updateMut.mutate({ id: order.id, status: OrderStatus.paid })
            }
            disabled={updateMut.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark Complete
          </Button>
        )}
      </div>
    </div>
  );

  const totalActive =
    pendingOrders.length + inProgressOrders.length + readyOrders.length;

  return (
    <div className="min-h-screen flex flex-col" data-ocid="kitchen.section">
      <header className="h-14 flex items-center px-4 border-b border-border bg-card shrink-0">
        <Coffee className="w-5 h-5 text-primary mr-2" />
        <span className="font-bold">Kitchen Display</span>
        <span className="ml-3 text-sm">
          {pendingOrders.length > 0 && (
            <span className="text-primary font-semibold">
              {pendingOrders.length} new
            </span>
          )}
          {inProgressOrders.length > 0 && (
            <span className="ml-2 text-yellow-400">
              {inProgressOrders.length} preparing
            </span>
          )}
          {readyOrders.length > 0 && (
            <span className="ml-2 text-green-400">
              {readyOrders.length} ready
            </span>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          data-ocid="kitchen.logout.button"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <main className="flex-1 p-4">
        {totalActive === 0 ? (
          <div
            data-ocid="kitchen.orders.empty_state"
            className="flex flex-col items-center justify-center h-64 text-muted-foreground"
          >
            <Coffee className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">No active orders. Waiting for orders...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pending Column */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <h2 className="font-semibold text-sm">Pending</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {pendingOrders.length}
                </span>
              </div>
              <div className="space-y-3" data-ocid="kitchen.pending.list">
                {pendingOrders.length === 0 ? (
                  <p
                    className="text-xs text-muted-foreground text-center py-8"
                    data-ocid="kitchen.pending.empty_state"
                  >
                    No pending orders
                  </p>
                ) : (
                  pendingOrders.map((order) => (
                    <OrderCard
                      key={order.id.toString()}
                      order={order}
                      column="pending"
                    />
                  ))
                )}
              </div>
            </div>

            {/* Preparing Column */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <h2 className="font-semibold text-sm">Preparing</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {inProgressOrders.length}
                </span>
              </div>
              <div className="space-y-3" data-ocid="kitchen.preparing.list">
                {inProgressOrders.length === 0 ? (
                  <p
                    className="text-xs text-muted-foreground text-center py-8"
                    data-ocid="kitchen.preparing.empty_state"
                  >
                    No orders preparing
                  </p>
                ) : (
                  inProgressOrders.map((order) => (
                    <OrderCard
                      key={order.id.toString()}
                      order={order}
                      column="inprogress"
                    />
                  ))
                )}
              </div>
            </div>

            {/* Ready Column */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <h2 className="font-semibold text-sm">Ready</h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {readyOrders.length}
                </span>
              </div>
              <div className="space-y-3" data-ocid="kitchen.ready.list">
                {readyOrders.length === 0 ? (
                  <p
                    className="text-xs text-muted-foreground text-center py-8"
                    data-ocid="kitchen.ready.empty_state"
                  >
                    No orders ready
                  </p>
                ) : (
                  readyOrders.map((order) => (
                    <OrderCard
                      key={order.id.toString()}
                      order={order}
                      column="done"
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
