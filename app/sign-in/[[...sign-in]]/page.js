import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="reading-shell auth-page">
      <section className="auth-copy">
        <p className="eyebrow">阅读实验室</p>
        <h1>回到你的私人书房。</h1>
        <p>登录后会加载你的独立书架、打卡记录、摘录和公开分享链接。</p>
        <Link href="/">返回首页</Link>
      </section>
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </main>
  );
}
