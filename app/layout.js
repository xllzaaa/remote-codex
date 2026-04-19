import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata = {
  title: "阅读实验室",
  description: "一个面向读书生活的中文工作台",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="zh-CN">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
