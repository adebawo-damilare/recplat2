import Link from "next/link";

export default function JobNotFound() {
  return (
    <div className="pt-28 pb-20 px-4 max-w-lg mx-auto text-center" data-testid="job-not-found">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Job not available</h1>
      <p className="text-neutral-600 mb-8">This listing may have been filled or removed.</p>
      <Link
        href="/jobs"
        className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
      >
        Browse open roles
      </Link>
    </div>
  );
}
