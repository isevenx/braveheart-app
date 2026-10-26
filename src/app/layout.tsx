import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Braveheart Barbershop",
  description: "Book around your life. Chair times that fit your calendar.",
  applicationName: "Braveheart",
  appleWebApp: {
    capable: true,
    title: "Braveheart",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2E594C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-frame">{children}</div>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
