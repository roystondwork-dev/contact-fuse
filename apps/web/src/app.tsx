import { useEffect, useState } from "react";

type ServerStatus = "checking" | "ok" | "offline";

export function App() {
  const [status, setStatus] = useState<ServerStatus>("checking");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => setStatus(res.ok ? "ok" : "offline"))
      .catch(() => setStatus("offline"));
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-semibold">contact-fuse</h1>
      <p className="text-neutral-600">
        Merge and de-duplicate contacts from multiple Google accounts — locally and safely.
      </p>
      <p className="text-sm">
        Local server: <strong>{status}</strong>
      </p>
    </main>
  );
}
