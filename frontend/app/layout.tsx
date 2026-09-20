import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "KitchenIQ AI — Smart Restaurant ERP & Predictive Inventory Management",
  description: "Stop food waste & recipe margin leakage. KitchenIQ AI uses predictive analytics, FEFO batch tracking, and dynamic recipe costing to boost restaurant profitability.",
  keywords: ["restaurant ERP", "food waste prevention", "FEFO inventory", "recipe costing software", "AI kitchen analytics", "cloud kitchen ERP"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

