import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart2,
  Clock,
  DollarSign,
  Package,
  PlusCircle,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { OrderStatus } from "../../backend";
import { useActor } from "../../hooks/useActor";

type Tab =
  | "dashboard"
  | "items"
  | "categories"
  | "inventory"
  | "reports"
  | "users";

interface DashboardProps {
  onNavigate: (tab: Tab) => void;
}

const LOW_STOCK_THRESHOLD = 5;

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { actor } = useActor();

  const todayStart = BigInt(new Date().setHours(0, 0, 0, 0)) * 1_000_000n;
  const now = BigInt(Date.now()) * 1_000_000n;

  const { data: revenue = 0 } = useQuery({
    queryKey: ["revenue", "today"],
    queryFn: () => actor!.getTotalRevenueInTimeRange(todayStart, now),
    enabled: !!actor,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["orders", "today"],
    queryFn: () => actor!.getOrdersInTimeRange(todayStart, now),
    enabled: !!actor,
  });

  const { data: pendingOrders = [] } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: () => actor!.getOrdersByStatus(OrderStatus.pending),
    enabled: !!actor,
    refetchInterval: 10000,
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => actor!.getAllMenuItems(),
    enabled: !!actor,
  });

  const lowStockCount = allItems.filter(
    (item) => Number(item.stockQuantity) <= LOW_STOCK_THRESHOLD,
  ).length;

  const stats = [
    {
      label: "Today Sales",
      value: `$${revenue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
      ocid: "dashboard.revenue.card",
    },
    {
      label: "Total Orders",
      value: allOrders.length,
      icon: ShoppingBag,
      color: "text-sky-400",
      bg: "bg-sky-400/10 border-sky-400/20",
      ocid: "dashboard.orders.card",
    },
    {
      label: "Pending Orders",
      value: pendingOrders.length,
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-400/10 border-amber-400/20",
      ocid: "dashboard.pending.card",
    },
    {
      label: "Low Stock Alert",
      value: lowStockCount,
      icon: AlertTriangle,
      color: lowStockCount > 0 ? "text-red-400" : "text-muted-foreground",
      bg:
        lowStockCount > 0
          ? "bg-red-400/10 border-red-400/20"
          : "bg-muted/30 border-border",
      ocid: "dashboard.lowstock.card",
    },
  ];

  const actions = [
    {
      label: "New Order",
      icon: ShoppingCart,
      tab: "items" as Tab,
      color: "bg-primary hover:bg-primary/90 text-primary-foreground",
      ocid: "dashboard.neworder.primary_button",
    },
    {
      label: "Add Item",
      icon: PlusCircle,
      tab: "items" as Tab,
      color: "bg-sky-500 hover:bg-sky-500/90 text-white",
      ocid: "dashboard.additem.primary_button",
    },
    {
      label: "Manage Inventory",
      icon: Package,
      tab: "inventory" as Tab,
      color: "bg-amber-500 hover:bg-amber-500/90 text-white",
      ocid: "dashboard.inventory.primary_button",
    },
    {
      label: "Sales History",
      icon: BarChart2,
      tab: "reports" as Tab,
      color: "bg-emerald-600 hover:bg-emerald-600/90 text-white",
      ocid: "dashboard.saleshistory.primary_button",
    },
  ];

  return (
    <div className="space-y-8" data-ocid="dashboard.section">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            data-ocid={stat.ocid}
            className={`rounded-2xl border p-5 flex flex-col gap-3 ${stat.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.bg}`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold tracking-tight ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              data-ocid={action.ocid}
              onClick={() => onNavigate(action.tab)}
              className={`${
                action.color
              } rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-sm min-h-[130px] font-semibold text-base`}
            >
              <action.icon className="w-8 h-8" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-4">
          Recent Orders Today
        </h3>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {allOrders.length === 0 ? (
            <p
              className="text-muted-foreground text-sm p-6"
              data-ocid="dashboard.recentorders.empty_state"
            >
              No orders yet today.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {allOrders
                .slice(-6)
                .reverse()
                .map((order, i) => (
                  <li
                    key={order.id.toString()}
                    data-ocid={`dashboard.recentorders.item.${i + 1}`}
                    className="flex items-center justify-between px-5 py-4 text-sm"
                  >
                    <span className="font-mono text-muted-foreground">
                      #{order.orderNumber.toString()}
                    </span>
                    <span
                      className={`capitalize text-xs px-2.5 py-1 rounded-full font-medium ${
                        order.status === OrderStatus.pending
                          ? "bg-amber-400/15 text-amber-400"
                          : order.status === OrderStatus.inprogress
                            ? "bg-sky-400/15 text-sky-400"
                            : order.status === OrderStatus.done
                              ? "bg-emerald-400/15 text-emerald-400"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="font-bold text-foreground">
                      ${order.totalAmount.toFixed(2)}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
