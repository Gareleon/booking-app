import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClinicRemind",
  description:
    "Production-ready clinic reminder workflows with onboarding and SMS operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
