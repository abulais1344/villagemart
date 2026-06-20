export default function StoreDetailLoading() {
  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Hero skeleton */}
      <div className="h-52 w-full animate-pulse bg-gray-200" />

      {/* Info bar skeleton */}
      <div className="h-10 mx-0 animate-pulse bg-gray-100 border-b border-gray-100" />

      {/* Filter bar skeleton */}
      <div className="px-4 py-3 flex gap-2 border-b border-gray-100">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-20 h-8 rounded-full animate-pulse bg-gray-200" />
        ))}
      </div>

      {/* Search bar skeleton */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="w-full h-9 rounded-xl animate-pulse bg-gray-200" />
      </div>

      {/* Menu heading */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="w-32 h-4 rounded animate-pulse bg-gray-200" />
      </div>

      {/* Product card skeletons */}
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">
          {/* Left: text lines + button */}
          <div className="flex-1 space-y-2">
            <div className="w-4 h-4 rounded-sm animate-pulse bg-gray-200" />
            <div className="w-3/4 h-4 rounded animate-pulse bg-gray-200" />
            <div className="w-full h-3 rounded animate-pulse bg-gray-200" />
            <div className="w-1/2 h-3 rounded animate-pulse bg-gray-200" />
            <div className="w-16 h-8 rounded-lg animate-pulse bg-gray-200 mt-2" />
          </div>
          {/* Right: image */}
          <div className="shrink-0 w-28 h-24 rounded-xl animate-pulse bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
