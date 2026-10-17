export default function SiteHeader({ backLabel }) {
  return (
    <header className="flex min-h-20 items-center justify-between gap-4 border-b border-line py-5 print:hidden">
      <a className="text-3xl font-extrabold tracking-tight text-ink" href="#">
        ridevia<span className="ml-1 text-accent">✦</span>
      </a>
      {backLabel ? (
        <a className="text-sm underline underline-offset-4" href="#">
          {backLabel}
        </a>
      ) : (
        <a className="text-sm underline underline-offset-4" href="#contact">
          Contact us
        </a>
      )}
    </header>
  );
}
