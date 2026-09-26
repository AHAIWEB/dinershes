import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useServerFn } from "@tanstack/react-start";
import { bootstrapNewsroomRole } from "@/lib/newsroom.functions";

type Mode = "signin" | "signup" | "forgot";

function bnError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "ইমেইল বা পাসওয়ার্ড ভুল।";
  if (m.includes("email not confirmed")) return "আগে ইমেইলে পাঠানো নিশ্চিতকরণ লিংক খুলুন।";
  if (m.includes("already registered")) return "এই ইমেইলে আগেই অ্যাকাউন্ট আছে—প্রবেশ করুন।";
  if (m.includes("password")) return "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন (শক্ত পাসওয়ার্ড)।";
  if (m.includes("rate limit")) return "অনেকবার চেষ্টা হয়েছে—কিছুক্ষণ পরে আবার চেষ্টা করুন।";
  return message;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const ensureRole = useServerFn(bootstrapNewsroomRole);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const checkRole = async () => {
    try {
      await ensureRole();
      setReady(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} প্রধান সম্পাদককে আপনার ইমেইল দিয়ে অনুমতি দিতে বলুন।`
          : "অনুমতি নেই",
      );
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void checkRole();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void checkRole();
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const cleanEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError("সঠিক ইমেইল ঠিকানা লিখুন।");
    if (mode !== "forgot" && password.length < 8)
      return setError("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন।");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (err) setError(bnError(err.message));
      } else if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (err) setError(bnError(err.message));
        else if (!data.session)
          setInfo("অ্যাকাউন্ট তৈরি হয়েছে। ইমেইলে পাঠানো নিশ্চিতকরণ লিংক খুলে প্রবেশ করুন।");
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) setError(bnError(err.message));
        else setInfo("পাসওয়ার্ড বদলের লিংক ইমেইলে পাঠানো হয়েছে।");
      }
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/admin`,
      });
      if (result.error) setError(bnError(result.error.message));
      else if (!result.redirected) await checkRole();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google দিয়ে প্রবেশ হয়নি।");
    }
  };

  if (ready) return children;
  const title =
    mode === "signin" ? "নিউজরুমে প্রবেশ" : mode === "signup" ? "নতুন অ্যাকাউন্ট" : "পাসওয়ার্ড ভুলে গেছেন";
  return (
    <main className="grid min-h-screen place-items-center bg-newsprint-tint px-4">
      <div className="w-full max-w-sm border border-newsprint-rule bg-newsprint-paper p-6 shadow-paper">
        <p className="font-display-bn text-2xl text-newsprint-accent">দিনের শেষ খবর</p>
        <h1 className="mt-4 font-serif-bn text-2xl font-bold">{title}</h1>
        <p className="mt-1 font-serif-bn text-sm text-newsprint-muted">
          অনুমোদিত সম্পাদক ও ডিজাইনারদের জন্য।
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            aria-label="ইমেইল"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ইমেইল"
            className="w-full border border-newsprint-rule bg-newsprint-paper px-3 py-2 font-sans text-sm"
          />
          {mode !== "forgot" && (
            <input
              aria-label="পাসওয়ার্ড"
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)"
              className="w-full border border-newsprint-rule bg-newsprint-paper px-3 py-2 font-sans text-sm"
            />
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-newsprint-ink px-3 py-2 font-serif-bn text-newsprint-paper disabled:opacity-60"
          >
            {busy
              ? "অপেক্ষা করুন…"
              : mode === "signin"
                ? "প্রবেশ করুন"
                : mode === "signup"
                  ? "অ্যাকাউন্ট তৈরি করুন"
                  : "লিংক পাঠান"}
          </button>
        </form>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={google}
            className="w-full border border-newsprint-rule px-3 py-2 font-serif-bn"
          >
            Google দিয়ে প্রবেশ
          </button>
          <div className="flex justify-between font-serif-bn text-sm text-newsprint-accent">
            {mode !== "signin" ? (
              <button type="button" onClick={() => setMode("signin")}>
                প্রবেশ পাতায় ফিরুন
              </button>
            ) : (
              <button type="button" onClick={() => setMode("signup")}>
                নতুন অ্যাকাউন্ট
              </button>
            )}
            {mode !== "forgot" && (
              <button type="button" onClick={() => setMode("forgot")}>
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            )}
          </div>
          {info && (
            <p role="status" className="font-serif-bn text-sm text-newsprint-ink">
              {info}
            </p>
          )}
          {error && (
            <p role="alert" className="font-serif-bn text-sm text-newsprint-accent">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
