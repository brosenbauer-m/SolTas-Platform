import ClientGrantForm from "./ClientGrantForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function NewGrantPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-soltas-text">
          Register a funding opportunity
        </h1>
        <p className="text-sm text-soltas-muted">
          Provide as much detail as you can. Your submission will be reviewed by
          an administrator before it goes live.
        </p>
      </div>

      <ClientGrantForm />
    </main>
  );
}
