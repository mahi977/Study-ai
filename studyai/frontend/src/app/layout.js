import './globals.css';
export const metadata = { title: 'StudyAI — Smart Study Platform', description: 'AI-Powered Study Tracker & Productivity Analytics' };
export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
