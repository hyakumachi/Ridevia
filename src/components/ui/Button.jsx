export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}) {
  const tone =
    variant === "secondary"
      ? "bg-sage text-ink hover:bg-line"
      : "bg-ink text-white hover:bg-accent";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent ${tone} ${className}`}
      {...props}
    />
  );
}
