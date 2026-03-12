import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Edit } from "lucide-react";
import { useState } from "react";
import type { Category, MenuItem } from "../../backend";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { useActor } from "../../hooks/useActor";

export default function InventoryManagement() {
  const { actor } = useActor();
  const qc = useQueryClient();
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [newQty, setNewQty] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["menuItems"],
    queryFn: () => actor!.getAllMenuItems(),
    enabled: !!actor,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => actor!.getAllCategories(),
    enabled: !!actor,
  });

  const catMap = Object.fromEntries(
    categories.map((c: Category) => [c.id.toString(), c.name]),
  );

  const updateMut = useMutation({
    mutationFn: () =>
      actor!.updateMenuItem({
        ...editItem!,
        stockQuantity: BigInt(Number.parseInt(newQty)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menuItems"] });
      setEditItem(null);
    },
  });

  const lowStock = items.filter((i) => i.stockQuantity < 10n);

  return (
    <div className="space-y-4" data-ocid="inventory.section">
      {lowStock.length > 0 && (
        <div
          data-ocid="inventory.lowstock.card"
          className="flex items-center gap-2 p-3 rounded-lg bg-destructive/20 border border-destructive/30 text-destructive text-sm"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {lowStock.length} item(s) are low on stock (below 10 units)
          </span>
        </div>
      )}

      {isLoading ? (
        <div
          data-ocid="inventory.loading_state"
          className="text-muted-foreground text-sm"
        >
          Loading...
        </div>
      ) : items.length === 0 ? (
        <Card data-ocid="inventory.empty_state">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No items in inventory.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-ocid="inventory.table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      Item
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      Stock
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      Status
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, i) => (
                    <tr
                      key={item.id.toString()}
                      data-ocid={`inventory.row.${i + 1}`}
                    >
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {catMap[item.categoryId.toString()] || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            item.stockQuantity < 10n
                              ? "text-destructive font-semibold"
                              : ""
                          }
                        >
                          {item.stockQuantity.toString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={item.isAvailable ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {item.isAvailable ? "Available" : "Out of Stock"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          data-ocid={`inventory.edit_button.${i + 1}`}
                          onClick={() => {
                            setEditItem(item);
                            setNewQty(item.stockQuantity.toString());
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent data-ocid="inventory.edit.dialog">
          <DialogHeader>
            <DialogTitle>Update Stock: {editItem?.name}</DialogTitle>
          </DialogHeader>
          <Input
            data-ocid="inventory.edit.input"
            type="number"
            min="0"
            placeholder="Stock quantity"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="inventory.edit.cancel_button"
              onClick={() => setEditItem(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="inventory.edit.save_button"
              onClick={() => updateMut.mutate()}
              disabled={!newQty || updateMut.isPending}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
