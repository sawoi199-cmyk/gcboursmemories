import { ExperienceShell } from "@/components/experience/experience-shell";

export default function ExperienceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExperienceShell>{children}</ExperienceShell>;
}
