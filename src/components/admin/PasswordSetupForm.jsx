import Button from "../ui/Button";
import Input from "../ui/Input";
import Field from "../ui/Field";
import Panel from "../ui/Panel";
export default function PasswordSetupForm({
  session,
  setAccountPassword,
  busy,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  error,
}) {
  return (
    <Panel className="mx-auto my-8 max-w-md">
      <p className="mb-3 text-xs font-bold tracking-[0.15em] text-accent">
        YOUR ADMIN ACCOUNT
      </p>
      <h1 className="my-4 text-3xl font-bold tracking-tight sm:text-4xl">
        Choose your password.
      </h1>
      <p className="text-sm leading-relaxed text-muted">{session.user.email}</p>
      <form onSubmit={setAccountPassword}>
        <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
          <Field>
            New password
            <Input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </Field>
          <Field>
            Confirm password
            <Input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>
        </fieldset>
        {error && (
          <p role="alert" className="my-3 text-sm leading-relaxed text-danger">
            {error}
          </p>
        )}
        <Button disabled={busy} type="submit">
          {busy ? "Saving password…" : "Set password"}
        </Button>
      </form>
    </Panel>
  );
}
