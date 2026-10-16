import { useNavigate } from "react-router";
import { toast } from "sonner";
import { PageHeader } from "../components/page-header.tsx";
import { DeleteLocalDataSection } from "../features/settings/components/delete-local-data-section.tsx";
import { GoogleClientSetup } from "../features/settings/components/google-client-setup.tsx";
import { ThemeSetting } from "../features/settings/components/theme-setting.tsx";

export type WelcomeLocationState = { isLocalDataDeleted?: boolean };

export function SettingsPage() {
  const navigate = useNavigate();

  const handleDeleted = () => {
    toast.success("All local data deleted.");
    const state: WelcomeLocationState = { isLocalDataDeleted: true };
    void navigate("/welcome", { replace: true, state });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Settings" />
      <GoogleClientSetup />
      <section
        aria-labelledby="appearance-title"
        className="flex flex-col gap-4 rounded-md border border-border p-4 sm:p-6"
      >
        <h2 id="appearance-title" className="text-base font-semibold">
          Appearance
        </h2>
        <ThemeSetting />
      </section>
      <DeleteLocalDataSection onDeleted={handleDeleted} />
    </div>
  );
}
