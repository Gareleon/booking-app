import Link from "next/link";

const plans = [
  {
    name: "Starter",
    price: "$39",
    cadence: "/month",
    description: "For solo clinics starting automated reminders.",
    features: ["Up to 500 reminders", "1 clinic workspace", "Email support"],
  },
  {
    name: "Growth",
    price: "$99",
    cadence: "/month",
    description: "For growing clinic networks with multiple staff members.",
    features: [
      "Up to 2,500 reminders",
      "5 staff seats",
      "Priority SMS delivery",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    description: "For larger healthcare groups with compliance workflows.",
    features: [
      "Unlimited reminders",
      "Multi-location analytics",
      "Dedicated success manager",
    ],
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16">
        <header className="flex items-center justify-between">
          <p className="text-lg font-semibold">ClinicRemind</p>
          <div className="flex gap-3">
            <Link href="/login" className="rounded-md border px-4 py-2 text-sm">
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
            >
              Get started
            </Link>
          </div>{" "}
        </header>
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Reduce no-shows with automated appointment reminders.
            </h1>
            <p className="mt-4 text-zinc-600 dark:text-zinc-300">
              Built for dental and outpatient clinics to schedule reminders,
              send SMS at scale, and centralize patient communication.
            </p>
            <div className="mt-6 flex gap-3">
              <Link
                href="/register"
                className="rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white"
              >
                Create clinic account
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md border px-5 py-3 text-sm font-medium"
              >
                View dashboard
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <p className="text-sm text-zinc-500">Today&apos;s performance</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-zinc-500">Reminders sent</p>
                <p className="text-2xl font-semibold">1,284</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-zinc-500">Delivery rate</p>
                <p className="text-2xl font-semibold">98.4%</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-zinc-500">No-show drop</p>
                <p className="text-2xl font-semibold">-27%</p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-zinc-500">Active clinics</p>
                <p className="text-2xl font-semibold">54</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-2xl font-semibold">Plans and pricing</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Mock pricing for product planning and UI validation.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-xl border p-5 ${
                plan.highlighted ? "border-blue-600" : ""
              }`}
            >
              <h3 className="text-lg font-medium">{plan.name}</h3>
              <p className="mt-2 text-3xl font-semibold">
                {plan.price}
                <span className="text-sm font-normal text-zinc-500">
                  {plan.cadence}
                </span>
              </p>
              <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
