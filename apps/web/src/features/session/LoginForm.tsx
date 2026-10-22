import { type LoginRequest, loginRequestSchema } from "@cikal/contracts";
import { Eye, EyeOff, LockKeyhole, LogIn, UserRound } from "lucide-react";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Button } from "../../components/ui/Button";
import { FeedbackMessage } from "../../components/ui/FeedbackMessage";
import { TextField } from "../../components/ui/TextField";
import { useLogin } from "./api";

type FieldErrors = Partial<Record<keyof LoginRequest, string>>;

/**
 * Form halaman "Login" (api-specs 02 §2.2). Field kosong ditolak dengan pesan skema kontrak sebelum request (AC-01.04);
 * pesan gagal dari server tampil apa adanya (AC-01.02, AC-01.05). `notice` membawa pesan sesi berakhir.
 */
export function LoginForm({ notice }: { notice?: string }) {
  const login = useLogin();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginRequestSchema.safeParse({ username: form.get("username"), password: form.get("password") });
    if (!parsed.success) {
      const { fieldErrors: errors } = z.flattenError(parsed.error);
      setFieldErrors({ username: errors.username?.[0], password: errors.password?.[0] });
      return;
    }
    setFieldErrors({});
    login.mutate(parsed.data);
  }

  return (
    <form aria-label="Login" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {login.error ? (
        <FeedbackMessage type="error">{login.error.message}</FeedbackMessage>
      ) : (
        notice && <FeedbackMessage type="warning">{notice}</FeedbackMessage>
      )}
      <TextField
        label="Username"
        name="username"
        required
        autoComplete="username"
        placeholder="Type here"
        icon={UserRound}
        error={fieldErrors.username}
      />
      <TextField
        label="Password"
        name="password"
        type={showPassword ? "text" : "password"}
        required
        autoComplete="current-password"
        placeholder="Type here"
        icon={LockKeyhole}
        error={fieldErrors.password}
        trailing={
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((shown) => !shown)}
            className="text-neutral-5 hover:text-primary"
          >
            {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        }
      />
      <Button type="submit" disabled={login.isPending} className="mt-2 w-full">
        <LogIn size={20} aria-hidden />
        Login
      </Button>
    </form>
  );
}
