import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Recipe Book",
  description: "A personal recipe collection",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans bg-brand-50 text-neutral-700 antialiased">
        {children}
      </body>
    </html>
  );
}
