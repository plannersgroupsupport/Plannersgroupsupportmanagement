import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planners Group CMS",
  description: "Planners Group Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', position: 'relative' }}>
        {children}
        <div style={{
          position: 'fixed',
          bottom: '10px',
          right: '15px',
          fontSize: '0.65rem',
          color: '#64748b',
          opacity: 0.5,
          pointerEvents: 'none',
          zIndex: 9999,
          fontWeight: '500',
          letterSpacing: '0.02em'
        }}>
          This Website is Build by Aswin A J
        </div>
      </body>
    </html>
  );
}
