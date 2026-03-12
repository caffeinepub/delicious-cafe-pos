import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingBag, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useActor } from "../../hooks/useActor";

export default function SalesReports() {
  const { actor } = useActor();
  const today = new Date();
  const [startDate, setStartDate] = useState(today.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [applied, setApplied] = useState({ start: startDate, end: endDate });

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

  return (
    <div className="space-y-5" data-ocid="reports.section">
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
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
              <ul className="space-y-2">
                {topItems.map((item) => (
                  <li
                    key={item.name}
                    data-ocid="reports.topitem.item"
                    className="flex justify-between text-sm"
                  >
                    <span>{item.name}</span>
                    <span className="text-primary font-semibold">
                      {item.totalQuantitySold.toString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Order History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p
                data-ocid="reports.orders.loading_state"
                className="text-muted-foreground text-sm"
              >
                Loading...
              </p>
            ) : orders.length === 0 ? (
              <p
                data-ocid="reports.orders.empty_state"
                className="text-muted-foreground text-sm"
              >
                No orders in this period.
              </p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {orders
                  .slice()
                  .reverse()
                  .map((order, i) => (
                    <li
                      key={order.id.toString()}
                      data-ocid={`reports.order.${i + 1}`}
                      className="flex justify-between text-sm border-b border-border pb-2"
                    >
                      <div>
                        <span className="font-medium">
                          #{order.orderNumber.toString()}
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
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
