export default function Select({ className = "", ...props }) {
  return (
    <select
      className={`mt-2 block w-full min-w-0 rounded-lg border border-line bg-white px-3 py-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${className}`}
      {...props}
    />
  );
}
