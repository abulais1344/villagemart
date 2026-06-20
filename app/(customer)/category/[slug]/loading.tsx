export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header skeleton */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl animate-pulse bg-gray-200" />
        <div className="space-y-1.5">
          <div className="w-36 h-4 rounded animate-pulse bg-gray-200" />
          <div className="w-20 h-3 rounded animate-pulse bg-gray-200" />
        </div>
      </div>

      {/* Product grid skeletons */}
      <main className="px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100">
              <div className="w-full h-36 animate-pulse bg-gray-200" />
              <div className="p-2.5 space-y-1.5">
                <div className="w-3/4 h-3.5 rounded animate-pulse bg-gray-200" />
                <div className="w-1/2 h-3 rounded animate-pulse bg-gray-200" />
                <div className="w-16 h-7 rounded-lg animate-pulse bg-gray-200 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
