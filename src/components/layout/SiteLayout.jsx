import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
export default function SiteLayout({
  backLabel,
  showFooter = false,
  children,
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col break-words px-5 sm:px-8 [&>header]:shrink-0 [&>main]:flex-1 print:min-h-0 print:block print:max-w-none print:p-0">
      <SiteHeader backLabel={backLabel} />
      {children}
      {showFooter && <SiteFooter />}
    </div>
  );
}
