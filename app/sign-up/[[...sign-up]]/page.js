import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="reading-shell auth-page">
      <section className="auth-copy">
        <p className="eyebrow">阅读实验室</p>
        <h1>创建你的独立阅读空间。</h1>
        <p>请使用强密码，并完成页面里的真人验证。常见弱密码会被 Clerk 拦截。</p>
        <Link href="/">返回首页</Link>
      </section>
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </main>
  );
}
