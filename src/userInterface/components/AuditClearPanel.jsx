import { useState } from "react";
import { adminRequest } from "../../api";

/** Admin-only: removes audit history older than the chosen number of months. */
export default function AuditClearPanel({ onDone }) {
  const [months, setMonths] = useState("12");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const clear = async () => {
    const keep = Number.parseInt(months, 10);
    if (!Number.isInteger(keep) || keep < 1) { setError("Enter a number of months, like 6 or 12."); return; }
    if (!window.confirm(`Permanently delete history entries older than ${keep} month(s)? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const result = await adminRequest("/audit-logs/clear", { method: "POST", body: { months: keep } });
      setNote(`Removed ${result.deleted} old entr${result.deleted === 1 ? "y" : "ies"}.`);
      onDone?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="adm-panel">
      <h2 className="adm-section-title">Clear old history</h2>
      <p style={{ margin: "0 0 10px", fontSize: 13.5 }}>Keep the last
        {" "}<input className="adm-input" type="number" min="1" max="120" value={months} onChange={(e) => setMonths(e.target.value)} style={{ width: 70, height: 34, padding: "0 8px" }} aria-label="Months of history to keep" />{" "}
        month(s) and delete everything older. The cleanup itself is recorded in the history.</p>
      {error && <p className="adm-error" role="alert">{error}</p>}
      {note && <p role="status">{note}</p>}
      <button className="adm-btn adm-btn-danger adm-btn-sm" disabled={busy} onClick={clear}>{busy ? "Clearing..." : "Clear old entries"}</button>
    </section>
  );
}
