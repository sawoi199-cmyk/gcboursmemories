import { StudioShell } from "@/components/studio/studio-shell";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default function StudioGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StudioShell supabaseReady={isSupabaseConfigured()}>{children}</StudioShell>
  );
}
