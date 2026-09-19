// app/layout.jsx
import './globals.css';

export const metadata = {
  title: 'Video Platform',
  description: 'Secure internal recordings',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
