export default function Input({ type = "text", className = "", ...props }) {
  const style =
    type === "checkbox"
      ? "size-5 shrink-0 accent-accent"
      : "mt-2 block w-full min-w-0 rounded-lg border border-line bg-white px-3 py-3 text-sm text-ink file:mr-3 file:rounded file:border-0 file:bg-sage file:px-2 file:py-1";
  return (
    <input
      type={type}
      className={`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${style} ${className}`}
      {...props}
    />
  );
}
