export default function GradientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(34,211,238,0.20),transparent),radial-gradient(800px_500px_at_100%_20%,rgba(59,130,246,0.18),transparent),radial-gradient(900px_500px_at_0%_80%,rgba(99,102,241,0.18),transparent)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
    </div>
  );
}


