import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
export default function useAdmin({ setupToken = null, setupType = null }) {
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
        ? supabase.auth.verifyOtp({
            token_hash: setupToken,
            type: setupType,
          })
        : Promise.resolve({
            error: true,
          });
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
  return {
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
  };
}
