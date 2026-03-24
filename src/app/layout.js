import './globals.css';
import ClientProviders from '@/components/ClientProviders';

export const metadata = {
  title: 'GridLedger — NFL Salary Cap Command Center',
  description: 'Real-time NFL salary cap tracker, transaction wire, and GM simulator for all 32 teams.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="theme-color" content="#1a1d24" />
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('gl_theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}` }} />
      </head>
      <body><ClientProviders>{children}</ClientProviders></body>
    </html>
  );
}
