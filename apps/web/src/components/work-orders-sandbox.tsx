"use client";

import { useCallback, useState } from "react";
import { MapboxAddressField } from "@/components/mapbox-address-field";
import { getPublicApiUrl } from "@/lib/public-env";

export function WorkOrdersSandbox() {
  const base = getPublicApiUrl().replace(/\/$/, "");
  const [title, setTitle] = useState("Small plaster repair");
  const [locationAddress, setLocationAddress] = useState("");
  const [postcode, setPostcode] = useState("D01 A123");
  const [workOrderId, setWorkOrderId] = useState("");
  const [bidCost, setBidCost] = useState("450");
  const [awardBidId, setAwardBidId] = useState("");
  const [note, setNote] = useState("On site tomorrow morning.");
  const [nextStatus, setNextStatus] = useState<
    "in_progress" | "awaiting_info" | "completed" | "cancelled"
  >("in_progress");
  const [log, setLog] = useState("");

  const append = useCallback((msg: string) => {
    setLog((prev) => `${prev}\n${msg}`);
  }, []);

  const createOpenBid = async () => {
    const res = await fetch(`${base}/api/work-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        submissionType: "open_bid",
        tradeCategory: "plastering",
        title,
        description: "Ceiling crack repair, ~2m².",
        locationAddress: locationAddress.trim() || "Example Street, Dublin",
        locationPostcode: postcode,
        dimensions: { areaSqm: 2 },
      }),
    });
    const text = await res.text();
    append(`create open_bid ${res.status}: ${text}`);
    try {
      const j = JSON.parse(text) as { workOrder?: { id: string } };
      if (j.workOrder?.id) setWorkOrderId(j.workOrder.id);
    } catch {
      /* ignore */
    }
  };

  const listMine = async () => {
    const res = await fetch(`${base}/api/work-orders`, { credentials: "include" });
    append(`list (customer/tradesman) ${res.status}: ${await res.text()}`);
  };

  const getBids = async () => {
    if (!workOrderId) {
      append("Set work order id.");
      return;
    }
    const res = await fetch(`${base}/api/work-orders/${workOrderId}/bids`, {
      credentials: "include",
    });
    append(`GET bids (customer) ${res.status}: ${await res.text()}`);
  };

  const submitBid = async () => {
    if (!workOrderId) {
      append("Set work order id (create a job first or paste UUID).");
      return;
    }
    const res = await fetch(`${base}/api/work-orders/${workOrderId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        estimatedCost: Number.parseFloat(bidCost) || 0,
        estimatedTimeline: "5 days",
        notes: "Includes materials estimate",
      }),
    });
    const text = await res.text();
    append(`bid ${res.status}: ${text}`);
  };

  const getTimeline = async () => {
    if (!workOrderId) {
      append("Set work order id.");
      return;
    }
    const res = await fetch(`${base}/api/work-orders/${workOrderId}/timeline`, {
      credentials: "include",
    });
    append(`GET timeline ${res.status}: ${await res.text()}`);
  };

  const postNote = async () => {
    if (!workOrderId) {
      append("Set work order id.");
      return;
    }
    const res = await fetch(`${base}/api/work-orders/${workOrderId}/updates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        updateType: "progress_note",
        content: note,
      }),
    });
    append(`POST update ${res.status}: ${await res.text()}`);
  };

  const putStatus = async () => {
    if (!workOrderId) {
      append("Set work order id.");
      return;
    }
    const res = await fetch(`${base}/api/work-orders/${workOrderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: nextStatus }),
    });
    append(`PUT status ${res.status}: ${await res.text()}`);
  };

  const award = async () => {
    if (!workOrderId || !awardBidId) {
      append("Need work order id + bid id from GET bids.");
      return;
    }
    const res = await fetch(`${base}/api/work-orders/${workOrderId}/award`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ bidId: awardBidId }),
    });
    append(`award ${res.status}: ${await res.text()}`);
  };

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <section className="mt-8 w-full max-w-md rounded-xl border border-neutral-200 p-4 text-left dark:border-neutral-800">
      <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Dev work orders
      </h2>
      <p className="mt-1 text-xs text-neutral-500">
        Use a <strong>customer</strong> session to create/list/award; use a <strong>tradesman</strong> session to
        see the inbox and POST bids.
      </p>
      <label className="mt-3 block text-xs">
        Title
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className="mt-2 block space-y-1">
        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
          Job address
        </span>
        <MapboxAddressField
          value={locationAddress}
          onChange={(line) => setLocationAddress(line)}
          placeholder="Where is the work?"
          inputClassName="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
        />
      </div>
      <label className="mt-2 block text-xs">
        Eircode / postcode
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-neutral-900 px-3 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
          onClick={() => void createOpenBid()}
        >
          Create open-bid job
        </button>
        <button
          type="button"
          className="rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
          onClick={() => void listMine()}
        >
          List my orders / inbox
        </button>
        <button
          type="button"
          className="rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
          onClick={() => void getBids()}
        >
          GET bids (customer)
        </button>
      </div>
      <label className="mt-3 block text-xs">
        Work order id
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
          value={workOrderId}
          onChange={(e) => setWorkOrderId(e.target.value)}
        />
      </label>
      <label className="mt-2 block text-xs">
        Bid amount (EUR)
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          value={bidCost}
          onChange={(e) => setBidCost(e.target.value)}
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
          onClick={() => void submitBid()}
        >
          Submit bid (tradesman)
        </button>
      </div>
      <label className="mt-3 block text-xs">
        Bid id to award (customer)
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-950"
          value={awardBidId}
          onChange={(e) => setAwardBidId(e.target.value)}
          placeholder="from GET .../bids"
        />
      </label>
      <button
        type="button"
        className="mt-2 rounded bg-neutral-900 px-3 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
        onClick={() => void award()}
      >
        Award bid
      </button>
      <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Timeline (after accepted)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
            onClick={() => void getTimeline()}
          >
            GET timeline
          </button>
        </div>
        <label className="mt-2 block text-xs">
          Progress note
          <textarea
            className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="mt-1 rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
          onClick={() => void postNote()}
        >
          POST progress note
        </button>
        <label className="mt-3 block text-xs">
          Next status (PUT)
          <select
            className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
            value={nextStatus}
            onChange={(e) =>
              setNextStatus(
                e.target.value as
                  | "in_progress"
                  | "awaiting_info"
                  | "completed"
                  | "cancelled",
              )
            }
          >
            <option value="in_progress">in_progress</option>
            <option value="awaiting_info">awaiting_info</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
        </label>
        <button
          type="button"
          className="mt-2 rounded bg-neutral-900 px-3 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
          onClick={() => void putStatus()}
        >
          PUT status
        </button>
      </div>
      <pre className="mt-3 max-h-40 overflow-auto rounded bg-neutral-900 p-2 text-[10px] text-neutral-100">
        {log.trim() || "…"}
      </pre>
    </section>
  );
}
