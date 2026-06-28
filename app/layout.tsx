import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FORM LAB",
  description: "A designer's laboratory for controlled irregularity."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
