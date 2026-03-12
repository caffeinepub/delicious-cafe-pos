import { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldCheck, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserRole } from "../../backend";
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

type ResetTarget = { email: string; name: string } | null;

export default function UserManagement() {
  const { actor } = useActor();
  const qc = useQueryClient();

  // Per-row role state: email -> selected role
  const [rowRoles, setRowRoles] = useState<Record<string, UserRole>>({});

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<ResetTarget>(null);
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [resetError, setResetError] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => (actor as any).getAllAccounts(),
    enabled: !!actor,
  });

  const assignMut = useMutation({
    mutationFn: ({
      email,
      principalId,
    }: { email: string; principalId: string }) => {
      const role = rowRoles[email] ?? UserRole.user;
      const principal = Principal.fromText(principalId);
      return actor!.assignCallerUserRole(principal, role);
    },
    onSuccess: () => {
      toast.success("Role assigned successfully.");
      qc.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Failed to assign role.");
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

  const handleReset = () => {
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
  };

  return (
    <div className="space-y-6" data-ocid="users.section">
      {/* Registered Users */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Users className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Registered Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div
              data-ocid="users.loading_state"
              className="flex items-center justify-center py-8"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <div
              data-ocid="users.empty_state"
              className="text-center py-10 text-muted-foreground text-sm"
            >
              No registered accounts yet. Users will appear here after they sign
              up.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="users.list">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Assign Role</TableHead>
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
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {account.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {account.phone}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={rowRoles[account.email] ?? UserRole.user}
                          onValueChange={(v) =>
                            setRowRoles((prev) => ({
                              ...prev,
                              [account.email]: v as UserRole,
                            }))
                          }
                        >
                          <SelectTrigger
                            data-ocid={`users.role.select.${idx + 1}`}
                            className="w-36 h-9 text-sm"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.admin}>
                              Admin
                            </SelectItem>
                            <SelectItem value={UserRole.user}>
                              Cashier
                            </SelectItem>
                            <SelectItem value={UserRole.guest}>
                              Kitchen Staff
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            data-ocid={`users.assign.button.${idx + 1}`}
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              assignMut.mutate({
                                email: account.email,
                                principalId: account.principalId,
                              })
                            }
                            disabled={assignMut.isPending}
                          >
                            Assign
                          </Button>
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

      {/* Role Guide */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Role Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="font-semibold text-primary w-24">Admin</span>
            <span className="text-muted-foreground">
              Full access: dashboard, items, categories, inventory, reports,
              user management
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-primary w-24">Cashier</span>
            <span className="text-muted-foreground">
              Order creation and billing screen
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold text-primary w-24">Kitchen</span>
            <span className="text-muted-foreground">
              Kitchen display with live order notifications
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
