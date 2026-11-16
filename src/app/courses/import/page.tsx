import { ImportForm } from "./ImportForm";

export default function ImportPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Import a course</h1>
        <p className="mt-1 text-sm text-muted">
          Upload or paste course JSON, for example a file Claude wrote into <code className="rounded bg-surface-2 px-1">curricula/</code> or one
          exported from another course. You become the owner of the imported copy.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
