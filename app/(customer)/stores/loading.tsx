export default function StoresLoading() {
  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header skeleton */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl animate-pulse bg-gray-200" />
        <div className="space-y-1.5">
          <div className="w-40 h-4 animate-pulse bg-gray-200 rounded" />
          <div className="w-28 h-3 animate-pulse bg-gray-200 rounded" />
        </div>
      </div>

      {/* Grid skeletons */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="w-full h-36 rounded-lg animate-pulse bg-gray-200" />
            <div className="w-3/4 h-3.5 mt-2 rounded animate-pulse bg-gray-200" />
            <div className="w-1/2 h-3 mt-1.5 rounded animate-pulse bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
