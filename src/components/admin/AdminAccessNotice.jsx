import Button from "../ui/Button";
import Panel from "../ui/Panel";
export default function AdminAccessNotice({
  access,
  setAuthRetry,
  busy,
  logout,
  error,
}) {
  return (
    <Panel className="mx-auto my-8 max-w-md">
      <h2 className="mb-3 text-xl font-bold tracking-tight">
        {access.failed ? "Unable to verify access" : "Admin access required"}
      </h2>
      <p className="my-2 text-sm leading-relaxed">
        {access.failed
          ? "Please retry the access check."
          : "This account is signed in, but has not been authorized as a Ridevia administrator."}
      </p>
      {access.failed && (
        <Button onClick={() => setAuthRetry((value) => value + 1)}>
          Retry access check
        </Button>
      )}
      <Button disabled={busy} onClick={logout}>
        Sign out
      </Button>
      {error && (
        <p role="alert" className="my-3 text-sm leading-relaxed text-danger">
          {error}
        </p>
      )}
    </Panel>
  );
}
