import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import { useEmailAuth } from "./hooks/useEmailAuth";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import CashierPage from "./pages/cashier/CashierPage";
import KitchenDisplay from "./pages/kitchen/KitchenDisplay";

export type LoggedInUser = {
  email: string;
  name: string;
  role: "admin" | "cashier" | "kitchenStaff";
};

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const { logout } = useEmailAuth();

  const handleLogout = () => {
    logout();
    setLoggedInUser(null);
  };

  if (!loggedInUser) {
    return (
      <>
        <LoginPage onLogin={setLoggedInUser} />
        <Toaster />
      </>
    );
  }

  if (loggedInUser.role === "admin") {
    return (
      <>
        <AdminLayout onLogout={handleLogout} currentUser={loggedInUser} />
        <Toaster />
      </>
    );
  }

  if (loggedInUser.role === "cashier") {
    return (
      <>
        <CashierPage onLogout={handleLogout} currentUser={loggedInUser} />
        <Toaster />
      </>
    );
  }

  if (loggedInUser.role === "kitchenStaff") {
    return (
      <>
        <KitchenDisplay onLogout={handleLogout} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <LoginPage onLogin={setLoggedInUser} />
      <Toaster />
    </>
  );
}
