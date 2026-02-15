"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Field, FieldLabel } from "@/components/ui/field";
import { MailIcon } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  if (!supabase) {
    return (
      <p className="text-sm text-muted-foreground">
        Configura Supabase Auth en <code className="rounded bg-muted px-1">.env</code> y reinicia el servidor.
      </p>
    );
  }
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailContinue = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    setPassword("");
    setPasswordDialogOpen(true);
  };

  const handlePasswordSignIn = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPasswordDialogOpen(false);
    router.push("/dashboard");
    router.refresh();
  };

  const handleSignUp = async () => {
    if (!password.trim() || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setPasswordDialogOpen(false);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <>
      <Card className="w-full max-w-sm border-border">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-base font-medium">
            Iniciar sesión
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              o
            </span>
          </div>

          <div className="space-y-2">
            <Field>
              <FieldLabel>Correo electrónico</FieldLabel>
              <div className="relative">
                <MailIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailContinue()}
                  className="pl-8"
                />
              </div>
            </Field>
            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              onClick={handleEmailContinue}
              disabled={!email.trim()}
            >
              Continuar con correo
            </Button>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Introduce tu contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Sesión para {email}
            </p>
            <Field>
              <FieldLabel>Contraseña</FieldLabel>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handlePasswordSignIn();
                }}
              />
            </Field>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPasswordDialogOpen(false)}
              >
                Volver
              </Button>
              <Button
                className="flex-1"
                onClick={handlePasswordSignIn}
                disabled={loading || !password.trim()}
              >
                {loading ? "Entrando…" : "Iniciar sesión"}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                className="underline hover:text-foreground"
                onClick={handleSignUp}
                disabled={loading || !password.trim() || password.length < 6}
              >
                Regístrate
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
