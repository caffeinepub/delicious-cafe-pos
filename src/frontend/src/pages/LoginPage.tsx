import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coffee, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { LoggedInUser } from "../App";
import { createActorWithConfig } from "../config";
import { useActor } from "../hooks/useActor";
import { useEmailAuth } from "../hooks/useEmailAuth";
import { deriveIdentityFromEmail, hashPassword } from "../utils/authHelpers";

// Role constants matching backend StaffRole enum
const ROLE_ADMIN = "admin";
const ROLE_CASHIER = "cashier";
const ROLE_KITCHEN = "kitchenStaff";

interface LoginPageProps {
  onLogin: (user: LoggedInUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { loginWithEmail } = useEmailAuth();
  const { actor, isFetching } = useActor();

  const [mode, setMode] = useState<"login" | "setup">("login");
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  // Setup form
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupError, setSetupError] = useState("");
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    if (!actor || isFetching) return;
    (actor as any)
      .hasAdminAccount()
      .then((has: boolean) => {
        setHasAdmin(has);
        setCheckingAdmin(false);
      })
      .catch(() => {
        setHasAdmin(false);
        setCheckingAdmin(false);
      });
  }, [actor, isFetching]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!actor) return;
    setLoginError("");
    setIsLogging(true);
    try {
      const pwHash = await hashPassword(email, password);
      const valid = await (actor as any).verifyCredentials(
        email.toLowerCase().trim(),
        pwHash,
      );
      if (!valid) {
        setLoginError("Invalid email or password.");
        setIsLogging(false);
        return;
      }
      const roleRaw: string | null = await (actor as any).getAccountRole(
        email.toLowerCase().trim(),
      );
      if (!roleRaw) {
        setLoginError("Account has no role assigned. Contact admin.");
        setIsLogging(false);
        return;
      }

      // Establish ICP session
      await loginWithEmail(email.toLowerCase().trim(), true);

      const roleMap: Record<string, LoggedInUser["role"]> = {
        [ROLE_ADMIN]: "admin",
        [ROLE_CASHIER]: "cashier",
        [ROLE_KITCHEN]: "kitchenStaff",
      };
      const role = roleMap[roleRaw] ?? "cashier";

      // Get name from accounts list
      let name = email.split("@")[0];
      try {
        const accounts: Array<{ email: string; name: string }> = await (
          actor as any
        ).getAllAccounts();
        const found = accounts.find(
          (a) => a.email.toLowerCase() === email.toLowerCase().trim(),
        );
        if (found) name = found.name;
      } catch {}

      onLogin({ email: email.toLowerCase().trim(), name, role });
    } catch (err: any) {
      setLoginError(err?.message || "Login failed. Please try again.");
    } finally {
      setIsLogging(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setSetupError("");
    if (
      !setupName.trim() ||
      !setupEmail.trim() ||
      !setupPassword ||
      !setupConfirm
    ) {
      setSetupError("All fields are required.");
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError("Passwords do not match.");
      return;
    }
    if (setupPassword.length < 6) {
      setSetupError("Password must be at least 6 characters.");
      return;
    }
    setIsSettingUp(true);
    try {
      const identity = await deriveIdentityFromEmail(setupEmail);
      const principalId = identity.getPrincipal().toString();
      const pwHash = await hashPassword(setupEmail, setupPassword);
      const anonActor = await createActorWithConfig();
      await (anonActor as any).registerAccount(
        setupEmail.toLowerCase().trim(),
        setupName.trim(),
        setupPhone.trim(),
        pwHash,
        principalId,
      );
      toast.success("Admin account created! Please log in.");
      setMode("login");
      setHasAdmin(true);
      setSetupName("");
      setSetupEmail("");
      setSetupPhone("");
      setSetupPassword("");
      setSetupConfirm("");
    } catch (err: any) {
      setSetupError(err?.message || "Setup failed. Please try again.");
    } finally {
      setIsSettingUp(false);
    }
  }

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Coffee className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Delicious Cafe</h1>
          <p className="text-sm text-muted-foreground mt-1">POS System</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          {mode === "login" ? (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                Sign In
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your credentials to continue
              </p>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    data-ocid="login.input"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 text-base"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      data-ocid="login.input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 text-base pr-12"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {loginError && (
                  <div
                    data-ocid="login.error_state"
                    className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    {loginError}
                  </div>
                )}

                <Button
                  type="submit"
                  data-ocid="login.submit_button"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isLogging || !email || !password}
                >
                  {isLogging ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>

              <div className="mt-4 text-center text-xs text-muted-foreground">
                Forgot password? Contact your admin.
              </div>

              {!hasAdmin && (
                <div className="mt-4 pt-4 border-t border-border text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    No admin account yet?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    data-ocid="login.setup.button"
                    onClick={() => setMode("setup")}
                  >
                    Set up first admin
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-foreground mb-1">
                First Admin Setup
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Create the initial administrator account
              </p>
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="setup-name">Full Name</Label>
                  <Input
                    id="setup-name"
                    data-ocid="setup.name.input"
                    placeholder="Your full name"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-email">Email</Label>
                  <Input
                    id="setup-email"
                    data-ocid="setup.email.input"
                    type="email"
                    placeholder="admin@cafe.com"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-phone">Phone (optional)</Label>
                  <Input
                    id="setup-phone"
                    data-ocid="setup.phone.input"
                    type="tel"
                    placeholder="+1 234 567 8901"
                    value={setupPhone}
                    onChange={(e) => setSetupPhone(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-password">Password</Label>
                  <Input
                    id="setup-password"
                    data-ocid="setup.password.input"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-confirm">Confirm Password</Label>
                  <Input
                    id="setup-confirm"
                    data-ocid="setup.confirm.input"
                    type="password"
                    placeholder="Repeat password"
                    value={setupConfirm}
                    onChange={(e) => setSetupConfirm(e.target.value)}
                    className="h-11"
                  />
                </div>

                {setupError && (
                  <p
                    data-ocid="setup.error_state"
                    className="text-sm text-destructive"
                  >
                    {setupError}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    data-ocid="setup.cancel_button"
                    className="flex-1 h-11"
                    onClick={() => setMode("login")}
                    disabled={isSettingUp}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    data-ocid="setup.submit_button"
                    className="flex-1 h-11 font-semibold"
                    disabled={isSettingUp}
                  >
                    {isSettingUp ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Admin"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
