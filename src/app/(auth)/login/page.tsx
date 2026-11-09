import { Suspense } from "react";
import { getDict } from "@/lib/i18n/server";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const dict = await getDict();
  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            PT Surya Roda Perkasa
          </h1>
          <p className="text-sm text-muted-foreground">
            {dict.login.subtitle}
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
