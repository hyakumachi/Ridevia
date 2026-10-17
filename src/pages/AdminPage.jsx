import SiteLayout from "../components/layout/SiteLayout";
import Button from "../components/ui/Button";
import Panel from "../components/ui/Panel";
import PasswordSetupForm from "../components/admin/PasswordSetupForm";
import AdminLoginForm from "../components/admin/AdminLoginForm";
import AdminAccessNotice from "../components/admin/AdminAccessNotice";
import CarManagement from "../components/admin/CarManagement";
import BookingManagement from "../components/admin/BookingManagement";
import useAdmin from "../hooks/useAdmin";
export default function AdminPage(props) {
  const {
    setupPending,
    setupError,
    setSetupError,
    setSetupRequired,
    session,
    setupRequired,
    setAccountPassword,
    busy,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    checking,
    login,
    email,
    setEmail,
    password,
    setPassword,
    access,
    setAuthRetry,
    logout,
    view,
    setView,
  } = useAdmin(props);
  return (
    <SiteLayout backLabel="Back to bookings">
      <main className="py-10 print:p-0">
        {setupPending ? (
          <p role="status" className="my-2 text-sm leading-relaxed">
            Verifying your setup link…
          </p>
        ) : setupError ? (
          <Panel className="mx-auto my-8 max-w-md">
            <h2 className="mb-3 text-xl font-bold tracking-tight">
              Setup link unavailable
            </h2>
            <p
              role="alert"
              className="my-3 text-sm leading-relaxed text-danger"
            >
              {setupError}
            </p>
            <Button
              onClick={() => {
                setSetupError("");
                setSetupRequired(false);
              }}
            >
              Go to sign in
            </Button>
          </Panel>
        ) : session && setupRequired ? (
          <PasswordSetupForm
            session={session}
            setAccountPassword={setAccountPassword}
            busy={busy}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            error={error}
          />
        ) : checking ? (
          <p role="status" className="my-2 text-sm leading-relaxed">
            Checking your access…
          </p>
        ) : !session ? (
          <AdminLoginForm
            login={login}
            busy={busy}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={error}
          />
        ) : !access.allowed ? (
          <AdminAccessNotice
            access={access}
            setAuthRetry={setAuthRetry}
            busy={busy}
            logout={logout}
            error={error}
          />
        ) : (
          <>
            <div className="mb-7 flex flex-wrap items-center justify-between gap-5 print:hidden">
              <div>
                <p className="mb-3 text-xs font-bold tracking-[0.15em] text-accent">
                  RIDEVIA ADMIN
                </p>
                <h1 className="my-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  {view === "cars" ? "Car management" : "Booking management"}
                </h1>
                <p className="text-sm leading-relaxed text-muted">
                  Signed in as {session.user.email}
                </p>
              </div>
              <Button disabled={busy} onClick={logout}>
                Sign out
              </Button>
            </div>
            {error && (
              <p
                role="alert"
                className="my-3 text-sm leading-relaxed text-danger"
              >
                {error}
              </p>
            )}
            <nav
              className="mb-7 flex gap-3 print:hidden [&>button[aria-pressed=false]]:bg-sage [&>button[aria-pressed=false]]:text-ink"
              aria-label="Admin sections"
            >
              <Button
                aria-pressed={view === "cars"}
                onClick={() => setView("cars")}
              >
                Cars
              </Button>
              <Button
                aria-pressed={view === "bookings"}
                onClick={() => setView("bookings")}
              >
                Bookings
              </Button>
            </nav>
            {view === "cars" ? <CarManagement /> : <BookingManagement />}
          </>
        )}
      </main>
    </SiteLayout>
  );
}
