"use client";

import { useRouter } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();

  async function handleRegister(data: {
    full_name?: string;
    email: string;
    password: string;
  }) {
    // Backend expects { name, email, password }
    await api.post("/api/auth/register", {
      name: data.full_name,
      email: data.email,
      password: data.password,
    });

    // After registration, redirect to login
    router.push("/login");
  }

  return <AuthForm mode="register" onSubmit={handleRegister} />;
}
