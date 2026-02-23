"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ErrorResponse = { error?: string };

async function getError(response: Response) {
  const data = (await response.json()) as ErrorResponse;
  return data.error ?? "Request failed";
}

function getNextPath() {
  if (typeof window === "undefined") return "/dashboard";

  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/")) return "/dashboard";
  return next;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(await getError(response));
      }

      const nextPath = getNextPath();
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-xl border p-6">
        <h1 className="text-2xl font-semibold">Clinic login</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Sign in to manage reminders and patient workflows.
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="work@clinic.com"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <a
          href="/api/auth/google"
          className="mt-3 block w-full rounded-md border px-4 py-2 text-center text-sm"
        >
          Continue with Google
        </a>

        {status ? (
          <p className="mt-3 rounded-md bg-muted p-3 text-sm">{status}</p>
        ) : null}

        <p className="mt-4 text-sm">
          New clinic?{" "}
          <Link href="/register" className="text-blue-600">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
