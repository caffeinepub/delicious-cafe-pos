import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { UserRole } from "./backend";
import { useActor } from "./hooks/useActor";
import { useEmailAuth } from "./hooks/useEmailAuth";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import CashierPage from "./pages/cashier/CashierPage";
import KitchenDisplay from "./pages/kitchen/KitchenDisplay";

export default function App() {
  const { identity, isInitializing } = useEmailAuth();
  const { actor } = useActor();

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["role", identity?.getPrincipal().toString()],
    queryFn: () => actor!.getCallerUserRole(),
    enabled: !!actor && !!identity,
  });

  if (isInitializing || (identity && roleLoading && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!identity) {
    return <LoginPage />;
  }

  if (role === UserRole.admin) return <AdminLayout />;
  if (role === UserRole.user) return <CashierPage />;
  if (role === UserRole.guest) return <KitchenDisplay />;

  return <LoginPage />;
}
