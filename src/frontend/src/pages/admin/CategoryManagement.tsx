import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import type { Category } from "../../backend";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { useActor } from "../../hooks/useActor";

export default function CategoryManagement() {
  const { actor } = useActor();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Category | null>(null);
  const [deleteItem, setDeleteItem] = useState<Category | null>(null);
  const [name, setName] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => actor!.getAllCategories(),
    enabled: !!actor,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const createMut = useMutation({
    mutationFn: () => actor!.createCategory(name),
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setName("");
    },
  });

  const updateMut = useMutation({
    mutationFn: () => actor!.updateCategory(editItem!.id, name),
    onSuccess: () => {
      invalidate();
      setEditItem(null);
      setName("");
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => actor!.deleteCategory(deleteItem!.id),
    onSuccess: () => {
      invalidate();
      setDeleteItem(null);
    },
  });

  return (
    <div className="space-y-4" data-ocid="categories.section">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {categories.length} categories
        </p>
        <Button
          data-ocid="categories.add.open_modal_button"
          onClick={() => {
            setName("");
            setAddOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Category
        </Button>
      </div>

      {isLoading ? (
        <div
          data-ocid="categories.loading_state"
          className="text-muted-foreground text-sm"
        >
          Loading...
        </div>
      ) : categories.length === 0 ? (
        <Card data-ocid="categories.empty_state">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No categories yet. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border" data-ocid="categories.list">
              {categories.map((cat, i) => (
                <li
                  key={cat.id.toString()}
                  data-ocid={`categories.item.${i + 1}`}
                  className="flex items-center px-4 py-3"
                >
                  <span className="flex-1 font-medium text-sm">{cat.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      data-ocid={`categories.edit_button.${i + 1}`}
                      onClick={() => {
                        setEditItem(cat);
                        setName(cat.name);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      data-ocid={`categories.delete_button.${i + 1}`}
                      onClick={() => setDeleteItem(cat)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent data-ocid="categories.add.dialog">
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <Input
            data-ocid="categories.add.input"
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="categories.add.cancel_button"
              onClick={() => setAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="categories.add.submit_button"
              onClick={() => createMut.mutate()}
              disabled={!name.trim() || createMut.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(v) => !v && setEditItem(null)}>
        <DialogContent data-ocid="categories.edit.dialog">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <Input
            data-ocid="categories.edit.input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              data-ocid="categories.edit.cancel_button"
              onClick={() => setEditItem(null)}
            >
              Cancel
            </Button>
            <Button
              data-ocid="categories.edit.save_button"
              onClick={() => updateMut.mutate()}
              disabled={!name.trim() || updateMut.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(v) => !v && setDeleteItem(null)}
      >
        <AlertDialogContent data-ocid="categories.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteItem?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="categories.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="categories.delete.confirm_button"
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
