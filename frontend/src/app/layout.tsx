import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/shell/AppShell";
import { OperationsProvider } from "@/contexts/OperationsContext";
import { IBM_Plex_Mono, IBM_Plex_Sans, Manrope } from "next/font/google";
import { cn } from "@/lib/utils";
import { WorkflowTabs } from "@/components/shell/WorkflowTabs";
import { StoryModeController } from "@/components/story/StoryModeController";
import { RuntimeBanner } from "@/components/story/RuntimeBanner";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Machine Overwatch",
  description: "Industrial operations command center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(manrope.variable, ibmPlexSans.variable, ibmPlexMono.variable)}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body>
        <OperationsProvider>
          <RuntimeBanner />
          <StoryModeController />
          <AppShell><WorkflowTabs />{children}</AppShell>
        </OperationsProvider>
      </body>
    </html>
  );
}
