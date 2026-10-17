export default function Panel({
  as: Tag = "section",
  className = "",
  ...props
}) {
  return (
    <Tag
      className={`min-w-0 rounded-2xl border border-line bg-white p-5 sm:p-6 ${className}`}
      {...props}
    />
  );
}
