"use client";

import React, { useState } from "react";
import Link from "next/link";
import axios from "axios";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (data: {
    full_name?: string;
    email: string;
    password: string;
  }) => Promise<void>;
}

export default function AuthForm({
  mode,
  onSubmit,
}: AuthFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (mode === "register" && fullName.trim().length < 3) {
      setError("Full name must be at least 3 characters.");
      return;
    }

    if (!email.includes("@")) {
      setError("Enter a valid email.");
      return;
    }

    const minPassLen = mode === "register" ? 8 : 6;
    if (password.length < minPassLen) {
      setError(`Password must be at least ${minPassLen} characters.`);
      return;
    }

    try {
      setLoading(true);

      await onSubmit({
        full_name: fullName,
        email,
        password,
      });
    } catch (err: unknown) {
      let detailMsg = "Something went wrong.";
      if (axios.isAxiosError(err) && err.response?.data) {
        const detail = err.response.data.detail;
        if (typeof detail === "string") {
          detailMsg = detail;
        } else if (Array.isArray(detail)) {
          detailMsg = detail
            .map((item: { msg?: string }) => item.msg || JSON.stringify(item))
            .join(". ");
        }
      }
      setError(detailMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 shadow-xl rounded-xl p-8 border border-zinc-200 dark:border-zinc-800">
      <h1 className="text-3xl font-bold text-center mb-6 text-zinc-900 dark:text-zinc-100">
        {mode === "login" ? "Login" : "Create Account"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {mode === "register" && (
          <div>
            <label className="block mb-2 font-medium text-zinc-700 dark:text-zinc-300">
              Full Name
            </label>

            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>
        )}

        <div>
          <label className="block mb-2 font-medium text-zinc-700 dark:text-zinc-300">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="example@email.com"
          />
        </div>

        <div>
          <label className="block mb-2 font-medium text-zinc-700 dark:text-zinc-300">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="********"
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
        >
          {loading
            ? "Please wait..."
            : mode === "login"
            ? "Login"
            : "Register"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign Up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
