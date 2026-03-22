import './globals.css';

export const metadata = {
  title: 'GridLedger — NFL Salary Cap Command Center',
  description: 'Real-time NFL salary cap tracker, transaction wire, and GM simulator for all 32 teams.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#f0f1f3" />
      </head>
      <body>{children}</body>
    </html>
  );
}
