export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg animate-pulse bg-gray-200" />
        <div className="w-24 h-4 rounded animate-pulse bg-gray-200" />
      </div>

      {/* Order card skeletons */}
      <div className="max-w-lg mx-auto space-y-3 px-4 py-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="w-1/2 h-4 rounded animate-pulse bg-gray-200" />
              <div className="w-20 h-6 rounded-full animate-pulse bg-gray-200" />
            </div>
            <div className="w-32 h-3 rounded animate-pulse bg-gray-200" />
            <div className="flex items-center justify-between">
              <div className="w-16 h-4 rounded animate-pulse bg-gray-200" />
              <div className="w-24 h-3 rounded animate-pulse bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
