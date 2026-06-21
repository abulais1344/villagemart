export default function CategoriesLoading() {
  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header skeleton */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl animate-pulse bg-gray-200" />
        <div className="w-28 h-4 rounded animate-pulse bg-gray-200" />
      </div>

      {/* Card skeletons */}
      <div className="grid grid-cols-2 gap-3 px-4 py-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 p-3 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl animate-pulse bg-gray-200" />
            <div className="w-20 h-3.5 rounded animate-pulse bg-gray-200" />
            <div className="w-12 h-2.5 rounded animate-pulse bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
