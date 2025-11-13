import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CBA Intelligence Engine',
  description: 'Collective Bargaining Agreement Intelligence Engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}