"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

export type PlannerTaskRow = {
  id: string;
  workOrderId: string;
  columnKey: string;
  title: string;
  body: string | null;
  sortOrder: number;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

type WorkOrderAppointmentRow = {
  id: string;
  workOrderId: string;
  tradesmanId: string;
  customerId: string;
  title: string;
  notes: string | null;
  startsAt: string | number | Date;
  endsAt: string | number | Date;
  reminderSentAt: string | number | Date | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

const COLUMNS: { key: string; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "Doing" },
  { key: "done", label: "Done" },
  { key: "blocked", label: "Blocked" },
];

function canEditPlanner(opts: {
  meRole: string | null;
  meId: string | null;
  assignedId: string | null;
  status: string;
}): boolean {
  if (opts.meRole !== "tradesman" || !opts.meId || opts.assignedId !== opts.meId) return false;
  return ["accepted", "in_progress", "awaiting_info"].includes(opts.status);
}

export function WorkOrderPlannerSection({
  workOrderId,
  status,
  assignedTradesmanId,
  meRole,
  meId,
}: {
  workOrderId: string;
  status: string;
  assignedTradesmanId: string | null;
  meRole: string | null;
  meId: string | null;
}) {
  const [tasks, setTasks] = useState<PlannerTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [appointments, setAppointments] = useState<WorkOrderAppointmentRow[]>([]);
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentStartsAt, setAppointmentStartsAt] = useState("");
  const [appointmentEndsAt, setAppointmentEndsAt] = useState("");
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [appointmentSaving, setAppointmentSaving] = useState(false);
  const [appointmentErr, setAppointmentErr] = useState<string | null>(null);
  const [reminderBusyId, setReminderBusyId] = useState<string | null>(null);

  const editable = useMemo(
    () => canEditPlanner({ meRole, meId, assignedId: assignedTradesmanId, status }),
    [meRole, meId, assignedTradesmanId, status],
  );

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [plannerRes, apptRes] = await Promise.all([
        apiFetch(`/api/work-orders/${workOrderId}/planner`),
        apiFetch(`/api/work-orders/${workOrderId}/appointments`),
      ]);
      if (!plannerRes.ok) {
        setTasks([]);
        setErr("Could not load planner.");
        return;
      }
      const j = (await plannerRes.json()) as { tasks?: PlannerTaskRow[] };
      setTasks(j.tasks ?? []);
      if (!apptRes.ok) {
        setAppointments([]);
      } else {
        const aj = (await apptRes.json()) as { appointments?: WorkOrderAppointmentRow[] };
        setAppointments(aj.appointments ?? []);
      }
    } catch {
      setTasks([]);
      setAppointments([]);
      setErr("Network error.");
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const byColumn = useMemo(() => {
    const m = new Map<string, PlannerTaskRow[]>();
    for (const c of COLUMNS) m.set(c.key, []);
    for (const t of tasks) {
      const list = m.get(t.columnKey) ?? [];
      list.push(t);
      m.set(t.columnKey, list);
    }
    for (const c of COLUMNS) {
      const list = m.get(c.key) ?? [];
      list.sort((a, b) => a.sortOrder - b.sortOrder || String(a.createdAt).localeCompare(String(b.createdAt)));
      m.set(c.key, list);
    }
    return m;
  }, [tasks]);

  const patchTask = async (taskId: string, body: Record<string, unknown>) => {
    const res = await apiFetch(`/api/work-orders/${workOrderId}/planner/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    await loadTasks();
  };

  const addTask = async (e: FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/work-orders/${workOrderId}/planner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, columnKey: "todo" }),
      });
      if (!res.ok) {
        const raw = await res.text();
        setErr(raw.slice(0, 200));
        return;
      }
      setTitle("");
      await loadTasks();
    } catch {
      setErr("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const addAppointment = async (e: FormEvent) => {
    e.preventDefault();
    const t = appointmentTitle.trim();
    if (!editable || appointmentSaving || !t || !appointmentStartsAt || !appointmentEndsAt) return;
    setAppointmentSaving(true);
    setAppointmentErr(null);
    try {
      const startsAtIso = new Date(appointmentStartsAt).toISOString();
      const endsAtIso = new Date(appointmentEndsAt).toISOString();
      const res = await apiFetch(`/api/work-orders/${workOrderId}/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t,
          startsAt: startsAtIso,
          endsAt: endsAtIso,
          notes: appointmentNotes.trim() ? appointmentNotes.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const raw = await res.text();
        let msg = "Could not create appointment.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setAppointmentErr(msg);
        return;
      }
      setAppointmentTitle("");
      setAppointmentStartsAt("");
      setAppointmentEndsAt("");
      setAppointmentNotes("");
      await loadTasks();
    } catch {
      setAppointmentErr("Network error.");
    } finally {
      setAppointmentSaving(false);
    }
  };

  const sendReminder = async (appointmentId: string) => {
    if (!editable || reminderBusyId) return;
    setReminderBusyId(appointmentId);
    setAppointmentErr(null);
    try {
      const res = await apiFetch(`/api/work-orders/${workOrderId}/appointments/${appointmentId}/remind`, {
        method: "POST",
      });
      if (!res.ok) {
        const raw = await res.text();
        let msg = "Could not send reminder emails.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setAppointmentErr(msg);
        return;
      }
      await loadTasks();
    } catch {
      setAppointmentErr("Network error.");
    } finally {
      setReminderBusyId(null);
    }
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }, [appointments]);

  const calendarRows = useMemo(() => {
    const m = new Map<string, WorkOrderAppointmentRow[]>();
    for (const appt of sortedAppointments) {
      const d = new Date(appt.startsAt);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      const list = m.get(key) ?? [];
      list.push(appt);
      m.set(key, list);
    }
    return [...m.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, list]) => ({ key, list }));
  }, [sortedAppointments]);

  const formatAppointmentDate = (v: WorkOrderAppointmentRow["startsAt"]): string => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "Invalid date";
    return d.toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  };

  const formatAppointmentTime = (v: WorkOrderAppointmentRow["startsAt"]): string => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <section className="mb-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
      <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Job planner</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {editable
          ? "Organise on-site tasks in columns. The customer can view this board on the job page."
          : "The assigned tradesperson uses this board during the job; you can follow progress here."}
      </p>
      {err ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {err}
        </p>
      ) : null}

      {editable ? (
        <form onSubmit={(ev) => void addTask(ev)} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
            New task
            <input
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. Order materials"
            />
          </label>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-neutral-500">Loading planner…</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                className="rounded-xl border border-neutral-200 bg-neutral-50/80 p-3 dark:border-neutral-700 dark:bg-neutral-900/40"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {col.label}
                </h3>
                <ul className="mt-3 space-y-2">
                  {(byColumn.get(col.key) ?? []).map((task) => (
                    <li
                      key={task.id}
                      className="rounded-lg border border-neutral-200 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-950"
                    >
                      <p className="font-medium text-neutral-900 dark:text-neutral-100">{task.title}</p>
                      {task.body?.trim() ? (
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{task.body}</p>
                      ) : null}
                      {editable ? (
                        <label className="mt-2 block text-xs text-neutral-500 dark:text-neutral-400">
                          Column
                          <select
                            className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-100"
                            value={task.columnKey}
                            onChange={(e) => void patchTask(task.id, { columnKey: e.target.value })}
                          >
                            {COLUMNS.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <section className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Appointment calendar</h3>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {editable
                ? "Book site visits and call-outs. Time slots are reserved on your calendar and reminders are emailed to both parties."
                : "Planned appointments for this work order."}
            </p>
            {appointmentErr ? (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
                {appointmentErr}
              </p>
            ) : null}

            {editable ? (
              <form onSubmit={(ev) => void addAppointment(ev)} className="mt-4 grid gap-3 lg:grid-cols-2">
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Appointment title
                  <input
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                    value={appointmentTitle}
                    onChange={(e) => setAppointmentTitle(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. First site visit"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Starts
                  <input
                    type="datetime-local"
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                    value={appointmentStartsAt}
                    onChange={(e) => setAppointmentStartsAt(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
                  Ends
                  <input
                    type="datetime-local"
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                    value={appointmentEndsAt}
                    onChange={(e) => setAppointmentEndsAt(e.target.value)}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200 lg:col-span-2">
                  Notes (optional)
                  <textarea
                    className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                    rows={2}
                    maxLength={2000}
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    placeholder="Access details, parking, tools required…"
                  />
                </label>
                <div>
                  <button
                    type="submit"
                    disabled={appointmentSaving}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
                  >
                    {appointmentSaving ? "Booking…" : "Book appointment"}
                  </button>
                </div>
              </form>
            ) : null}

            {calendarRows.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">No appointments scheduled yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {calendarRows.map((row) => (
                  <div key={row.key} className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-950">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {formatAppointmentDate(row.list[0]!.startsAt)}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {row.list.map((appt) => (
                        <li key={appt.id} className="rounded-md border border-neutral-200 p-2 text-sm dark:border-neutral-700">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">{appt.title}</p>
                          <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                            {formatAppointmentTime(appt.startsAt)} - {formatAppointmentTime(appt.endsAt)}
                          </p>
                          {appt.notes?.trim() ? (
                            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{appt.notes}</p>
                          ) : null}
                          {editable ? (
                            <div className="mt-2">
                              <button
                                type="button"
                                disabled={reminderBusyId !== null}
                                onClick={() => void sendReminder(appt.id)}
                                className="rounded border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-800"
                              >
                                {reminderBusyId === appt.id ? "Sending reminder…" : "Send email reminder"}
                              </button>
                              {appt.reminderSentAt ? (
                                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                                  Last reminder sent {new Date(appt.reminderSentAt).toLocaleString()}.
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
