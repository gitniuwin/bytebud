import { useCallback, useEffect, useState } from "react";
import { adminRequest } from "../../api";
import { formatDateTime } from "../pages/AdminShared";

/**
 * Admin-only list of customers who asked for a password reset.
 * Approve only when the phone number matched or you have checked the customer another way.
 */
export default function PasswordRequestsPanel() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await adminRequest("/password-requests");
      setRows(result.requests || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (row, decision) => {
    if (decision === "approve" && !row.phoneMatched
      && !window.confirm("The phone number did NOT match this account. Approve anyway only if you have verified the customer another way. Approve?")) return;
    setBusy(row.requestId);
    try {
      await adminRequest(`/password-requests/${row.requestId}`, { method: "PATCH", body: { decision } });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy("");
    }
  };

  const waiting = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending").slice(0, 10);

  return (
    <section className="ad-panel">
      <h2 className="ad-section-title">Password reset requests {waiting.length > 0 && <span className="ad-badge tone-amber">{waiting.length} waiting</span>}</h2>
      {error && <p className="ad-error" role="alert">{error}</p>}
      {!waiting.length && <div className="ad-empty"><strong>No requests waiting</strong>New requests from customers who forgot their password show up here.</div>}
      {waiting.length > 0 && (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr><th>Customer</th><th>Email</th><th>Phone on account</th><th>Phone matched?</th><th>Orders</th><th>Requested</th><th>Actions</th></tr></thead>
            <tbody>
              {waiting.map((row) => (
                <tr key={row.requestId}>
                  <td>{row.fullName}</td>
                  <td>{row.email}</td>
                  <td>{row.phone || "None saved"}</td>
                  <td><span className={`ad-badge ${row.phoneMatched ? "tone-green" : "tone-red"}`}>{row.phoneMatched ? "Yes" : "No"}</span></td>
                  <td>{row.orderCount}{row.lastOrderAt ? `, last ${formatDateTime(row.lastOrderAt)}` : ""}</td>
                  <td>{formatDateTime(row.requestedAt)}</td>
                  <td>
                    <button className="ad-btn ad-btn-primary ad-btn-sm" disabled={busy === row.requestId} onClick={() => decide(row, "approve")}>Approve</button>{" "}
                    <button className="ad-btn ad-btn-danger ad-btn-sm" disabled={busy === row.requestId} onClick={() => decide(row, "reject")}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {history.length > 0 && (
        <>
          <h3 className="ad-section-title" style={{ fontSize: 14, marginTop: 18 }}>Recent decisions</h3>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead><tr><th>Customer</th><th>Email</th><th>Status</th><th>Decided</th></tr></thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.requestId}>
                    <td>{row.fullName}</td><td>{row.email}</td><td>{row.status}</td><td>{row.decidedAt ? formatDateTime(row.decidedAt) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
