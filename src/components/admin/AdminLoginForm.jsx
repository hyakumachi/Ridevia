import Button from "../ui/Button";
import Input from "../ui/Input";
import Field from "../ui/Field";
import Panel from "../ui/Panel";
export default function AdminLoginForm({
  login,
  busy,
  email,
  setEmail,
  password,
  setPassword,
  error,
}) {
  return (
    <Panel className="mx-auto my-8 max-w-md">
      <p className="mb-3 text-xs font-bold tracking-[0.15em] text-accent">
        STAFF ACCESS
      </p>
      <h1 className="my-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Welcome back.
      </h1>
      <p className="text-sm leading-relaxed text-muted">
        Sign in to manage Ridevia’s fleet.
      </p>
      <form onSubmit={login}>
        <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
          <Field>
            Email address
            <Input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field>
            Password
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        </fieldset>
        {error && (
          <p className="my-3 text-sm leading-relaxed text-danger" role="alert">
            {error}
          </p>
        )}
        <Button disabled={busy} type="submit">
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        Only accounts authorized by Ridevia can manage the fleet.
      </p>
    </Panel>
  );
}
