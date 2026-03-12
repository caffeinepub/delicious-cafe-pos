import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Coffee, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type OrderEntry, OrderStatus } from "../../backend";
import { Button } from "../../components/ui/button";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";

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
  const { clear } = useInternetIdentity();
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

  // Proper new order detection: track prev known IDs
  const prevIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      // First load: just record existing IDs, don't beep
      for (const o of [...pendingOrders, ...inProgressOrders]) {
        prevIds.current.add(o.id.toString());
      }
      if (pendingOrders.length > 0 || inProgressOrders.length > 0) {
        initialized.current = true;
      }
      return;
    }
    const allIds = new Set(
      [...pendingOrders, ...inProgressOrders].map((o) => o.id.toString()),
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
  }, [pendingOrders, inProgressOrders]);

  // Update time display every minute
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
    isPending,
  }: { order: OrderEntry; isPending: boolean }) => (
    <div
      data-ocid="kitchen.order.card"
      className={`rounded-xl border p-4 space-y-3 ${
        isPending
          ? "border-primary/50 bg-card ring-1 ring-primary/30"
          : "border-border bg-secondary/50"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              isPending
                ? "bg-primary/20 text-primary"
                : "bg-yellow-400/20 text-yellow-400"
            }`}
          >
            {isPending ? "NEW" : "IN PROGRESS"}
          </span>
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

      {order.notes && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2">
          Note: {order.notes}
        </p>
      )}

      <div className="pt-1">
        {isPending ? (
          <Button
            data-ocid="kitchen.order.start.button"
            className="w-full"
            onClick={() =>
              updateMut.mutate({ id: order.id, status: OrderStatus.inprogress })
            }
            disabled={updateMut.isPending}
          >
            Start
          </Button>
        ) : (
          <Button
            data-ocid="kitchen.order.done.button"
            variant="outline"
            className="w-full border-green-500 text-green-400 hover:bg-green-500/20"
            onClick={() =>
              updateMut.mutate({ id: order.id, status: OrderStatus.done })
            }
            disabled={updateMut.isPending}
          >
            Done
          </Button>
        )}
      </div>
    </div>
  );

  const allOrders = [...pendingOrders, ...inProgressOrders];

  return (
    <div className="min-h-screen flex flex-col" data-ocid="kitchen.section">
      <header className="h-14 flex items-center px-4 border-b border-border bg-card shrink-0">
        <Coffee className="w-5 h-5 text-primary mr-2" />
        <span className="font-bold">Kitchen Display</span>
        <span className="ml-3 text-sm text-muted-foreground">
          {pendingOrders.length > 0 && (
            <span className="text-primary font-semibold">
              {pendingOrders.length} new
            </span>
          )}
          {inProgressOrders.length > 0 && (
            <span className="ml-2 text-yellow-400">
              {inProgressOrders.length} in progress
            </span>
          )}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          data-ocid="kitchen.logout.button"
          onClick={clear}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      <main className="flex-1 p-4">
        {allOrders.length === 0 ? (
          <div
            data-ocid="kitchen.orders.empty_state"
            className="flex flex-col items-center justify-center h-64 text-muted-foreground"
          >
            <Coffee className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">No active orders. Waiting for orders...</p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            data-ocid="kitchen.orders.list"
          >
            {pendingOrders.map((order) => (
              <OrderCard
                key={order.id.toString()}
                order={order}
                isPending={true}
              />
            ))}
            {inProgressOrders.map((order) => (
              <OrderCard
                key={order.id.toString()}
                order={order}
                isPending={false}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
