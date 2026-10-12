import { PageHeader } from "@/components/ui/page-header";

import ClientGrantForm from "./ClientGrantForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Add funding" };

export default function NewGrantPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 pb-20 pt-10 sm:pt-14">
      <PageHeader
        title="Add a funding opportunity"
        description="Share a grant, prize or programme with the community. Add as much detail as you can; our team reviews it before it goes live."
      />
      <ClientGrantForm />
    </main>
  );
}
