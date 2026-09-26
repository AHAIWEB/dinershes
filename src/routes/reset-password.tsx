import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "নতুন পাসওয়ার্ড — দিনের শেষ খবর" },
      { name: "description", content: "দিনের শেষ খবর নিউজরুম অ্যাকাউন্টের নতুন পাসওয়ার্ড দিন।" },
      { property: "og:title", content: "নতুন পাসওয়ার্ড — দিনের শেষ খবর" },
      { property: "og:description", content: "নিউজরুম অ্যাকাউন্টের পাসওয়ার্ড বদলান।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setMsg("পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন।");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMsg(error.message);
    setMsg("পাসওয়ার্ড বদলেছে।");
    navigate({ to: "/admin" });
  };
  return (
    <main className="grid min-h-screen place-items-center bg-newsprint-tint px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-3 border border-newsprint-rule bg-newsprint-paper p-6"
      >
        <h1 className="font-serif-bn text-2xl font-bold">নতুন পাসওয়ার্ড</h1>
        <input
          type="password"
          aria-label="নতুন পাসওয়ার্ড"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-newsprint-rule px-3 py-2 text-sm"
        />
        <button className="w-full bg-newsprint-ink px-3 py-2 font-serif-bn text-newsprint-paper">
          সংরক্ষণ করুন
        </button>
        {msg && <p className="font-serif-bn text-sm text-newsprint-accent">{msg}</p>}
      </form>
    </main>
  );
}
