export default function SiteFooter() {
  return (
    <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-4 border-t border-line py-8">
      <span className="text-xl font-extrabold tracking-tight">
        ridevia<span className="text-accent">✦</span>
      </span>
      <a className="text-sm underline underline-offset-4" href="#contact">Contact us</a>
      <p className="text-xs text-muted">A ride for wherever life takes you.</p>
    </footer>
  );
}
