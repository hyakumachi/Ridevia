import SiteLayout from "../components/layout/SiteLayout";
import Panel from "../components/ui/Panel";

const developers = ["guywithbag", "hyakumachi"];

export default function ContactPage() {
  return (
    <SiteLayout backLabel="Back to bookings" showFooter>
      <main className="mx-auto w-full max-w-3xl py-10 sm:py-14">
        <h1 className="text-4xl font-bold tracking-tight">Contact us</h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted">
          Meet the developers. Find us on GitHub to explore our work
          and get in touch.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {developers.map((username) => (
            <Panel as="article" key={username} className="flex flex-col items-start gap-4">
              <img
                src={`https://github.com/${username}.png?size=160`}
                alt={`${username}'s GitHub avatar`}
                width="80"
                height="80"
                className="size-20 rounded-full bg-sage object-cover"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div>
                <h2 className="text-xl font-bold">{username}</h2>
                <p className="mt-1 text-sm text-muted">Ridevia developer</p>
              </div>
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white hover:bg-accent"
              >
                View GitHub profile ↗
              </a>
            </Panel>
          ))}
        </div>
      </main>
    </SiteLayout>
  );
}
