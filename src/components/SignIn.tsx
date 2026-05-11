/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogIn, ArrowRight, ShieldCheck, Mail, Lock } from "lucide-react";
import { notifyTalentBridgeSessionChanged, refreshTalentBridgeSession } from "../lib/authBrowser";

interface SignInProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function SignIn({ onSuccess, onCancel }: SignInProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailMode, setEmailMode] = useState<"signin" | "signup">("signin");
  const [signupRole, setSignupRole] = useState<"candidate" | "recruiter">("candidate");
  const [error, setError] = useState<string | null>(null);

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);
    try {
      const path = emailMode === "signin" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(emailMode === "signup" ? { role: signupRole } : {}),
        }),
      });

      const raw = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(raw.error || "Authentication failed. Check your credentials.");
        return;
      }

      await refreshTalentBridgeSession();
      notifyTalentBridgeSessionChanged();
      onSuccess();
    } catch (err: unknown) {
      console.error("Email auth failed", err);
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden"
      >
        <div className="p-8 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-6">
            <LogIn className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            {emailMode === "signin" ? "Sign In" : "Create Account"}
          </h2>
          <p className="text-neutral-500">Use your email and password — stored securely in Postgres.</p>
        </div>

        {error && (
          <div className="px-8 mb-4">
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          </div>
        )}

        <div className="p-8 space-y-4">
          <AnimatePresence mode="wait">
            <motion.form
              key="email-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailAction}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={emailMode === "signup" ? "At least 8 characters" : "••••••••"}
                    autoComplete={emailMode === "signup" ? "new-password" : "current-password"}
                    minLength={emailMode === "signup" ? 8 : undefined}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              {emailMode === "signup" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest ml-1">Account Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSignupRole("candidate")}
                      className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        signupRole === "candidate"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      Candidate
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupRole("recruiter")}
                      className={`px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                        signupRole === "recruiter"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      Recruiter
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
              >
                {loading ? "Processing..." : emailMode === "signin" ? "Sign In" : "Create Account"}
                <ArrowRight className="w-5 h-5 ml-auto opacity-50" />
              </button>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmailMode(emailMode === "signin" ? "signup" : "signin")}
                  className="text-sm font-bold text-blue-600 hover:underline"
                >
                  {emailMode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </motion.form>
          </AnimatePresence>
        </div>

        <div className="p-8 pt-0">
          <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-100">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <p className="text-[11px] text-neutral-500 leading-tight">
              Passwords are hashed with bcrypt. Sessions use signed HTTP-only cookies (configure TALENTBRIDGE_AUTH_SECRET in
              production).
            </p>
          </div>
        </div>

        <div className="p-6 bg-neutral-50 border-t border-neutral-100 text-center">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
