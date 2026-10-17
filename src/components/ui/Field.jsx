export default function Field({ className = "mb-4 block", ...props }) {
  return (
    <label className={`text-sm font-semibold ${className}`} {...props} />
  );
}
