import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import CarManagement from "./CarManagement";
import BookingManagement from "./BookingManagement";

export default function Admin({ setupToken = null, setupType = null }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [access, setAccess] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [authRetry, setAuthRetry] = useState(0);
  const [view, setView] = useState("cars");
  const [setupPending, setSetupPending] = useState(Boolean(setupToken));
  const [setupRequired, setSetupRequired] = useState(Boolean(setupToken));
  const [setupError, setSetupError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const setupRequest = useRef(null);

  useEffect(() => {
    if (!setupToken) return;
    let active = true;
    // Reuse the request during StrictMode remounts; invitation tokens are single-use.
    if (!setupRequest.current) {
      setupRequest.current = ["invite", "recovery"].includes(setupType)
        ? supabase.auth.verifyOtp({ token_hash: setupToken, type: setupType })
        : Promise.resolve({ error: true });
    }
    window.history.replaceState(null, "", "#admin");
    setupRequest.current
      .then(({ data, error: verifyError }) => {
        if (!active) return;
        setSetupPending(false);
        if (verifyError)
          setSetupError(
            "This setup link is invalid or expired. Request a new link.",
          );
        else {
          setSession(data.session);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          setSetupPending(false);
          setSetupError(
            "Unable to verify your setup link. Request a new link if it has expired.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [setupToken, setupType]);

  useEffect(() => {
    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        if (_event === "PASSWORD_RECOVERY") setSetupRequired(true);
        setReady(true);
      }
    });
    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        setSession(data.session);
        setReady(true);
        if (sessionError)
          setError("Your session could not be restored. Please sign in again.");
      })
      .catch(() => {
        if (active) {
          setReady(true);
          setError("Unable to restore your session. Please sign in again.");
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    supabase
      .rpc("is_admin")
      .then(({ data, error: accessError }) => {
        if (active)
          setAccess({
            token: session.access_token,
            allowed: data === true && !accessError,
            failed: Boolean(accessError),
          });
      })
      .catch(() => {
        if (active)
          setAccess({
            token: session.access_token,
            allowed: false,
            failed: true,
          });
      });
    return () => {
      active = false;
    };
  }, [session, authRetry]);

  async function login(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError)
        setError(
          "Sign-in failed. Check your email and password, or try again later.",
        );
      else setPassword("");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const { error: logoutError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (logoutError) setError("Sign-out failed. Please try again.");
      else {
        setAccess(null);
        setPassword("");
        setSetupRequired(false);
      }
    } catch {
      setError("Sign-out failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function setAccountPassword(event) {
    event.preventDefault();
    if (busy) return;
    if (newPassword.length < 12 || newPassword !== confirmPassword) {
      setError("Use at least 12 characters and enter the same password twice.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError)
        setError("Your password could not be updated. Please try again.");
      else {
        setNewPassword("");
        setConfirmPassword("");
        setSetupRequired(false);
      }
    } catch {
      setError("Your password could not be updated. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const checking =
    !ready || (session && access?.token !== session.access_token);
  return (
    <div className="site">
      <header className="header">
        <a className="brand" href="#">
          ridevia<span>✦</span>
        </a>
        <a className="text-link" href="#">
          Back to bookings
        </a>
      </header>
      <main className="admin-main">
        {setupPending ? (
          <p role="status">Verifying your setup link…</p>
        ) : setupError ? (
          <section className="panel login-panel">
            <h2>Setup link unavailable</h2>
            <p role="alert" className="error">
              {setupError}
            </p>
            <button
              onClick={() => {
                setSetupError("");
                setSetupRequired(false);
              }}
            >
              Go to sign in
            </button>
          </section>
        ) : session && setupRequired ? (
          <section className="panel login-panel">
            <p className="eyebrow">YOUR ADMIN ACCOUNT</p>
            <h1 className="page-title">Choose your password.</h1>
            <p className="muted">{session.user.email}</p>
            <form onSubmit={setAccountPassword}>
              <fieldset disabled={busy}>
                <label>
                  New password
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>
                <label>
                  Confirm password
                  <input
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </label>
              </fieldset>
              {error && (
                <p role="alert" className="error">
                  {error}
                </p>
              )}
              <button disabled={busy} type="submit">
                {busy ? "Saving password…" : "Set password"}
              </button>
            </form>
          </section>
        ) : checking ? (
          <p role="status">Checking your access…</p>
        ) : !session ? (
          <section className="panel login-panel">
            <p className="eyebrow">STAFF ACCESS</p>
            <h1 className="page-title">Welcome back.</h1>
            <p className="muted">Sign in to manage Ridevia’s fleet.</p>
            <form onSubmit={login}>
              <fieldset disabled={busy}>
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
              </fieldset>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button disabled={busy} type="submit">
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>
            <p className="fine-print">
              Only accounts authorized by Ridevia can manage the fleet.
            </p>
          </section>
        ) : !access.allowed ? (
          <section className="panel login-panel">
            <h2>
              {access.failed
                ? "Unable to verify access"
                : "Admin access required"}
            </h2>
            <p>
              {access.failed
                ? "Please retry the access check."
                : "This account is signed in, but has not been authorized as a Ridevia administrator."}
            </p>
            {access.failed && (
              <button onClick={() => setAuthRetry((value) => value + 1)}>
                Retry access check
              </button>
            )}
            <button disabled={busy} onClick={logout}>
              Sign out
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </section>
        ) : (
          <>
            <div className="admin-heading">
              <div>
                <p className="eyebrow">RIDEVIA ADMIN</p>
                <h1 className="page-title">
                  {view === "cars" ? "Car management" : "Booking management"}
                </h1>
                <p className="muted">Signed in as {session.user.email}</p>
              </div>
              <button disabled={busy} onClick={logout}>
                Sign out
              </button>
            </div>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <nav className="admin-nav" aria-label="Admin sections">
              <button
                aria-pressed={view === "cars"}
                onClick={() => setView("cars")}
              >
                Cars
              </button>
              <button
                aria-pressed={view === "bookings"}
                onClick={() => setView("bookings")}
              >
                Bookings
              </button>
            </nav>
            {view === "cars" ? <CarManagement /> : <BookingManagement />}
          </>
        )}
      </main>
    </div>
  );
}
