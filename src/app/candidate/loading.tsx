export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full space-y-4">
      <div className="w-10 h-10 border-4 border-ink/10 border-t-sage rounded-full animate-spin"></div>
      <p className="text-ink/60 text-sm font-medium tracking-wide">Loading...</p>
    </div>
  );
}
