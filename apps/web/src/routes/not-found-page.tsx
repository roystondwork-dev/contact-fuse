import { Link } from "react-router";
import { PageHeader } from "../components/page-header.tsx";
import { Button } from "../components/ui/button.tsx";

export function NotFoundPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Page not found" description="This page doesn't exist." />
      <Button asChild variant="secondary" className="w-fit">
        <Link to="/">Go to the start</Link>
      </Button>
    </div>
  );
}
