import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Pusat Kendali Merchant & EDC</h1>
        <p className="mb-6 text-sm text-zinc-500">Masuk dengan akun yang dibuat Superadmin.</p>
        <LoginForm />
      </div>
    </main>
  );
}
