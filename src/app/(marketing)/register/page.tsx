"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Registration = {
  clinicName: string;
  adminName: string;
  email: string;
  phone: string;
  address: string;
  clinicType: string;
  seats: string;
};

const initialState: Registration = {
  clinicName: "",
  adminName: "",
  email: "",
  phone: "",
  address: "",
  clinicType: "Dental",
  seats: "3",
};

export default function RegisterPage() {
  const [form, setForm] = useState<Registration>(initialState);
  const [status, setStatus] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(
      `Thanks ${form.adminName}, ${form.clinicName} is pre-registered. We will contact you at ${form.email}.`
    );
    setForm(initialState);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-xl border p-6">
        <h1 className="text-2xl font-semibold">Register your clinic</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Provide details required for onboarding, billing, and support.
        </p>
        <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
          <input
            required
            value={form.clinicName}
            onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
            placeholder="Clinic legal name"
            className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            required
            value={form.adminName}
            onChange={(e) => setForm({ ...form, adminName: e.target.value })}
            placeholder="Administrator full name"
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="admin@clinic.com"
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="Primary phone"
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            required
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Street, city, country"
            className="rounded-md border px-3 py-2 text-sm"
          />
          <select
            aria-label="Clinic type"
            value={form.clinicType}
            onChange={(e) => setForm({ ...form, clinicType: e.target.value })}
            className="rounded-md border px-3 py-2 text-sm"
          >
            <option>Dental</option>
            <option>Orthodontics</option>
            <option>General Practice</option>
          </select>
          <input
            required
            value={form.seats}
            onChange={(e) => setForm({ ...form, seats: e.target.value })}
            placeholder="Expected staff seats"
            className="rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white sm:col-span-2"
          >
            Submit registration
          </button>
        </form>
        {status ? (
          <p className="mt-4 rounded-md bg-muted p-3 text-sm">{status}</p>
        ) : null}
        <p className="mt-4 text-sm">
          Already registered?{" "}
          <Link href="/login" className="text-blue-600">
            Go to login
          </Link>
        </p>
      </div>
    </main>
  );
}
