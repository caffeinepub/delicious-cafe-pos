import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/badge";
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
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { useActor } from "../../hooks/useActor";
import { hashPassword } from "../../utils/authHelpers";

// Role constants (matching backend StaffRole enum values)
const ROLE_ADMIN = "admin";
const ROLE_CASHIER = "cashier";
const ROLE_KITCHEN = "kitchenStaff";
type StaffRoleValue = "admin" | "cashier" | "kitchenStaff";

interface AccountInfo {
  email: string;
  name: string;
  phone: string;
  role: string;
}

interface UserManagementProps {
  currentUserEmail: string;
}

type DeleteTarget = { email: string; name: string } | null;
type ResetTarget = { email: string; name: string } | null;

function roleBadge(role: string) {
  if (role === ROLE_ADMIN)
    return (
      <Badge className="bg-purple-500/20 text-purple-600 hover:bg-purple-500/20 border-purple-200">
        Admin
      </Badge>
    );
  if (role === ROLE_CASHIER)
    return (
      <Badge className="bg-blue-500/20 text-blue-600 hover:bg-blue-500/20 border-blue-200">
        Cashier
      </Badge>
    );
  return (
    <Badge className="bg-orange-500/20 text-orange-600 hover:bg-orange-500/20 border-orange-200">
      Kitchen Staff
    </Badge>
  );
}

export default function UserManagement({
  currentUserEmail,
}: UserManagementProps) {
  const { actor } = useActor();
  const qc = useQueryClient();

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [resetTarget, setResetTarget] = useState<ResetTarget>(null);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [resetError, setResetError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffConfirm, setStaffConfirm] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRoleValue>(ROLE_CASHIER);
  const [staffError, setStaffError] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => (actor as any).getAllAccounts() as Promise<AccountInfo[]>,
    enabled: !!actor,
  });

  const createStaffMut = useMutation({
    mutationFn: async ({
      name,
      email,
      phone,
      password,
      role,
    }: {
      name: string;
      email: string;
      phone: string;
      password: string;
      role: StaffRoleValue;
    }) => {
      const pwHash = await hashPassword(email, password);
      await (actor as any).adminCreateStaffAccount(
        email.toLowerCase().trim(),
        name.trim(),
        phone.trim(),
        pwHash,
        role,
      );
    },
    onSuccess: () => {
      toast.success("Staff account created successfully.");
      setStaffName("");
      setStaffEmail("");
      setStaffPhone("");
      setStaffPassword("");
      setStaffConfirm("");
      setStaffRole(ROLE_CASHIER);
      setStaffError("");
      setShowCreateForm(false);
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => {
      setStaffError(e.message || "Failed to create account.");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (email: string) => (actor as any).adminDeleteAccount(email),
    onSuccess: () => {
      toast.success("Account deleted.");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to delete account.");
    },
  });

  const resetMut = useMutation({
    mutationFn: async ({
      email,
      password,
    }: { email: string; password: string }) => {
      const pwHash = await hashPassword(email, password);
      return (actor as any).adminResetPassword(email, pwHash);
    },
    onSuccess: () => {
      toast.success("Password reset successfully.");
      setResetTarget(null);
      setNewPw("");
      setConfirmPw("");
      setResetError("");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to reset password.");
    },
  });

  function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setStaffError("");
    if (!staffName.trim() || !staffEmail.trim() || !staffPassword) {
      setStaffError("All required fields must be filled.");
      return;
    }
    if (staffPassword !== staffConfirm) {
      setStaffError("Passwords do not match.");
      return;
    }
    if (staffPassword.length < 6) {
      setStaffError("Password must be at least 6 characters.");
      return;
    }
    createStaffMut.mutate({
      name: staffName,
      email: staffEmail,
      phone: staffPhone,
      password: staffPassword,
      role: staffRole,
    });
  }

  function handleReset() {
    if (!resetTarget) return;
    if (!newPw || !confirmPw) {
      setResetError("Please fill in both password fields.");
      return;
    }
    if (newPw !== confirmPw) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetError("");
    resetMut.mutate({ email: resetTarget.email, password: newPw });
  }

  return (
    <div className="space-y-6" data-ocid="users.section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Staff Accounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage who has access to the POS system
          </p>
        </div>
        <Button
          data-ocid="users.staff.open_modal_button"
          onClick={() => setShowCreateForm(true)}
          className="gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff
        </Button>
      </div>

      {/* Staff List */}
      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <div
              data-ocid="users.loading_state"
              className="flex items-center justify-center py-12"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <div
              data-ocid="users.empty_state"
              className="text-center py-12 text-muted-foreground text-sm"
            >
              No staff accounts yet. Click "Add Staff" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="users.table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account, idx) => (
                    <TableRow
                      key={account.email}
                      data-ocid={`users.item.${idx + 1}`}
                    >
                      <TableCell className="font-medium">
                        {account.name}
                        {account.email.toLowerCase() ===
                          currentUserEmail.toLowerCase() && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (you)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {account.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {account.phone || "—"}
                      </TableCell>
                      <TableCell>{roleBadge(account.role)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            data-ocid={`users.reset_password.button.${idx + 1}`}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResetTarget({
                                email: account.email,
                                name: account.name,
                              });
                              setNewPw("");
                              setConfirmPw("");
                              setResetError("");
                            }}
                          >
                            Reset PW
                          </Button>
                          <Button
                            data-ocid={`users.delete_button.${idx + 1}`}
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            disabled={
                              account.email.toLowerCase() ===
                              currentUserEmail.toLowerCase()
                            }
                            onClick={() =>
                              setDeleteTarget({
                                email: account.email,
                                name: account.name,
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Guide */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Role Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2 items-start">
            <span className="w-28 shrink-0">{roleBadge(ROLE_ADMIN)}</span>
            <span className="text-muted-foreground">
              Full access: dashboard, items, categories, inventory, reports,
              user management
            </span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="w-28 shrink-0">{roleBadge(ROLE_CASHIER)}</span>
            <span className="text-muted-foreground">
              POS order creation and billing screen
            </span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="w-28 shrink-0">{roleBadge(ROLE_KITCHEN)}</span>
            <span className="text-muted-foreground">
              Kitchen display with live order notifications
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Create Staff Dialog */}
      <Dialog
        open={showCreateForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateForm(false);
            setStaffError("");
          }
        }}
      >
        <DialogContent data-ocid="users.staff.dialog" className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Staff Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Full Name *</Label>
              <Input
                id="staff-name"
                data-ocid="users.staff.name.input"
                placeholder="Staff member name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email *</Label>
              <Input
                id="staff-email"
                data-ocid="users.staff.email.input"
                type="email"
                placeholder="staff@cafe.com"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input
                id="staff-phone"
                data-ocid="users.staff.phone.input"
                type="tel"
                placeholder="+1 234 567 8901"
                value={staffPhone}
                onChange={(e) => setStaffPhone(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="staff-password">Password *</Label>
                <Input
                  id="staff-password"
                  data-ocid="users.staff.password.input"
                  type="password"
                  placeholder="Min. 6 chars"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-confirm">Confirm *</Label>
                <Input
                  id="staff-confirm"
                  data-ocid="users.staff.confirm.input"
                  type="password"
                  placeholder="Repeat"
                  value={staffConfirm}
                  onChange={(e) => setStaffConfirm(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Role *</Label>
              <Select
                value={staffRole}
                onValueChange={(v) => setStaffRole(v as StaffRoleValue)}
              >
                <SelectTrigger
                  id="staff-role"
                  data-ocid="users.staff.role.select"
                  className="h-10"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLE_CASHIER}>Cashier</SelectItem>
                  <SelectItem value={ROLE_KITCHEN}>Kitchen Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {staffError && (
              <p
                data-ocid="users.staff.error_state"
                className="text-sm text-destructive"
              >
                {staffError}
              </p>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                data-ocid="users.staff.cancel_button"
                onClick={() => {
                  setShowCreateForm(false);
                  setStaffError("");
                }}
                disabled={createStaffMut.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="users.staff.submit_button"
                disabled={createStaffMut.isPending}
              >
                {createStaffMut.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent data-ocid="users.delete.dialog" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the account for{" "}
            <span className="font-semibold text-foreground">
              {deleteTarget?.name}
            </span>
            ? This cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              data-ocid="users.delete.cancel_button"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-ocid="users.delete.confirm_button"
              onClick={() =>
                deleteTarget && deleteMut.mutate(deleteTarget.email)
              }
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setNewPw("");
            setConfirmPw("");
            setResetError("");
          }
        }}
      >
        <DialogContent
          data-ocid="users.reset_password.dialog"
          className="max-w-sm"
        >
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 pb-1">
            <p className="text-sm text-muted-foreground">
              Setting new password for{" "}
              <span className="font-semibold text-foreground">
                {resetTarget?.name}
              </span>
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pw">New Password</Label>
              <Input
                id="new-pw"
                data-ocid="users.new_password.input"
                type="password"
                placeholder="Enter new password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm Password</Label>
              <Input
                id="confirm-pw"
                data-ocid="users.confirm_password.input"
                type="password"
                placeholder="Repeat new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="h-11"
              />
            </div>
            {resetError && (
              <p
                data-ocid="users.reset_password.error_state"
                className="text-sm text-destructive"
              >
                {resetError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              data-ocid="users.cancel_reset.button"
              variant="outline"
              onClick={() => {
                setResetTarget(null);
                setNewPw("");
                setConfirmPw("");
                setResetError("");
              }}
              disabled={resetMut.isPending}
            >
              Cancel
            </Button>
            <Button
              data-ocid="users.confirm_reset.button"
              onClick={handleReset}
              disabled={resetMut.isPending}
            >
              {resetMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Resetting...
                </>
              ) : (
                "Confirm Reset"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
