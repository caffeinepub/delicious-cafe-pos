import { ChefHat, ShieldCheck, ShoppingCart } from "lucide-react";
import { motion } from "motion/react";

type View = "pos" | "kitchen" | "admin";

interface HomePageProps {
  onNavigate: (view: View) => void;
}

const tiles = [
  {
    id: "pos" as View,
    icon: ShoppingCart,
    title: "POS / Cashier",
    description: "Take orders, manage billing & process payments",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50 hover:bg-amber-100",
    border: "border-amber-200",
    iconBg: "bg-amber-500",
    ocid: "home.pos.button",
  },
  {
    id: "kitchen" as View,
    icon: ChefHat,
    title: "Kitchen Display",
    description: "Live order queue with status updates & alerts",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 hover:bg-emerald-100",
    border: "border-emerald-200",
    iconBg: "bg-emerald-500",
    ocid: "home.kitchen.button",
  },
  {
    id: "admin" as View,
    icon: ShieldCheck,
    title: "Admin Panel",
    description: "Manage menu, inventory, staff & view reports",
    color: "from-slate-600 to-slate-800",
    bg: "bg-slate-50 hover:bg-slate-100",
    border: "border-slate-200",
    iconBg: "bg-slate-700",
    ocid: "home.admin.button",
  },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      {/* Header */}
      <header className="pt-12 pb-8 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-3 mb-3"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <h1
            className="text-3xl font-bold text-slate-800"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Delicious Cafe
          </h1>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-slate-500 text-base"
        >
          POS &amp; Management System
        </motion.p>
      </header>

      {/* Tiles */}
      <main className="flex-1 flex items-start justify-center px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
          {tiles.map((tile, i) => (
            <motion.button
              key={tile.id}
              type="button"
              data-ocid={tile.ocid}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.45 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate(tile.id)}
              className={`relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 ${tile.bg} ${tile.border} transition-all duration-200 shadow-sm hover:shadow-md text-center cursor-pointer group`}
            >
              <div
                className={`w-16 h-16 rounded-2xl ${tile.iconBg} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200`}
              >
                <tile.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg text-slate-800 mb-1">
                  {tile.title}
                </p>
                <p className="text-sm text-slate-500 leading-snug">
                  {tile.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-400 pb-6">
        &copy; {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600 transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
