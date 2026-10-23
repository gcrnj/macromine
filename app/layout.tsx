import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppInit } from "@/components/app-init";
import "@fontsource-variable/dm-sans";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "MacroMine", template: "%s | MacroMine" },
  description: "Your personal macro and food journal.",
  applicationName: "MacroMine",
  appleWebApp: { capable: true, title: "MacroMine", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#151b17" },
  ],
};
const themeScript = `try{var t=localStorage.getItem('macromine-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`;
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Suspense>
          <AppInit />
        </Suspense>
      </body>
    </html>
  );
}
