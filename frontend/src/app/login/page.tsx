"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [mounted, isAuthenticated, isLoading, router]);

  async function handleLogin(data: {
    email: string;
    password: string;
  }) {
    // Backend expects JSON with { email, password }
    const response = await api.post("/api/auth/login", {
      email: data.email,
      password: data.password,
    });

    const { access_token } = response.data;

    let userData;
    try {
      const meRes = await api.get("/api/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      userData = meRes.data;
    } catch {
      // Ignore error if /me fails
    }

    login(access_token, userData);
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-zinc-950">
      <AuthForm mode="login" onSubmit={handleLogin} />
    </main>
  );
}
