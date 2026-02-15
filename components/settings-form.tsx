"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { toast } from "sonner";
import { DownloadIcon, UploadIcon } from "lucide-react";
import Link from "next/link";

type XCredentialsSet = {
  hasClientId?: boolean;
  hasClientSecret?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
};

type Settings = {
  X_API_CONFIGURED?: boolean;
  X_CREDENTIALS_SET?: XCredentialsSet;
  X_USERNAME?: string | null;
  X_NAME?: string | null;
  X_ACCOUNT_DISPLAY?: string | null;
  POSTING_WINDOWS?: string[];
  CONTENT_CATEGORIES?: { name: string; ratio: number }[];
  UTM_TEMPLATE?: string;
  SIMULATION_MODE?: boolean | string;
  TIMEZONE?: string;
};

export function SettingsForm() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<Settings>({});
  const [xApiForm, setXApiForm] = useState({
    clientId: "",
    clientSecret: "",
    accessToken: "",
    refreshToken: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const error = searchParams.get("error");
    const connected = searchParams.get("connected");
    if (error) {
      toast.error(decodeURIComponent(error));
      window.history.replaceState({}, "", "/settings");
    } else if (connected) {
      toast.success(connected !== "1" ? `Connected as @${connected}` : "Connected to X");
      window.history.replaceState({}, "", "/settings");
      fetch("/api/settings").then((r) => r.json()).then(setSettings);
    }
  }, [searchParams]);

  const updateSetting = async (key: string, value: unknown) => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      setSettings((s) => ({ ...s, [key]: value }));
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/posts");
      const posts = await res.json();
      const blob = new Blob([JSON.stringify(posts, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `posts-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Posts exported");
    } catch {
      toast.error("Failed to export");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string);
        const posts = Array.isArray(data) ? data : [data];
        let imported = 0;
        for (const post of posts) {
          if (post.text) {
            await fetch("/api/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: post.text,
                threadJson: post.threadJson ?? null,
                scheduledAt: post.scheduledAt ?? null,
                tags: post.tags ?? "",
                status: post.status ?? "DRAFT",
              }),
            });
            imported++;
          }
        }
        toast.success(`Imported ${imported} posts`);
      } catch {
        toast.error("Invalid import file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading...</div>;

  const refreshSettings = () => {
    return fetch("/api/settings")
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => toast.error("Failed to load settings"));
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch("/api/x/verify", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(data.username ? `Connected as @${data.username}` : "Connection verified");
        await refreshSettings();
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch {
      toast.error("Connection test failed");
    } finally {
      setTestingConnection(false);
    }
  };

  const saveXApiCredentials = async () => {
    const payload: Record<string, string> = {};
    if (xApiForm.clientId) payload.X_CLIENT_ID = xApiForm.clientId;
    if (xApiForm.clientSecret) payload.X_CLIENT_SECRET = xApiForm.clientSecret;
    if (xApiForm.accessToken) payload.X_ACCESS_TOKEN = xApiForm.accessToken;
    if (xApiForm.refreshToken) payload.X_REFRESH_TOKEN = xApiForm.refreshToken;
    if (Object.keys(payload).length === 0) {
      toast.info("No credentials to save");
      return;
    }
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setXApiForm({ clientId: "", clientSecret: "", accessToken: "", refreshToken: "" });
      setSettings((s) => ({
        ...s,
        X_API_CONFIGURED: true,
        X_CREDENTIALS_SET: {
          ...s.X_CREDENTIALS_SET,
          ...(payload.X_CLIENT_ID && { hasClientId: true }),
          ...(payload.X_CLIENT_SECRET && { hasClientSecret: true }),
          ...(payload.X_ACCESS_TOKEN && { hasAccessToken: true }),
          ...(payload.X_REFRESH_TOKEN && { hasRefreshToken: true }),
        },
      }));
      toast.success("X API credentials saved");
      await handleTestConnection();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">X API Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure your X (Twitter) API credentials for real posting
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={settings.X_API_CONFIGURED ? "default" : "secondary"}>
              {settings.X_API_CONFIGURED ? "Configured" : "Not configured"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection || !settings.X_API_CONFIGURED}
            >
              {testingConnection ? "Testing…" : "Test connection"}
            </Button>
            {(settings.X_CREDENTIALS_SET?.hasClientId && settings.X_CREDENTIALS_SET?.hasClientSecret) ? (
              <Button variant="default" size="sm" asChild>
                <Link href="/api/x/auth">Connect with X</Link>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                Save Client ID + Secret to enable
              </span>
            )}
            {settings.X_API_CONFIGURED && (
              <>
                {settings.X_ACCOUNT_DISPLAY ? (
                  <span className="text-sm">
                    Connected as <strong>{settings.X_ACCOUNT_DISPLAY}</strong>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Test connection to verify
                  </span>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Use <strong>OAuth 2.0 User Context</strong> (PKCE flow). Save Client ID + Secret, then
            click <strong>Connect with X</strong> to sign in and get tokens. Add your callback URL
            to your app at developer.x.com (e.g. <code>http://localhost:3000/api/x/callback</code>).
          </p>
          <FieldGroup>
            <Field>
              <FieldLabel>Client ID</FieldLabel>
              <Input
                type="password"
                value={xApiForm.clientId}
                onChange={(e) => setXApiForm((f) => ({ ...f, clientId: e.target.value }))}
                placeholder={settings.X_CREDENTIALS_SET?.hasClientId ? "Leave blank to keep current" : "Client ID"}
              />
            </Field>
            <Field>
              <FieldLabel>Client Secret</FieldLabel>
              <Input
                type="password"
                value={xApiForm.clientSecret}
                onChange={(e) => setXApiForm((f) => ({ ...f, clientSecret: e.target.value }))}
                placeholder={settings.X_CREDENTIALS_SET?.hasClientSecret ? "Leave blank to keep current" : "Client Secret"}
              />
            </Field>
            <Field>
              <FieldLabel>Access Token</FieldLabel>
              <Input
                type="password"
                value={xApiForm.accessToken}
                onChange={(e) => setXApiForm((f) => ({ ...f, accessToken: e.target.value }))}
                placeholder={settings.X_CREDENTIALS_SET?.hasAccessToken ? "Leave blank to keep current" : "Access Token (required for posting)"}
              />
            </Field>
            <Field>
              <FieldLabel>Refresh Token</FieldLabel>
              <Input
                type="password"
                value={xApiForm.refreshToken}
                onChange={(e) => setXApiForm((f) => ({ ...f, refreshToken: e.target.value }))}
                placeholder={settings.X_CREDENTIALS_SET?.hasRefreshToken ? "Leave blank to keep current" : "Refresh Token"}
              />
            </Field>
            <Button
              variant="outline"
              size="sm"
              onClick={saveXApiCredentials}
              disabled={saving}
            >
              Save X API credentials
            </Button>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Simulation mode</CardTitle>
          <p className="text-sm text-muted-foreground">
            When on, posts are mocked without calling X API
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="simulation"
              checked={String(settings.SIMULATION_MODE) !== "false"}
              onChange={(e) =>
                updateSetting("SIMULATION_MODE", e.target.checked)
              }
              disabled={saving}
              className="rounded border-border"
            />
            <label htmlFor="simulation" className="text-sm">
              Enable simulation mode
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Posting windows</CardTitle>
          <p className="text-sm text-muted-foreground">
            Preferred time slots (e.g., 09:00, 14:00, 18:00)
          </p>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel>Time slots (comma-separated)</FieldLabel>
            <Input
              value={(settings.POSTING_WINDOWS ?? []).join(", ")}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  POSTING_WINDOWS: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean),
                }))
              }
              placeholder="09:00, 14:00, 18:00"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                updateSetting(
                  "POSTING_WINDOWS",
                  settings.POSTING_WINDOWS ?? ["09:00", "14:00", "18:00"]
                )
              }
              disabled={saving}
            >
              Save
            </Button>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content categories</CardTitle>
          <p className="text-sm text-muted-foreground">
            Build/Ship/Learn, tips, behind the scenes, etc.
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            {JSON.stringify(settings.CONTENT_CATEGORIES ?? [])}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Edit in database or extend settings API for full editing.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">UTM template</CardTitle>
          <p className="text-sm text-muted-foreground">
            Optional UTM parameters for links
          </p>
        </CardHeader>
        <CardContent>
          <Field>
            <Input
              value={settings.UTM_TEMPLATE ?? ""}
              onChange={(e) =>
                setSettings((s) => ({ ...s, UTM_TEMPLATE: e.target.value }))
              }
              placeholder="utm_source=twitter&utm_medium=post"
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => updateSetting("UTM_TEMPLATE", settings.UTM_TEMPLATE ?? "")}
              disabled={saving}
            >
              Save
            </Button>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export / Import</CardTitle>
          <p className="text-sm text-muted-foreground">
            Backup or restore your posts as JSON
          </p>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <DownloadIcon className="mr-2 size-4" />
            Export posts
          </Button>
          <Button variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImport}
              />
              <UploadIcon className="mr-2 size-4" />
              Import posts
            </label>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
