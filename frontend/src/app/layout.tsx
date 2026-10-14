import type { Metadata } from "next";
import "@xyflow/react/dist/style.css";
import "./globals.css";
import { RelayGuardProvider } from "@/components/providers/RelayGuardProvider";

export const metadata: Metadata = {
  title: "RelayGuard Console",
  description: "Operate and explore reliable serverless webhook delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <RelayGuardProvider>{children}</RelayGuardProvider>
      </body>
    </html>
  );
}
