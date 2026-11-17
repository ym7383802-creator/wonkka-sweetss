import React, { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

interface AdminLoginPageProps {
  onSuccess: (email: string, sessionToken?: string) => void;
  onBackToStore: () => void;
}

export default function AdminLoginPage({
  onSuccess,
  onBackToStore,
}: AdminLoginPageProps) {
  const [checking, setChecking] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/admin/auth/status", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          authenticated?: boolean;
          setupRequired?: boolean;
          email?: string;
        };
        if (!active) return;
        if (data.authenticated && data.email) {
          onSuccess(data.email);
          return;
        }
        setSetupRequired(Boolean(data.setupRequired));
      } catch {
        // Keep login form displayed
      } finally {
        if (active) setChecking(false);
      }
    };
    void checkStatus();
    return () => {
      active = false;
    };
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Please enter your email and password.");
      return;
    }

    if (setupRequired) {
      if (password.length < 8) {
        setErrorMsg("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const endpoint = setupRequired
        ? "/api/admin/auth/setup"
        : "/api/admin/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        authenticated?: boolean;
        email?: string;
        sessionToken?: string;
        setupRequired?: boolean;
        error?: string;
      };

      if (!res.ok || !data.authenticated) {
        if (data.setupRequired) {
          setSetupRequired(true);
        }
        setErrorMsg(data.error || "Authentication failed. Please verify your credentials.");
        return;
      }

      onSuccess(data.email || email.trim(), data.sessionToken);
    } catch {
      setErrorMsg("Network error connecting to authentication server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100svh] flex flex-col bg-[#f6f1ea] text-[#211a15]">
      <header className="border-b border-[var(--color-border)] bg-[#f6f1ea]/95">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex min-h-[40px] items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#5c4e43] transition-colors hover:text-[#211a15] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Storefront</span>
          </button>
          <span className="font-display text-lg font-bold tracking-tight text-[#211a15]">
            Wonka Sweets
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md border border-[var(--color-border)] bg-[#efe8de]/75 p-6 shadow-xl sm:p-9">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center border border-[#c4a27a]/60 bg-[#f6f1ea] text-[#8c673e]">
              {setupRequired ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7b6857]">
              Private Owner Portal
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-[#211a15] sm:text-3xl">
              {setupRequired ? "Create Owner Access" : "Admin Sign In"}
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-[#5c4e43] sm:text-sm">
              {setupRequired
                ? "Set your private owner email and password once to lock and protect the Wonka Sweets Admin Dashboard."
                : "Sign in with your authorized administrator credentials to manage products, prices, WhatsApp settings, and customer orders."}
            </p>
          </div>

          {checking ? (
            <div className="py-10 text-center text-xs font-medium uppercase tracking-[0.16em] text-[#6b5a4d]">
              Checking authorization...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-login-email"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4e43]"
                >
                  Owner Email
                </label>
                <input
                  id="admin-login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="owner@wonkasweets.com"
                  className="w-full border border-[#211a15]/20 bg-white/85 px-3.5 py-2.5 text-base sm:text-sm text-[#211a15] placeholder:text-[#8c7b6d] focus:border-[#c4a27a] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="admin-login-password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4e43]"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={setupRequired ? "new-password" : "current-password"}
                    required
                    minLength={setupRequired ? 8 : 1}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder={setupRequired ? "Minimum 8 characters" : "Enter password"}
                    className="w-full border border-[#211a15]/20 bg-white/85 px-3.5 py-2.5 pr-11 text-base sm:text-sm text-[#211a15] placeholder:text-[#8c7b6d] focus:border-[#c4a27a] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#5c4e43] hover:text-[#211a15] cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {setupRequired ? (
                <div>
                  <label
                    htmlFor="admin-login-confirm"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[#5c4e43]"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="admin-login-confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Re-enter password"
                    className="w-full border border-[#211a15]/20 bg-white/85 px-3.5 py-2.5 text-base sm:text-sm text-[#211a15] placeholder:text-[#8c7b6d] focus:border-[#c4a27a] focus:outline-none"
                  />
                </div>
              ) : null}

              {errorMsg ? (
                <div
                  role="alert"
                  className="border border-[#8f2d24]/30 bg-[#8f2d24]/10 px-3.5 py-2.5 text-xs font-medium text-[#7a2119]"
                >
                  {errorMsg}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="min-h-[46px] w-full bg-[#211a15] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#f6f1ea] transition-opacity hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {submitting
                  ? "Verifying..."
                  : setupRequired
                  ? "Create Owner Account & Enter"
                  : "Sign In to Dashboard"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
