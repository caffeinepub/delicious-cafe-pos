import type { Identity } from "@icp-sdk/core/agent";
import {
  type ReactNode,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { deriveIdentityFromEmail } from "../utils/authHelpers";

const STORAGE_KEY = "cafe_auth_email";

export type EmailAuthContext = {
  identity: Identity | null;
  email: string | null;
  isInitializing: boolean;
  loginWithEmail: (email: string, remember: boolean) => Promise<void>;
  logout: () => void;
};

const EmailAuthReactContext = createContext<EmailAuthContext | undefined>(
  undefined,
);

export function EmailAuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [email, setEmailState] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const storedEmail = localStorage.getItem(STORAGE_KEY);
    if (storedEmail) {
      deriveIdentityFromEmail(storedEmail)
        .then((id) => {
          setIdentity(id);
          setEmailState(storedEmail);
        })
        .finally(() => setIsInitializing(false));
    } else {
      setIsInitializing(false);
    }
  }, []);

  const loginWithEmail = useCallback(
    async (emailAddr: string, remember: boolean) => {
      const id = await deriveIdentityFromEmail(emailAddr);
      setIdentity(id);
      setEmailState(emailAddr);
      if (remember) {
        localStorage.setItem(STORAGE_KEY, emailAddr.toLowerCase().trim());
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setIdentity(null);
    setEmailState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo<EmailAuthContext>(
    () => ({ identity, email, isInitializing, loginWithEmail, logout }),
    [identity, email, isInitializing, loginWithEmail, logout],
  );

  return createElement(EmailAuthReactContext.Provider, { value }, children);
}

export function useEmailAuth(): EmailAuthContext {
  const ctx = useContext(EmailAuthReactContext);
  if (!ctx)
    throw new Error("useEmailAuth must be used within EmailAuthProvider");
  return ctx;
}
