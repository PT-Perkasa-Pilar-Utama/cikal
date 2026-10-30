import { createFileRoute } from "@tanstack/react-router";
import { BlankSlate } from "../../components/ui/BlankSlate";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { useInstallLicense, useLicense } from "../../features/license/api";
import { InstallLicenseButton } from "../../features/license/InstallLicenseButton";
import { LicenseDetails } from "../../features/license/LicenseDetails";
import { useMenuActions } from "../../features/session/api";
import { MenuGuard } from "../../features/session/MenuGuard";
import { ApiError } from "../../lib/api/client";

/** `GET /license` tanpa lisensi tersimpan menjawab 404 "No license is installed" (api-specs 04 §4.1). */
const isNoLicense = (error: Error | null): error is ApiError => error instanceof ApiError && error.status === 404;

/**
 * Halaman "License" (api-specs 04 §4.1, §4.2): masa berlaku dan modul lisensi aktif (AC-100.01). "Install License"
 * memasang file lisensi; file yang diubah menampilkan "License file is invalid" dan lisensi lama tetap tampil (AC-100.02).
 */
function LicensePage() {
  const { data, isPending, error } = useLicense();
  const install = useInstallLicense();
  const canInstall = useMenuActions("SYS-LICENSE").has("UPDATE");

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary">License</h1>
        {canInstall && (
          <InstallLicenseButton installing={install.isPending} onChoose={(file) => install.mutate(file)} />
        )}
      </div>
      {install.isSuccess && <FeedbackMessage type="success">{install.data.message}</FeedbackMessage>}
      {install.error && <FeedbackMessage type="error">{install.error.message}</FeedbackMessage>}
      {error && !isNoLicense(error) && <FeedbackMessage type="error">{error.message}</FeedbackMessage>}
      {isPending && <p className="p-3">Loading...</p>}
      {isNoLicense(error) && (
        <div className="rounded-lg bg-neutral-0 shadow-s">
          <BlankSlate text={error.message} />
        </div>
      )}
      {data && <LicenseDetails license={data} />}
    </section>
  );
}

export const Route = createFileRoute("/system/license")({
  component: () => (
    <MenuGuard menuCode="SYS-LICENSE">
      <LicensePage />
    </MenuGuard>
  ),
});
