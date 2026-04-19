import "./globals.css";

export const metadata = {
  title: "Reading Lab",
  description: "A vibe-coded reading workspace",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
