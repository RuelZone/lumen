"use client";

import { useState } from "react";
import {
  ShieldCheck,
  LockKeyhole,
  ArrowRight,
  Stethoscope,
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    // Temporary frontend-only login.
    // Backend authentication will be connected later.
    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-white text-[#19324D]">

      {/* Main container */}
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">

        {/* Logo */}
        <header className="flex justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#16835B]">
              <span className="text-2xl font-bold text-white">
                L
              </span>
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[#19324D]">
                Lumen
              </h1>

              <p className="text-xs text-[#667085]">
                Local intelligence. Private by design.
              </p>
            </div>
          </div>
        </header>

        {/* Login area */}
        <div className="flex flex-1 items-center justify-center py-12">

          <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_8px_40px_rgba(25,50,77,0.08)] md:grid-cols-2">

            {/* Left information panel */}
            <div className="flex flex-col justify-center bg-[#F3FAF6] p-10 md:p-12">

              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Stethoscope
                  size={26}
                  className="text-[#16835B]"
                />
              </div>

              <h2 className="text-3xl font-semibold leading-tight text-[#19324D]">
                Healthcare AI,
                <br />
                where your data lives.
              </h2>

              <p className="mt-4 max-w-sm text-sm leading-6 text-[#667085]">
                Lumen helps hospital staff securely access, understand,
                and work with patient records using AI that runs locally
                within the hospital.
              </p>

              <div className="mt-8 space-y-4">

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-[#DDF4E8] p-1.5">
                    <ShieldCheck
                      size={15}
                      className="text-[#16835B]"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#19324D]">
                      Privacy-first
                    </p>

                    <p className="mt-0.5 text-xs text-[#667085]">
                      Patient data stays within the hospital environment.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-[#DDF4E8] p-1.5">
                    <LockKeyhole
                      size={15}
                      className="text-[#16835B]"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#19324D]">
                      Works offline
                    </p>

                    <p className="mt-0.5 text-xs text-[#667085]">
                      Local AI remains available even without internet.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Login form */}
            <div className="p-8 md:p-12">

              <div className="mb-8">
                <p className="text-sm font-medium text-[#16835B]">
                  Hospital Staff
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#19324D]">
                  Welcome back
                </h2>

                <p className="mt-2 text-sm text-[#667085]">
                  Sign in to access your hospital workspace.
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5"
              >

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#19324D]">
                    Email address
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.com"
                    required
                    className="w-full rounded-xl border border-[#D9DEE5] bg-white px-4 py-3 text-sm text-[#19324D] outline-none transition placeholder:text-[#98A2B3] focus:border-[#16835B] focus:ring-4 focus:ring-[#16835B]/10"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-sm font-medium text-[#19324D]">
                      Password
                    </label>

                    <button
                      type="button"
                      className="text-xs font-medium text-[#16835B] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-[#D9DEE5] bg-white px-4 py-3 text-sm text-[#19324D] outline-none transition placeholder:text-[#98A2B3] focus:border-[#16835B] focus:ring-4 focus:ring-[#16835B]/10"
                  />
                </div>

                {/* Login */}
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#16835B] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#116B49] active:scale-[0.99]"
                >
                  Log in
                  <ArrowRight size={17} />
                </button>

              </form>

              {/* Local security message */}
              <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#EEF0F2] pt-6">
                <ShieldCheck
                  size={15}
                  className="text-[#16835B]"
                />

                <p className="text-xs text-[#667085]">
                  Your hospital data is processed locally.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center">
          <p className="text-xs text-[#98A2B3]">
            Lumen · Local AI for connected care
          </p>
        </footer>

      </div>
    </main>
  );
}