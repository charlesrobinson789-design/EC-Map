import type { Metadata } from "next";
import React from "react";
import "../styles.css";

export const metadata: Metadata = {
  title: "EC Map Guided Capacity App",
  description: "Guided capacity assessment for midlife cognition and functional patterns."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
