"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "#0a0a0a",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-2xl"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center text-white font-bold text-xl"
            style={{ background: "#ef4444" }}
          >
            S
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
            SUMAIT Command Center
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-white outline-none transition-all"
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #ef4444")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
              placeholder="you@sumait.ai"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-white outline-none transition-all"
              style={{
                background: "#141414",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #ef4444")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{ background: "#ef4444" }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.4)" }}>
          New builder?{" "}
          <Link
            href="/signup"
            className="font-medium hover:underline"
            style={{ color: "#ef4444" }}
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
