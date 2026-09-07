import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/lib/context/AppContext';
import Navbar from '@/components/ui/Navbar';

export const metadata: Metadata = {
  title: 'BAHI — Cash-Flow Credit Intelligence',
  description:
    'Build credit from the financial behavior you already have. Explainable alternative credit intelligence for gig workers and underserved borrowers.',
  keywords: 'credit score, gig workers, financial inclusion, cash flow analysis, alternative credit',
  openGraph: {
    title: 'BAHI — Cash-Flow Credit Intelligence',
    description: 'Explainable alternative credit intelligence platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AppProvider>
          <div className="app-shell">
            <Navbar />
            <main className="main-content">
              {children}
            </main>
            <div className="disclaimer-bar" role="note">
              🔬 BAHI Demo — All data is simulated. Scores are not real financial assessments. For demonstration purposes only.
            </div>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
