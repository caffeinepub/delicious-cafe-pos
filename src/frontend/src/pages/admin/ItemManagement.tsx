import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Category, MenuItem } from "../../backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
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
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { useActor } from "../../hooks/useActor";

type ItemForm = {
  name: string;
  categoryId: string;
  price: string;
  description: string;
};
const emptyForm: ItemForm = {
  name: "",
  categoryId: "",
  price: "",
  description: "",
};

export default function ItemManagement() {
  const { actor } = useActor();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);

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

  const invalidate = () => qc.invalidateQueries({ queryKey: ["menuItems"] });

  const catMap = Object.fromEntries(
    categories.map((c: Category) => [c.id.toString(), c.name]),
  );

  const createMut = useMutation({
    mutationFn: () =>
      actor!.createMenuItem(
        form.name,
        BigInt(form.categoryId),
        Number.parseFloat(form.price),
        form.description,
      ),
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setForm(emptyForm);
    },
  });

  const updateMut = useMutation({
    mutationFn: () =>
      actor!.updateMenuItem({
        ...editItem!,
        name: form.name,
        categoryId: BigInt(form.categoryId),
        price: Number.parseFloat(form.price),
        description: form.description,
      }),
    onSuccess: () => {
      invalidate();
      setEditItem(null);
      setForm(emptyForm);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => actor!.deleteMenuItem(deleteItem!.id),
    onSuccess: () => {
      invalidate();
      setDeleteItem(null);
    },
  });

  const toggleMut = useMutation({
    mutationFn: (id: bigint) => actor!.toggleMenuItemAvailability(id),
    onSuccess: () => invalidate(),
  });

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      categoryId: item.categoryId.toString(),
      price: item.price.toString(),
      description: item.description,
    });
  };

  const formValid =
    form.name.trim() && form.categoryId && Number.parseFloat(form.price) > 0;

  const ItemFormFields = () => (
    <div className="space-y-3">
      <div>
        <Label>Name</Label>
        <Input
          data-ocid="items.form.name.input"
          placeholder="Item name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div>
        <Label>Category</Label>
        <select
          data-ocid="items.form.category.select"
          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          value={form.categoryId}
          onChange={(e) =>
            setForm((f) => ({ ...f, categoryId: e.target.value }))
          }
        >
          <option value="">Select category</option>
          {categories.map((c: Category) => (
            <option key={c.id.toString()} value={c.id.toString()}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label>Price ($)</Label>
        <Input
          data-ocid="items.form.price.input"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={form.price}
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
        />
      </div>
      <div>
        <Label>Description (optional)</Label>
        <Textarea
          data-ocid="items.form.description.textarea"
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
          rows={2}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4" data-ocid="items.section">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} items</p>
        <Button
          data-ocid="items.add.open_modal_button"
          onClick={() => {
            setForm(emptyForm);
            setAddOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Item
        </Button>
      </div>

      {isLoading ? (
        <div
          data-ocid="items.loading_state"
          className="text-muted-foreground text-sm"
        >
          Loading...
        </div>
      ) : items.length === 0 ? (
        <Card data-ocid="items.empty_state">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No items yet. Add your first menu item.
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-ocid="items.list"
        >
          {items.map((item, i) => (
            <Card key={item.id.toString()} data-ocid={`items.item.${i + 1}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-sm">{item.name}</h3>
                  <Badge
                    variant={item.isAvailable ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {item.isAvailable ? "Available" : "Out of Stock"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {catMap[item.categoryId.toString()] || "Unknown"}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}
                <p className="text-primary font-bold">
                  ${item.price.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Stock: {item.stockQuantity.toString()}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    data-ocid={`items.toggle.${i + 1}`}
                    onClick={() => toggleMut.mutate(item.id)}
                  >
                    {item.isAvailable ? (
                      <ToggleRight className="w-4 h-4 text-primary" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-ocid={`items.edit_button.${i + 1}`}
                    onClick={() => openEdit(item)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    data-ocid={`items.delete_button.${i + 1}`}
                    onClick={() => setDeleteItem(item)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent data-ocid="items.add.dialog">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
          </DialogHeader>
          <ItemFormFields />
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="items.add.cancel_button"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="items.add.submit_button"
              onClick={() => createMut.mutate()}
              disabled={!formValid || createMut.isPending}
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent data-ocid="items.edit.dialog">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <ItemFormFields />
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="items.edit.cancel_button"
              onClick={() => setEditItem(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="items.edit.save_button"
              onClick={() => updateMut.mutate()}
              disabled={!formValid || updateMut.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(v) => !v && setDeleteItem(null)}
      >
        <AlertDialogContent data-ocid="items.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deleteItem?.name}" from the menu?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="items.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="items.delete.confirm_button"
              onClick={() => deleteMut.mutate()}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
