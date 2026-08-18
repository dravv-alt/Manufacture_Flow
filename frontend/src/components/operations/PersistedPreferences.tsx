"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOperations } from "@/contexts/OperationsContext";
import { apiFetch } from "@/lib/api-client";

export function PersistedPreferences() {
  const { state, update, currentUser } = useOperations(); const [saved, setSaved] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (!currentUser) return; void apiFetch("/api/preferences").then(async (response) => response.ok ? response.json() as Promise<{ reducedMotion: boolean }> : null).then((value) => { if (value) update({ reducedMotion: value.reducedMotion }); }).catch(() => undefined); }, [currentUser, update]);
  const save = async () => { if (!currentUser) { setError("Sign in to save preferences."); return; } const response = await apiFetch("/api/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reducedMotion: state.reducedMotion }) }); if (!response.ok) { setError("Preferences could not be saved."); return; } setError(""); setSaved(true); };
  return <div className="mt-5"><p className="text-sm text-muted-foreground">Reduced motion is saved to your signed-in account.</p>{error ? <p role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}<Button className="mt-3" onClick={() => void save()}>{saved ? <Check data-icon="inline-start" /> : null}{saved ? "Preferences saved" : "Save preferences"}</Button></div>;
}
