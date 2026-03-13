import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ChefHat, Loader2 } from "lucide-react";
import { useState } from "react";
import { createActorWithConfig } from "../config";
import { useActor } from "../hooks/useActor";
import { useEmailAuth } from "../hooks/useEmailAuth";
import { deriveIdentityFromEmail, hashPassword } from "../utils/authHelpers";

interface AdminLoginPageProps {
  onBack: () => void;
}

type Mode = "login" | "setup";

export default function AdminLoginPage({ onBack }: AdminLoginPageProps) {
  const { loginWithEmail } = useEmailAuth();
  const { actor } = useActor();
  const [mode, setMode] = useState<Mode>("login");

  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Setup
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [setupError, setSetupError] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Please enter your email and password.");
      return;
    }
    setLoginLoading(true);
    try {
      const pwHash = await hashPassword(loginEmail, loginPassword);
      const ok = await (actor as any).verifyCredentials(
        loginEmail.toLowerCase().trim(),
        pwHash,
      );
      if (!ok) {
        setLoginError("Invalid email or password.");
        return;
      }
      await loginWithEmail(loginEmail, true);
    } catch (err: any) {
      setLoginError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setSetupError("");
    if (
      !setupName.trim() ||
      !setupEmail.trim() ||
      !setupPassword ||
      !setupToken.trim()
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
    setSetupLoading(true);
    try {
      const identity = await deriveIdentityFromEmail(setupEmail);
      const principalId = identity.getPrincipal().toString();
      const pwHash = await hashPassword(setupEmail, setupPassword);

      // Use anonymous actor for registration
      const anonActor = await createActorWithConfig();
      await (anonActor as any).registerAccount(
        setupEmail.toLowerCase().trim(),
        setupName.trim(),
        "",
        pwHash,
        principalId,
      );

      // Use authenticated actor for admin token
      const authActor = await createActorWithConfig({
        agentOptions: { identity },
      });
      await (authActor as any)._initializeAccessControlWithSecret(
        setupToken.trim(),
      );

      await loginWithEmail(setupEmail, true);
    } catch (err: any) {
      setSetupError(
        err?.message ||
          "Setup failed. Please check your admin token and try again.",
      );
    } finally {
      setSetupLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          type="button"
          data-ocid="admin.login.back.button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg">Admin Panel</h1>
            <p className="text-xs text-slate-500">Delicious Cafe Management</p>
          </div>
        </div>

        {mode === "login" ? (
          <form
            onSubmit={handleLogin}
            className="space-y-5"
            data-ocid="admin.login.panel"
          >
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                data-ocid="admin.login.email.input"
                type="email"
                placeholder="admin@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                data-ocid="admin.login.password.input"
                type="password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            {loginError && (
              <p
                data-ocid="admin.login.error_state"
                className="text-sm text-destructive"
              >
                {loginError}
              </p>
            )}
            <Button
              type="submit"
              data-ocid="admin.login.submit_button"
              className="w-full h-11"
              disabled={loginLoading}
            >
              {loginLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {loginLoading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-center text-sm text-slate-500">
              No admin account yet?{" "}
              <button
                type="button"
                data-ocid="admin.setup.link"
                onClick={() => {
                  setMode("setup");
                  setLoginError("");
                }}
                className="text-primary underline hover:text-primary/80"
              >
                Set up first admin
              </button>
            </p>
          </form>
        ) : (
          <form
            onSubmit={handleSetup}
            className="space-y-4"
            data-ocid="admin.setup.panel"
          >
            <h2 className="font-semibold text-slate-800 text-base">
              Create First Admin Account
            </h2>
            <div className="space-y-2">
              <Label htmlFor="setup-name">Full Name</Label>
              <Input
                id="setup-name"
                data-ocid="admin.setup.name.input"
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
                data-ocid="admin.setup.email.input"
                type="email"
                placeholder="admin@example.com"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-password">Password</Label>
              <Input
                id="setup-password"
                data-ocid="admin.setup.password.input"
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
                data-ocid="admin.setup.confirm.input"
                type="password"
                placeholder="Repeat password"
                value={setupConfirm}
                onChange={(e) => setSetupConfirm(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-token">Admin Token</Label>
              <Input
                id="setup-token"
                data-ocid="admin.setup.token.input"
                placeholder="Get this from your system administrator"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-slate-400">
                Required to create the first admin account.
              </p>
            </div>
            {setupError && (
              <p
                data-ocid="admin.setup.error_state"
                className="text-sm text-destructive"
              >
                {setupError}
              </p>
            )}
            <Button
              type="submit"
              data-ocid="admin.setup.submit_button"
              className="w-full h-11"
              disabled={setupLoading}
            >
              {setupLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {setupLoading ? "Creating account..." : "Create Admin Account"}
            </Button>
            <p className="text-center text-sm text-slate-500">
              <button
                type="button"
                data-ocid="admin.login.link"
                onClick={() => {
                  setMode("login");
                  setSetupError("");
                }}
                className="text-primary underline hover:text-primary/80"
              >
                Back to Login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
