import "./globals.css";
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { I18nProvider } from "@/lib/i18n";
import { Chrome } from "@/components/Chrome";

export const metadata = {
  title: "Commit — future ASP capacity",
  description: "Reserve future capacity from participating ASPs, with clear terms for execution, fallback and settlement.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F3ED",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <Chrome>{children}</Chrome>
        </I18nProvider>
      </body>
    </html>
  );
}
