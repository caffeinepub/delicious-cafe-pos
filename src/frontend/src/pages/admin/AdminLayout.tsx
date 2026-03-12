import {
  BarChart2,
  Coffee,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Tag,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import CategoryManagement from "./CategoryManagement";
import Dashboard from "./Dashboard";
import InventoryManagement from "./InventoryManagement";
import ItemManagement from "./ItemManagement";
import SalesReports from "./SalesReports";
import UserManagement from "./UserManagement";

type Tab =
  | "dashboard"
  | "items"
  | "categories"
  | "inventory"
  | "reports"
  | "users";

const navItems: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "items", label: "Item Management", icon: UtensilsCrossed },
  { id: "categories", label: "Categories", icon: Tag },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "reports", label: "Sales Reports", icon: BarChart2 },
  { id: "users", label: "User Management", icon: Users },
];

export default function AdminLayout() {
  const { clear } = useInternetIdentity();
  const [active, setActive] = useState<Tab>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (tab: Tab) => {
    setActive(tab);
    setMobileOpen(false);
  };

  const renderPage = () => {
    switch (active) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "items":
        return <ItemManagement />;
      case "categories":
        return <CategoryManagement />;
      case "inventory":
        return <InventoryManagement />;
      case "reports":
        return <SalesReports />;
      case "users":
        return <UserManagement />;
    }
  };

  return (
    <div className="min-h-screen flex">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-60 bg-sidebar flex flex-col border-r border-sidebar-border transition-transform md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b border-sidebar-border">
          <Coffee className="w-6 h-6 text-primary" />
          <span className="font-bold text-foreground">Delicious Cafe</span>
          <span className="ml-auto text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
            Admin
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              data-ocid={`admin.${item.id}.tab`}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active === item.id
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            type="button"
            data-ocid="admin.logout.button"
            onClick={clear}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/20 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setMobileOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}

      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <header className="h-16 flex items-center px-4 border-b border-border bg-card sticky top-0 z-20">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
          <h1 className="font-semibold text-foreground">
            {navItems.find((n) => n.id === active)?.label}
          </h1>
        </header>
        <main className="flex-1 p-4 md:p-6">{renderPage()}</main>
      </div>
    </div>
  );
}
