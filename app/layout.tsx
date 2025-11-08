import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoPointCloud - Professional Point Cloud Processing",
  description: "High-performance point cloud processing web application. Process millions of points with advanced algorithms. Built with Next.js and Three.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
