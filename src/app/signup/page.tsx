"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Call signup API (enforces the 4-member limit server-side)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Signup failed");
        setLoading(false);
        return;
      }

      // Auto-login after successful signup
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        setError("Account created! Please sign in.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "#141414",
    border: "1px solid rgba(255,255,255,0.1)",
  };

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
          <h1
            className="text-xl font-bold text-white"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Join SUMAIT
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            Create your builder account
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-white outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #ef4444")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
              placeholder="Your full name"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-white outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #ef4444")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-white outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #ef4444")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl text-white outline-none transition-all"
              style={inputStyle}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #ef4444")}
              onBlur={(e) => (e.target.style.boxShadow = "none")}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-white font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{ background: "#ef4444" }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = "brightness(1.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.filter = "none")}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "rgba(255,255,255,0.4)" }}>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium hover:underline"
            style={{ color: "#ef4444" }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
