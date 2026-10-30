import { Upload } from "lucide-react";
import { type ChangeEvent, useRef } from "react";
import { Button } from "../../components/ui/Button";

/** Ekstensi yang diterima `POST /license` (api-specs 04 §4.2); ditawarkan pemilih file, tetap diperiksa server. */
const ACCEPTED_FILES = ".json,application/json";

interface InstallLicenseButtonProps {
  installing: boolean;
  onChoose: (file: File) => void;
}

/** Tombol "Install License" yang membuka pemilih file lisensi JSON dari `tools/license-cli`. */
export function InstallLicenseButton({ installing, onChoose }: InstallLicenseButtonProps) {
  const input = useRef<HTMLInputElement>(null);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onChoose(file);
  }

  return (
    <>
      <input ref={input} type="file" hidden accept={ACCEPTED_FILES} aria-label="License file" onChange={choose} />
      <Button disabled={installing} onClick={() => input.current?.click()}>
        <Upload size={20} aria-hidden />
        Install License
      </Button>
    </>
  );
}
