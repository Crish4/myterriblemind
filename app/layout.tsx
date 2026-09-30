import "./globals.css";
import "tldraw/tldraw.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UNSORTED — everything I didn't know where to put",
  description: "A personal infinite canvas for thoughts, drawings, images and beautiful chaos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}