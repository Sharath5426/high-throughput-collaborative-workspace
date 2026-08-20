import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'High-Throughput Collaborative Workspace Dashboard',
  description: 'Real-time project management & Kanban workspace platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
