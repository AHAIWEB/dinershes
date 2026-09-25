import { createFileRoute, redirect } from "@tanstack/react-router";
import { listPublishedEditions } from "@/lib/editions.functions";

export const Route = createFileRoute("/issue/")({
  head: () => ({ meta: [
    { title: "সর্বশেষ সংস্করণ · দিনের শেষ খবর" },
    { name: "description", content: "দিনের শেষ খবরের সর্বশেষ প্রকাশিত বাংলা ই-পেপার পড়ুন।" },
    { property: "og:title", content: "সর্বশেষ সংস্করণ · দিনের শেষ খবর" },
    { property: "og:description", content: "সর্বশেষ প্রকাশিত বাংলা ই-পেপার পড়ুন ও প্রিন্ট করুন।" },
    { property: "og:type", content: "article" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  loader: async () => {
    const editions = await listPublishedEditions({ data: {} });
    if (editions[0]) throw redirect({ to: "/issue/$editionId", params: { editionId: editions[0].id } });
    throw redirect({ to: "/archive" });
  },
  component: () => null,
});