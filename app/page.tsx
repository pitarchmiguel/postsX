import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  if (!supabase) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="max-w-sm space-y-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm">
          <p className="font-medium text-destructive">Configuración de Supabase Auth</p>
          <p className="text-muted-foreground">
            Añade <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
            <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> a tu{" "}
            <code className="rounded bg-muted px-1">.env</code> y reinicia el servidor.
          </p>
        </div>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Schedule everything and grow fast on X
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
