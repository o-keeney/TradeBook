"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { subscribeConversationMessages } from "@/lib/conversation-websocket";
import { apiFetch } from "@/lib/api";

type ConversationMeta = {
  id: string;
  workOrderId: string;
  workOrderTitle: string;
  canPost: boolean;
  updatedAt: number;
};

type Msg = {
  id: string;
  authorId: string;
  body: string;
  createdAt: number;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const bottomRef = useRef<HTMLDivElement>(null);

  const [me, setMe] = useState<{ id: string } | null>(null);
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markRead = useCallback(async () => {
    if (!id) return;
    await apiFetch(`/api/conversations/${encodeURIComponent(id)}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [meRes, cRes, mRes] = await Promise.all([
        apiFetch("/api/users/me"),
        apiFetch(`/api/conversations/${encodeURIComponent(id)}`),
        apiFetch(`/api/conversations/${encodeURIComponent(id)}/messages`),
      ]);
      if (meRes.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/messages/${id}`)}`);
        return;
      }
      if (cRes.status === 404 || cRes.status === 403) {
        setMeta(null);
        setMessages([]);
        setError("This conversation was not found or you do not have access.");
        return;
      }
      const meJson = (await meRes.json()) as { user?: { id: string } };
      setMe(meJson.user ?? null);

      const cj = (await cRes.json()) as { conversation?: ConversationMeta };
      setMeta(cj.conversation ?? null);

      const mj = (await mRes.json()) as { messages?: Msg[] };
      setMessages(mj.messages ?? []);

      void markRead();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [id, router, markRead]);

  useEffect(() => {
    void load();
  }, [load]);

  const realtimeEnabled = Boolean(id && meta);
  useEffect(() => {
    if (!realtimeEnabled || !id) return;
    return subscribeConversationMessages(id, (incoming) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    });
  }, [id, realtimeEnabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || !id || sending || !meta?.canPost) return;
    setSending(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/conversations/${encodeURIComponent(id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let msg = "Could not send.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setError(msg);
        return;
      }
      const sent = (await res.json()) as { message?: Msg | null };
      setBody("");
      if (sent.message?.id) {
        setMessages((prev) => (prev.some((m) => m.id === sent.message!.id) ? prev : [...prev, sent.message!]));
      } else {
        await load();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSending(false);
    }
  };

  if (!id) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-neutral-500">Invalid link.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-neutral-500">
        Loading conversation…
      </div>
    );
  }

  if (error && !meta) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/messages"
          className="text-sm font-medium text-neutral-600 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← All messages
        </Link>
        <p className="mt-6 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:pt-8">
      <nav className="mb-6">
        <Link
          href="/messages"
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <span aria-hidden>←</span> All messages
        </Link>
      </nav>

      <header className="mb-8 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          {meta?.workOrderTitle ?? "Conversation"}
        </h1>
        {meta?.workOrderId ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Link
              href={`/work-orders/${encodeURIComponent(meta.workOrderId)}`}
              className="font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              View work order
            </Link>
          </p>
        ) : null}
      </header>

      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <ol className="space-y-4" aria-live="polite">
        {messages.map((m) => {
          const mine = me?.id === m.authorId;
          return (
            <li
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "border border-neutral-200 bg-neutral-50 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-white/70 dark:text-neutral-600" : "text-neutral-500"}`}>
                  {formatTime(m.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={bottomRef} />

      {meta?.canPost ? (
        <form onSubmit={(ev) => void send(ev)} className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Message
            <textarea
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              rows={3}
              maxLength={8000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write a message…"
            />
          </label>
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-sm text-neutral-500">Messaging is closed for this job (completed or cancelled).</p>
      )}
    </article>
  );
}
