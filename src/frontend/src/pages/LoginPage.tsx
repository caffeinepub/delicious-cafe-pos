import { Coffee, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { createActorWithConfig } from "../config";
import { useEmailAuth } from "../hooks/useEmailAuth";
import { deriveIdentityFromEmail, hashPassword } from "../utils/authHelpers";

export default function LoginPage() {
  const { loginWithEmail } = useEmailAuth();

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRemember, setLoginRemember] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail || !loginPassword) {
      setLoginError("Please enter your email and password.");
      return;
    }
    setLoginLoading(true);
    try {
      const pwHash = await hashPassword(loginEmail, loginPassword);
      const anonActor = await createActorWithConfig();
      const valid = await (anonActor as any).verifyCredentials(
        loginEmail.toLowerCase().trim(),
        pwHash,
      );
      if (valid) {
        await loginWithEmail(loginEmail.toLowerCase().trim(), loginRemember);
      } else {
        setLoginError("Invalid email or password.");
      }
    } catch (_err) {
      setLoginError("Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    if (!regName || !regEmail || !regPhone || !regPassword || !regConfirm) {
      setRegError("All fields are required.");
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError("Passwords do not match.");
      return;
    }
    setRegLoading(true);
    try {
      const pwHash = await hashPassword(regEmail, regPassword);
      const id = await deriveIdentityFromEmail(regEmail.toLowerCase().trim());
      const principalId = id.getPrincipal().toText();
      const anonActor = await createActorWithConfig();
      const err = await (anonActor as any).registerAccount(
        regEmail.toLowerCase().trim(),
        regName,
        regPhone,
        pwHash,
        principalId,
      );
      if (err !== "") {
        setRegError(err);
      } else {
        await loginWithEmail(regEmail.toLowerCase().trim(), false);
      }
    } catch (_err) {
      setRegError("Registration failed. Please try again.");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center shadow-lg">
            <Coffee className="w-9 h-9 text-primary" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Delicious Cafe
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              POS &amp; Management System
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full rounded-none border-b border-border bg-muted/40 h-12">
              <TabsTrigger
                value="login"
                data-ocid="login.tab"
                className="flex-1 h-full rounded-none text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-none"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="register"
                data-ocid="register.tab"
                className="flex-1 h-full rounded-none text-sm font-medium data-[state=active]:bg-card data-[state=active]:shadow-none"
              >
                Register
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="p-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    data-ocid="login.email.input"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      data-ocid="login.password.input"
                      type={showLoginPw ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-12 text-base pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showLoginPw ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    data-ocid="login.remember_me.checkbox"
                    checked={loginRemember}
                    onCheckedChange={(v) => setLoginRemember(!!v)}
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Remember me on this device
                  </Label>
                </div>

                {loginError && (
                  <p
                    data-ocid="login.error_state"
                    className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
                  >
                    {loginError}
                  </p>
                )}

                <Button
                  data-ocid="login.primary_button"
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-12 text-base font-semibold"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing
                      in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  Forgot your password?{" "}
                  <span className="text-primary cursor-default">
                    Contact your Admin for a reset.
                  </span>
                </p>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="p-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input
                    id="reg-name"
                    data-ocid="register.name.input"
                    type="text"
                    placeholder="Juan dela Cruz"
                    autoComplete="name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    data-ocid="register.email.input"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Phone</Label>
                  <Input
                    id="reg-phone"
                    data-ocid="register.phone.input"
                    type="tel"
                    placeholder="09XX XXX XXXX"
                    autoComplete="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      data-ocid="register.password.input"
                      type={showRegPw ? "text" : "password"}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="h-12 text-base pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showRegPw ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">Confirm Password</Label>
                  <Input
                    id="reg-confirm"
                    data-ocid="register.confirm_password.input"
                    type="password"
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>

                {regError && (
                  <p
                    data-ocid="register.error_state"
                    className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg"
                  >
                    {regError}
                  </p>
                )}

                <Button
                  data-ocid="register.submit_button"
                  type="submit"
                  disabled={regLoading}
                  className="w-full h-12 text-base font-semibold"
                >
                  {regLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating
                      account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                <p className="text-center text-xs text-muted-foreground pt-1">
                  After registering, an Admin will assign your role.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Built with ❤️ using caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
