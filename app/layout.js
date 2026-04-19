import { ClerkProvider } from "@clerk/nextjs";
import { zhCN } from "@clerk/localizations";
import "./globals.css";

export const metadata = {
  title: "阅读实验室",
  description: "一个面向读书生活的中文工作台",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      localization={zhCN}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/"
      appearance={{
        variables: {
          colorPrimary: "#d3602c",
          colorText: "#1d1a17",
          colorBackground: "#fdf8ee",
          borderRadius: "12px",
          fontFamily: '"Avenir Next", "Trebuchet MS", "Gill Sans", sans-serif',
        },
      }}
    >
      <html lang="zh-CN">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
