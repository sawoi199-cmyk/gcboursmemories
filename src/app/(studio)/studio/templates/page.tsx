import { TemplatesGallery } from "@/components/studio/templates-gallery";
import { mockMemories } from "@/config/mock-data";

export default function StudioTemplatesPage() {
  const sample = mockMemories[0];

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12">
      <TemplatesGallery sample={sample} />
    </section>
  );
}
