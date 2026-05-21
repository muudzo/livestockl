import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { useAuthStore } from "../../stores/authStore";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

type Mode = "signin" | "register";

const TICKER = [
  ["LOT 014", "BRAHMAN BULL · GWERU", "US$1,850"],
  ["LOT 021", "MASHONA HEIFER · HARARE", "US$920"],
  ["LOT 033", "BOER GOAT × 3 · CHINHOYI", "US$410"],
  ["LOT 047", "INDIGENOUS COW+CALF · MASVINGO", "US$1,240"],
  ["LOT 058", "TULI STEER · BULAWAYO", "US$1,600"],
];

export function AuthScreen() {
  const navigate = useNavigate();
  const { login, signup, loading } = useAuthStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [signupData, setSignupData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginEmail, loginPassword);
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error("Enter your email address");
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
      if (error) throw error;
      setResetSent(true);
      toast.success("Password reset email sent");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup(signupData.email, signupData.password, {
        first_name: signupData.firstName,
        last_name: signupData.lastName,
        phone: signupData.phone,
      });
      setSignupSuccess(true);
      toast.success("Account created. Check your email to confirm before signing in.");
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    }
  };

  const stagger = {
    hidden: {},
    shown: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  };
  const rise = {
    hidden: { opacity: 0, y: 12 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.2, 0.6, 0.2, 1] as any } },
  };

  return (
    <div className="auth-catalogue min-h-screen bg-kraft-100 text-ink-900 font-body selection:bg-ring-red selection:text-kraft-50">
      {/* paper grain — subtle, feels like catalogue stock */}
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(#3a342c 1px, transparent 1px), radial-gradient(#3a342c 1px, transparent 1px)",
          backgroundSize: "3px 3px, 7px 7px",
          backgroundPosition: "0 0, 1px 2px",
        }}
      />

      <motion.div
        initial="hidden"
        animate="shown"
        variants={stagger}
        className="relative mx-auto grid min-h-screen max-w-[1280px] grid-cols-1 lg:grid-cols-[1.15fr_1fr]"
      >
        {/* ── MASTHEAD ───────────────────────────────────────────────── */}
        <aside className="relative flex flex-col justify-between border-b border-ink-900/20 px-6 py-10 lg:border-b-0 lg:border-r lg:px-12 lg:py-14">
          <motion.div variants={rise} className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-ink-500">
            <span className="inline-block h-px w-8 bg-ink-900/40" />
            <span>Est. MMXXVI · Harare, Zimbabwe</span>
          </motion.div>

          <motion.div variants={rise} className="mt-12 lg:mt-20">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-ring-red">Season I · Catalogue No. 001</div>
            <h1 className="mt-6 font-display text-[64px] leading-[0.88] tracking-[-0.01em] text-ink-900 sm:text-[84px] lg:text-[112px]"
                style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
              The
              <span className="block italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 90" }}>
                Mimoo
              </span>
              <span className="block">Livestock</span>
              <span className="block">Catalogue.</span>
            </h1>
            <p className="mt-8 max-w-[36ch] text-[17px] leading-[1.55] text-ink-700">
              A standing record of every bull, heifer, goat and sheep on the block this season.
              Listed, graded, bid on and settled — in the open.
            </p>
          </motion.div>

          <motion.div variants={rise} className="mt-12 border-t border-ink-900/15 pt-5">
            <div className="mb-3 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500">
              <span>Today on the block</span>
              <span className="text-ink-900/70">5 lots</span>
            </div>
            <ul className="grid grid-cols-1 gap-1.5 font-mono text-[12px] leading-tight">
              {TICKER.map(([lot, desc, price]) => (
                <li key={lot} className="flex items-baseline gap-3 tabular-nums">
                  <span className="w-16 shrink-0 text-ring-red">{lot}</span>
                  <span className="flex-1 truncate text-ink-700">{desc}</span>
                  <span className="text-ink-900">{price}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </aside>

        {/* ── FORM CARD ──────────────────────────────────────────────── */}
        <section className="relative flex items-start justify-center bg-kraft-50 px-6 py-10 lg:items-center lg:px-14 lg:py-14">
          {/* corner stamp */}
          <div aria-hidden className="pointer-events-none absolute right-6 top-6 rotate-[6deg] select-none lg:right-10 lg:top-10">
            <div className="rounded-sm border-2 border-ring-red/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ring-red/80">
              Registered · MIMOO-ZW
            </div>
          </div>

          <motion.div variants={rise} className="w-full max-w-[460px]">
            {/* mode header */}
            <header className="mb-8 flex items-baseline justify-between border-b border-ink-900/15 pb-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
                  {mode === "signin" ? "Entry · Returning bidder" : "Entry · New registrant"}
                </div>
                <h2 className="mt-2 font-display text-[36px] leading-[1.05] text-ink-900"
                    style={{ fontVariationSettings: "'opsz' 72" }}>
                  {mode === "signin" ? "Sign in to bid." : "Register for the ring."}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => { setMode(mode === "signin" ? "register" : "signin"); setSignupSuccess(false); setShowForgotPassword(false); }}
                className="shrink-0 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-500 underline decoration-ink-500/40 decoration-1 underline-offset-4 transition hover:text-ring-red hover:decoration-ring-red"
              >
                {mode === "signin" ? "→ Register" : "← Sign in"}
              </button>
            </header>

            {mode === "signin" && (
              <form onSubmit={handleLogin} className="space-y-6">
                <Field n="01" label="Email" htmlFor="login-email">
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="bidder@example.zw"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className={inputCls}
                  />
                </Field>
                <Field n="02" label="Password" htmlFor="login-password">
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="—"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    minLength={6}
                    className={inputCls}
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(!showForgotPassword)}
                  className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-500 transition hover:text-ring-red"
                >
                  Forgotten password?
                </button>

                {showForgotPassword && (
                  <div className="border-l-2 border-ring-red/60 bg-kraft-100/70 px-4 py-3">
                    {resetSent ? (
                      <p className="font-body text-[14px] italic text-ink-700">
                        Sent. Check your inbox for the reset link.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="email"
                          placeholder="Your email"
                          aria-label="Email for password reset"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="w-full border border-ink-900/30 bg-transparent py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-ink-900 transition hover:border-ring-red hover:text-ring-red"
                        >
                          Send reset link →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <SubmitButton loading={loading} label="Enter the ring" />
              </form>
            )}

            {mode === "register" && (
              signupSuccess ? (
                <div className="border-l-2 border-ring-red py-2 pl-5">
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-ring-red">Registered</div>
                  <p className="mt-2 font-display text-[28px] leading-tight text-ink-900">Check your inbox.</p>
                  <p className="mt-2 text-[15px] text-ink-700">
                    We've sent a confirmation link. Open it, then return here to sign in.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSignup} className="space-y-6">
                  <div className="grid grid-cols-2 gap-5">
                    <Field n="01" label="First name" htmlFor="first-name">
                      <input
                        id="first-name"
                        type="text"
                        placeholder="Tatenda"
                        value={signupData.firstName}
                        onChange={(e) => setSignupData({ ...signupData, firstName: e.target.value })}
                        required
                        className={inputCls}
                      />
                    </Field>
                    <Field n="02" label="Surname" htmlFor="last-name">
                      <input
                        id="last-name"
                        type="text"
                        placeholder="Moyo"
                        value={signupData.lastName}
                        onChange={(e) => setSignupData({ ...signupData, lastName: e.target.value })}
                        required
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <Field n="03" label="Phone" htmlFor="signup-phone">
                    <input
                      id="signup-phone"
                      type="tel"
                      placeholder="+263771234567 or +31647179310"
                      value={signupData.phone}
                      onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                      required
                      maxLength={32}
                      className={inputCls}
                    />
                  </Field>
                  <Field n="04" label="Email" htmlFor="signup-email">
                    <input
                      id="signup-email"
                      type="email"
                      placeholder="bidder@example.zw"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                      className={inputCls}
                    />
                  </Field>
                  <Field n="05" label="Password" htmlFor="signup-password">
                    <input
                      id="signup-password"
                      type="password"
                      placeholder="At least 6 characters"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                      minLength={6}
                      className={inputCls}
                    />
                  </Field>

                  <SubmitButton loading={loading} label="Register for the ring" />
                </form>
              )
            )}

            <footer className="mt-10 border-t border-ink-900/10 pt-5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.2em] text-ink-500">
              <div className="mb-4 flex items-center justify-between">
                <span>Running an auction house?</span>
                <a
                  href="/operators"
                  className="underline decoration-ink-500/40 underline-offset-4 transition hover:text-ring-red hover:decoration-ring-red"
                >
                  Set up your platform →
                </a>
              </div>
              By entering you agree to the{" "}
              <a href="#" className="underline decoration-ink-500/40 underline-offset-4 transition hover:text-ring-red hover:decoration-ring-red">Terms</a>
              {" & "}
              <a href="#" className="underline decoration-ink-500/40 underline-offset-4 transition hover:text-ring-red hover:decoration-ring-red">Privacy</a>
              {" "}of the catalogue.
            </footer>
          </motion.div>
        </section>
      </motion.div>
    </div>
  );
}

// ── primitives ────────────────────────────────────────────────

const inputCls =
  "w-full border-0 border-b border-ink-900/25 bg-transparent px-0 py-2.5 font-body text-[17px] text-ink-900 placeholder:text-ink-500/50 focus:border-ring-red focus:outline-none focus:ring-0 transition-colors";

function Field({ n, label, htmlFor, children }: { n: string; label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-500">
        <span className="text-ring-red">{n}</span>
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group relative mt-2 flex w-full items-center justify-between border border-ring-red bg-ring-red px-5 py-4 font-mono text-[12px] uppercase tracking-[0.25em] text-kraft-50 transition-all duration-200 hover:bg-ring-red-dark disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>{loading ? "Entering…" : label}</span>
      <span className="font-body text-[18px] transition-transform duration-200 group-hover:translate-x-1">→</span>
    </button>
  );
}
