import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminRequest, transferMethods } from "../../api";
import AdminDashboard from "./AdminDashboard";
import AdminLayout from "./AdminLayout";
import UnitsTab from "../components/UnitsTab";
import AcquisitionsTab from "../components/AcquisitionsTab";
import SuppliersTab from "../components/SuppliersTab";
import PasswordRequestsPanel from "../components/PasswordRequestsPanel";
import AuditClearPanel from "../components/AuditClearPanel";
import { Drawer, Modal, StatusBadge, formatDateTime, formatPeso } from "./AdminShared";

const verificationStatuses = [
  { value: "pending", label: "Pending", tone: "amber" },
  { value: "approved", label: "Approved", tone: "green" },
  { value: "rejected", label: "Rejected", tone: "red" },
];
const orderStatuses = [
  { value: "pending", label: "Pending", tone: "amber" },
  { value: "confirmed", label: "Confirmed", tone: "burgundy" },
  { value: "ready_for_pickup", label: "Ready for pickup", tone: "green" },
  { value: "picked_up", label: "Picked up", tone: "dark" },
  { value: "cancelled", label: "Cancelled", tone: "grey" },
];
const statusColumns = { verifStatus: verificationStatuses, orderStatus: orderStatuses };

const emptyData = {
  units: [], acquisitions: [], suppliers: [], orders: [], student_verifications: [],
  warranties: [], laptop_models: [], courses: [], users: [], audit_logs: [],
};
const pageFromPath = (path) => path.split("/").filter(Boolean)[1] || "dashboard";
const titles = {
  orders: "Orders & Returns", verifications: "Student verifications", catalog: "Catalog",
  users: "Users", audit: "Audit log",
};
const searchPlaceholders = {
  orders: "Search order number, customer, return, or claim",
  verifications: "Search buyer name, email, or status",
  users: "Search name, email, phone, or role",
  audit: "Search actor, action, collection, or record ID",
  catalog: "Search catalog records",
};
const labels = {
  orderStatus: "Order status",
  orderNo: "Order", fullName: "Name", email: "Email", phone: "Phone", role: "Role", isActive: "Active",
  verifStatus: "Status", schoolEmail: "School email", expiresAt: "Expires", companyName: "Supplier", sourceType: "Source",
  invoiceNo: "Invoice", totalCost: "Total cost", acqStatus: "Status", serialNumber: "Serial number",
  unitStatus: "Status", conditionGrade: "Grade", brand: "Brand", modelName: "Model", courseCode: "Code",
  courseName: "Course", action: "Action", targetCollection: "Collection", targetId: "Record", logCreatedAt: "When",
};
const display = (key, value) => {
  if (value == null || value === "") return "—";
  if (["total", "totalCost", "refundAmount", "priceAtSale"].includes(key)) return formatPeso(value);
  // Match actual date field suffixes. `orderStatus` contains "at" but is not a date.
  if (/(?:At|Date)$/i.test(key)) return formatDateTime(value);
  if (typeof value === "object") return Array.isArray(value) ? `${value.length} items` : JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

export default function AdminConsole({ admin, pathname, onNavigate, onLogout }) {
  const [data, setData] = useState(emptyData);
  const [loadedScopes, setLoadedScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [inventoryTab, setInventoryTab] = useState("units");
  const [ordersTab, setOrdersTab] = useState("orders");
  const [catalogTab, setCatalogTab] = useState("laptop_models");
  const page = pageFromPath(pathname);
  const isAdmin = admin.role === "admin";
  const dataScope = page === "inventory" ? `inventory_${inventoryTab}`
    : page === "orders" ? "orders"
      : page === "verifications" ? "verifications"
        : page === "catalog" ? `catalog_${catalogTab}`
          : page === "users" ? "users"
            : page === "audit" ? "audit" : "dashboard";
  const lastScopeRequested = useRef("");
  const routeParams = new URLSearchParams(window.location.search);

  useEffect(() => {
    setSearch("");
  }, [page]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await adminRequest(`/data?scope=${encodeURIComponent(dataScope)}`);
      setData((current) => {
        const loaded = { ...current, ...response };
        if (response.units) loaded.units = response.units.map((unit) => unit.unitStatus === "ready_to_list" ? { ...unit, unitStatus: "ready" } : unit);
        return loaded;
      });
      setLoadedScopes((current) => current.includes(dataScope) ? current : [...current, dataScope]);
    }
    catch (e) { setError(e.message || "Could not load admin data."); }
    finally { setLoading(false); }
  }, [dataScope]);
  useEffect(() => {
    // React Strict Mode replays effects in development; request each active section once.
    if (lastScopeRequested.current === dataScope) return;
    lastScopeRequested.current = dataScope;
    refresh();
  }, [dataScope, refresh]);

  const save = async (collection, record, idField) => {
    const isNew = !record[idField];
    const result = await adminRequest(`/${collection}${isNew ? "" : `/${record[idField]}`}`, {
      method: isNew ? "POST" : "PATCH", body: record,
    });
    await refresh();
    return result;
  };

  const badgeCount = useMemo(() => data.student_verifications.filter((v) => v.verifStatus === "pending").length, [data.student_verifications]);
  const scopeLoading = loading || !loadedScopes.includes(dataScope);
  const handleNavigate = (href) => onNavigate(href);
  const handleSaveUnit = (unit) => save("units", unit, "unitId");
  const handleCreateUnit = (unit) => save("units", unit, "unitId");
  const handleSaveAcquisition = (record) => save("acquisitions", record, "acquisitionId");
  const handleSplit = async (acquisitionId) => {
    const id = typeof acquisitionId === "object" ? acquisitionId.acquisitionId : acquisitionId;
    const result = await adminRequest(`/acquisitions/${id}/split`, { method: "POST", body: {} });
    await refresh();
    return result.units?.length || 0;
  };
  const handleSaveSupplier = (record) => save("suppliers", record, "supplierId");

  if (page === "dashboard") {
    return <AdminDashboard admin={admin} users={data.users} verifications={data.student_verifications}
      units={data.units} orders={data.orders} warranties={data.warranties} auditLogs={data.audit_logs}
      onNavigate={handleNavigate} onLogout={onLogout} loading={scopeLoading} error={error} onRetry={refresh} />;
  }

  const active = page === "inventory" ? "inventory" : page;
  const content = () => {
    if (scopeLoading) return <div className="adm-empty"><strong>Loading {isAdmin ? "admin" : "staff"} data...</strong></div>;
    if (error) return <div className="adm-note is-warn" role="alert">{error} <button className="adm-btn adm-btn-ghost" onClick={refresh}>Retry</button></div>;
    if (page === "inventory") return (
      <>
        <div className="adm-tabs" role="tablist" aria-label="Inventory sections">
          {["units", ...(isAdmin ? ["acquisitions", "suppliers"] : [])].map((tab) => (
            <button type="button" role="tab" aria-selected={inventoryTab === tab} className={`adm-tab ${inventoryTab === tab ? "is-active" : ""}`} key={tab} onClick={() => { setInventoryTab(tab); setSearch(""); }}>
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        {inventoryTab === "units" && <UnitsTab units={data.units} models={data.laptop_models} acquisitions={data.acquisitions}
          users={data.users} admin={admin} isAdmin={isAdmin} query={search} initialStatus={routeParams.get("status") || ""}
          acquisitionFilter={routeParams.get("acquisition") || ""} onClearAcquisitionFilter={() => onNavigate("/admin/inventory")}
          onSave={handleSaveUnit} onCreate={handleCreateUnit}
          notify={(message, type) => type === "error" && setError(message)} />}
        {isAdmin && inventoryTab === "acquisitions" && <AcquisitionsTab acquisitions={data.acquisitions} suppliers={data.suppliers}
          models={data.laptop_models} users={data.users} admin={admin} query={search} onSave={handleSaveAcquisition}
          onSplit={handleSplit} onViewUnits={(id) => onNavigate(`/admin/inventory?acquisition=${id}`)} notify={(message, type) => type === "error" && setError(message)} />}
        {isAdmin && inventoryTab === "suppliers" && <SuppliersTab suppliers={data.suppliers} acquisitions={data.acquisitions} query={search}
          onSave={handleSaveSupplier} notify={(message, type) => type === "error" && setError(message)} />}
      </>
    );
    if (page === "verifications") return <RecordsTable title={titles.verifications} collection="student_verifications" rows={data.student_verifications} users={data.users}
      admin={admin} query={search} refresh={refresh} />;
    if (page === "orders") return <>
      <div className="adm-tabs" role="tablist" aria-label="Orders and after-sales sections">
        {[ ["orders", "Orders"], ["returns", "Returns"], ["claims", "Warranty claims"] ].map(([tab, label]) => <button type="button" role="tab" aria-selected={ordersTab === tab} className={`adm-tab ${ordersTab === tab ? "is-active" : ""}`} key={tab} onClick={() => { setOrdersTab(tab); setSearch(""); }}>{label}</button>)}
      </div>
      <RecordsTable title={ordersTab === "claims" ? "Warranty claims" : ordersTab === "returns" ? "Return requests" : "Orders"} collection="orders" view={ordersTab} rows={data.orders} warranties={data.warranties} users={data.users} units={data.units} admin={admin} query={search} refresh={refresh} />
    </>;
    if (page === "users" && isAdmin) return <><PasswordRequestsPanel /><RecordsTable title={titles.users} collection="users" rows={data.users} admin={admin} query={search} refresh={refresh} /></>;
    if (page === "audit" && isAdmin) return <><AuditClearPanel onDone={refresh} /><RecordsTable title={titles.audit} collection="audit_logs" rows={data.audit_logs} users={data.users} admin={admin} query={search} refresh={refresh} /></>;
    if (page === "catalog") return <>
      <div className="adm-tabs" role="tablist" aria-label="Catalog sections">
        {[ ["laptop_models", "Laptop models"], ["courses", "Courses"] ].map(([tab, label]) => <button type="button" role="tab" aria-selected={catalogTab === tab} className={`adm-tab ${catalogTab === tab ? "is-active" : ""}`} key={tab} onClick={() => { setCatalogTab(tab); setSearch(""); }}>{label}</button>)}
      </div>
      <RecordsTable title={catalogTab === "courses" ? "Courses" : "Laptop models"} collection="catalog" rows={(catalogTab === "courses" ? data.courses : data.laptop_models).map((x) => ({ ...x, _kind: catalogTab }))} admin={admin} query={search} refresh={refresh} />
    </>;
    return <div className="adm-empty"><strong>Page not found</strong><button className="adm-btn adm-btn-primary" onClick={() => onNavigate("/admin")}>Back to dashboard</button></div>;
  };

  const restricted = (["users", "audit"].includes(page) && !isAdmin) || !["inventory", "orders", "verifications", "catalog", "users", "audit"].includes(page);
  const searchPlaceholder = page === "inventory"
    ? ({ units: "Search serial number or laptop model", acquisitions: "Search invoice or supplier", suppliers: "Search supplier or contact" }[inventoryTab] || "Search inventory")
    : page === "orders" && ordersTab === "returns"
      ? "Search order, buyer, laptop serial, or return reason"
      : page === "orders" && ordersTab === "claims"
        ? "Search claim, buyer, laptop serial, or claim status"
        : (searchPlaceholders[page] || "Search this section");
  return <AdminLayout active={restricted ? "dashboard" : active} admin={admin} badges={{ verifications: badgeCount }}
    showSearch={!restricted} searchValue={search} onSearchChange={setSearch} onSearchSubmit={setSearch} searchPlaceholder={searchPlaceholder} onNavigate={onNavigate} onLogout={onLogout}>
    <div className="db-head"><div><h1>{restricted ? "Access denied" : page === "inventory" ? "Inventory" : titles[page]}</h1>
      <p>{restricted ? "This section is only available to administrators." : `Manage ByteBud ${page === "audit" ? "activity history" : page.replace("_", " ")}.`}</p></div></div>
    {restricted ? <div className="adm-empty"><strong>Admin role required</strong>Ask an administrator if you need access to this section.</div> : content()}
  </AdminLayout>;
}

function RecordsTable({ title, collection, view = "", rows, warranties = [], users = [], units = [], admin, query, refresh }) {
  const [staffForm, setStaffForm] = useState(false);
  const [staff, setStaff] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState(null);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [verificationDecision, setVerificationDecision] = useState("");
  const [verificationRemarks, setVerificationRemarks] = useState("");
  const [verificationSaving, setVerificationSaving] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState("");
  const [auditFilter, setAuditFilter] = useState({ actor: "", action: "", collection: "", from: "", to: "" });
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    const relatedUser = users.find((user) => user.userId === row.userId || user.userId === row.adminId);
    const searchable = collection === "orders"
      ? [row.orderNo, row.orderStatus, row.payment?.reference, relatedUser?.fullName, relatedUser?.email, relatedUser?.phone]
      : collection === "student_verifications"
        ? [relatedUser?.fullName, relatedUser?.email, row.schoolEmail, row.verifStatus, row.remarks]
        : collection === "users"
          ? [row.fullName, row.email, row.phone, row.role, row.isActive ? "active" : "inactive"]
          : collection === "audit_logs"
            ? [relatedUser?.fullName, row.action, row.targetCollection, row.targetId]
            : row._kind === "courses"
              ? [row.courseCode, row.courseName, row.requirements?.reqNotes]
              : [row.brand, row.modelName, row.msrp, row.specs?.cpuName, row.specs?.gpu];
    if (normalizedQuery && !searchable.some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery))) return false;
    if (collection !== "audit_logs") return true;
    const d = new Date(row.logCreatedAt);
    return (!auditFilter.actor || String(row.adminId) === auditFilter.actor)
      && (!auditFilter.action || row.action === auditFilter.action)
      && (!auditFilter.collection || row.targetCollection === auditFilter.collection)
      && (!auditFilter.from || d >= new Date(`${auditFilter.from}T00:00:00`))
      && (!auditFilter.to || d <= new Date(`${auditFilter.to}T23:59:59`));
  });
  const filteredReturns = collection === "orders" ? rows.flatMap((order) => (order.returns || []).flatMap((item, index) => {
    const customer = users.find((user) => user.userId === order.userId);
    const unit = units.find((entry) => entry.unitId === item.returnUnitId);
    const text = [order.orderNo, customer?.fullName, customer?.email, unit?.serialNumber, item.reason, item.returnStatus].join(" ").toLowerCase();
    return !normalizedQuery || text.includes(normalizedQuery) ? [{ order, item, index }] : [];
  })) : [];
  const filteredClaims = collection === "orders" ? warranties.flatMap((warranty) => (warranty.claims || []).flatMap((claim, index) => {
    const customer = users.find((user) => user.userId === warranty.userId);
    const unit = units.find((entry) => entry.unitId === warranty.unitId);
    const text = [claim.claimNo, claim.claimType, claim.description, claim.claimStatus, customer?.fullName, customer?.email, unit?.serialNumber].join(" ").toLowerCase();
    return !normalizedQuery || text.includes(normalizedQuery) ? [{ warranty, claim, index }] : [];
  })) : [];
  if (collection === "student_verifications") filtered.sort((a, b) => Number(b.verifStatus === "pending") - Number(a.verifStatus === "pending") || new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  const mutate = async (path, options) => {
    setMessage("");
    try { await adminRequest(path, options); await refresh(); return true; }
    catch (error) { setMessage(error.message); return false; }
  };
  const createStaff = async (event) => {
    event.preventDefault();
    if (await mutate("/users", { method: "POST", body: staff })) {
      setStaffForm(false); setStaff({ fullName: "", email: "", phone: "", password: "" });
    }
  };
  const verifyTransferPayment = async () => {
    if (paymentSaving) return;
    const { orderId, payment: { method } } = selected;
    if (!window.confirm("Mark this order as paid after matching the reference and total against the received transfer?")) return;
    setPaymentSaving(true);
    setPaymentError(null);
    try {
      const { payment } = await adminRequest(`/orders/${orderId}/${transferMethods[method]}-payment`, { method: "PATCH" });
      setSelected((order) => order?.orderId === orderId ? { ...order, payment } : order);
      await refresh();
    } catch (error) {
      setPaymentError({ orderId, message: error.message || "Could not mark this payment as paid." });
    } finally {
      setPaymentSaving(false);
    }
  };
  const startVerificationDecision = (decision) => {
    setVerificationError("");
    setExpiresAt("");
    setVerificationRemarks(selected.remarks || "");
    setVerificationDecision(decision);
  };
  const cancelVerificationDecision = () => {
    if (!verificationSaving) setVerificationDecision("");
  };
  const submitVerificationDecision = async (event) => {
    event.preventDefault();
    if (!selected || !verificationDecision || verificationSaving) return;
    const body = { verifStatus: verificationDecision, remarks: verificationRemarks };
    if (verificationDecision === "approved") {
      const expiry = new Date(`${expiresAt}T23:59:59`);
      if (!expiresAt || !(expiry > new Date())) {
        setVerificationError("Choose a valid expiry date.");
        return;
      }
      body.expiresAt = expiry.toISOString();
    }
    setVerificationSaving(true);
    setVerificationError("");
    try {
      await adminRequest(`/student_verifications/${selected.verificationId}`, { method: "PATCH", body });
      setVerificationDecision("");
      setSelected(null);
      await refresh();
    } catch (error) {
      setVerificationError(error.message || "Could not update the student verification.");
    } finally {
      setVerificationSaving(false);
    }
  };
  const loadVerificationProof = async (row) => {
    setProofUrl("");
    setProofError("");
    setProofLoading(true);
    try {
      const result = await adminRequest(`/student_verifications/${row.verificationId}/proof`);
      setProofUrl(result.proofUrl || "");
    } catch (error) {
      setProofError(error.message || "Could not load the submitted proof.");
    } finally {
      setProofLoading(false);
    }
  };
  const openVerification = (row) => {
    setSelected(row);
    setMessage("");
    loadVerificationProof(row);
  };
  const fields = collection === "student_verifications" ? ["fullName", "verifStatus", "submittedAt", "expiresAt"]
    : collection === "orders" ? ["orderNo", "fullName", "total", "orderStatus", "pickupDate"]
      : collection === "users" ? ["fullName", "email", "phone", "role", "isActive", "userCreatedAt"]
        : collection === "audit_logs" ? ["fullName", "action", "targetCollection", "targetId", "logCreatedAt"]
          : ["_kind", "brand", "modelName", "msrp", "specs", "courseCode", "courseName", "requirements"];
  const recordCount = collection === "orders" && view === "returns" ? filteredReturns.length
    : collection === "orders" && view === "claims" ? filteredClaims.length : filtered.length;
  const showActions = collection !== "audit_logs" && !(collection === "catalog" && admin.role !== "admin");
  return <section className="adm-panel">
    <h2 className="adm-section-title">{title}</h2>
    <div className="iv-toolbar"><strong>{recordCount} records</strong>
      {collection === "users" && admin.role === "admin" && <button className="adm-btn adm-btn-primary" onClick={() => setStaffForm((v) => !v)}>Add staff user</button>}
      {collection === "catalog" && admin.role === "admin" && <CreateCatalogForm refresh={refresh} />}
    </div>
    {collection === "audit_logs" && <div className="adm-inline-form adm-audit-filters">
      <select aria-label="Filter by actor" value={auditFilter.actor} onChange={(e) => setAuditFilter({ ...auditFilter, actor: e.target.value })}><option value="">All staff/admins</option>{users.filter((u) => ["admin", "staff"].includes(u.role)).map((u) => <option key={u.userId} value={u.userId}>{u.fullName}</option>)}</select>
      <select aria-label="Filter by action" value={auditFilter.action} onChange={(e) => setAuditFilter({ ...auditFilter, action: e.target.value })}><option value="">All actions</option>{["create", "update", "delete"].map((a) => <option key={a}>{a}</option>)}</select>
      <select aria-label="Filter by collection" value={auditFilter.collection} onChange={(e) => setAuditFilter({ ...auditFilter, collection: e.target.value })}><option value="">All collections</option>{[...new Set(rows.map((r) => r.targetCollection))].filter(Boolean).map((c) => <option key={c}>{c}</option>)}</select>
      <label>From <input type="date" value={auditFilter.from} onChange={(e) => setAuditFilter({ ...auditFilter, from: e.target.value })} /></label><label>To <input type="date" value={auditFilter.to} onChange={(e) => setAuditFilter({ ...auditFilter, to: e.target.value })} /></label>
    </div>}
    {message && <p className="adm-error" role="alert">{message}</p>}
    {staffForm && <form className="adm-form-grid" onSubmit={createStaff}>
      <label>Full name<input required value={staff.fullName} onChange={(e) => setStaff({ ...staff, fullName: e.target.value })} /></label>
      <label>Email<input required type="email" value={staff.email} onChange={(e) => setStaff({ ...staff, email: e.target.value })} /></label>
      <label>Phone<input value={staff.phone} onChange={(e) => setStaff({ ...staff, phone: e.target.value })} /></label>
      <label>Temporary password<input required minLength="8" type="password" value={staff.password} onChange={(e) => setStaff({ ...staff, password: e.target.value })} /></label>
      <button className="adm-btn adm-btn-primary">Create staff account</button>
    </form>}
    {(!view || view === "orders") && <div className="adm-table-wrap"><table className="adm-table"><thead><tr>{fields.map((f) => <th key={f}>{labels[f] || f}</th>)}{showActions && <th>Actions</th>}</tr></thead>
      <tbody>{filtered.map((row) => {
        const user = users.find((u) => u.userId === row.userId || u.userId === row.adminId);
        const view = { ...row, fullName: user?.fullName || "—" };
        return <tr key={row.userId || row.orderId || row.verificationId || row.logId || row.courseId || row.modelId} onClick={() => { if (["orders", "audit_logs"].includes(collection)) setSelected(row); else if (collection === "student_verifications") openVerification(row); }}>
        {fields.map((f) => <td key={f}>{statusColumns[f]
          ? <StatusBadge list={statusColumns[f]} value={view[f]} />
          : display(f, f === "adminId" && collection === "audit_logs" ? view.fullName : f === "userId" && collection === "student_verifications" ? view.fullName : view[f])}</td>)}
        {showActions && <td><div className="adm-action-buttons">
          {collection === "student_verifications" &&
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={(e) => { e.stopPropagation(); openVerification(row); }}>View</button>}
          {collection === "orders" && <OrderStatusButtons order={row} mutate={mutate} onSeeDetails={() => setSelected(row)} />}
          {collection === "users" && row.role !== "admin" && <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => mutate(`/users/${row.userId}/active`, { method: "PATCH", body: { isActive: !row.isActive } })}>{row.isActive ? "Deactivate" : "Activate"}</button>}
          {collection === "users" && row.role !== "admin" && <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={async (e) => { e.stopPropagation(); if (!window.confirm(`Set a new temporary password for ${row.fullName}?`)) return; setMessage(""); try { const r = await adminRequest(`/users/${row.userId}/temp-password`, { method: "POST", body: {} }); window.alert(`Temporary password for ${row.fullName}:\n\n${r.tempPassword}\n\nShown only once. Give it to the customer and ask them to change it in My Account.`); } catch (err) { setMessage(err.message); } }}>Set temp password</button>}
          {collection === "users" && row.role === "buyer" && <button className="adm-btn adm-btn-danger adm-btn-sm" onClick={async (e) => { e.stopPropagation(); if (!window.confirm(`Permanently delete ${row.fullName}? This only works for customers with no orders or other records.`)) return; await mutate(`/users/${row.userId}`, { method: "DELETE" }); }}>Delete</button>}
          {collection === "catalog" && admin.role === "admin" && <CatalogEdit row={row} refresh={refresh} />}
        </div></td>}
      </tr>})}</tbody></table></div>}
    {(!view || view === "orders") && !filtered.length && <div className="adm-empty"><strong>No records</strong></div>}
    {collection === "orders" && <>
      {(view === "returns" || !view) && <><h2 className="adm-section-title">Return requests</h2>
      <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Order</th><th>Unit</th><th>Reason</th><th>Status</th><th>Requested</th>{admin.role === "admin" && <th>Review</th>}</tr></thead>
        <tbody>{filteredReturns.map(({ order, item, index }) => <tr key={`${order.orderId}-${index}`}>
          <td>{order.orderNo}</td><td>{item.returnUnitId}</td><td>{item.reason || "—"}</td><td>{item.returnStatus || "pending"}</td><td>{display("requestedAt", item.requestedAt)}</td>
          {admin.role === "admin" && <td>{["pending", "requested", "filed"].includes(item.returnStatus) ? <>
            <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => { const raw = window.prompt("Refund amount (PHP):", "0"); if (raw === null) return; const amount = Number(raw); if (Number.isFinite(amount) && amount >= 0) mutate(`/orders/${order.orderId}/returns/${index}`, { method: "PATCH", body: { returnStatus: "approved", refundAmount: amount } }); }}>Approve</button>{" "}
            <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => mutate(`/orders/${order.orderId}/returns/${index}`, { method: "PATCH", body: { returnStatus: "rejected", refundAmount: 0 } })}>Reject</button>
          </> : formatPeso(item.refundAmount)}</td>}
        </tr>)}</tbody></table></div>{!filteredReturns.length && <div className="adm-empty"><strong>No return requests</strong></div>}</>}
      {(view === "claims" || !view) && <><h2 className="adm-section-title">Warranty claims</h2>
      <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>Claim</th><th>Type</th><th>Description</th><th>Status</th><th>Filed</th><th>Update</th></tr></thead>
        <tbody>{filteredClaims.map(({ warranty, claim, index }) => <tr key={`${warranty.warrantyId}-${index}`}>
          <td>{claim.claimNo || warranty.warrantyId}</td><td>{claim.claimType || "—"}</td><td>{claim.description || "—"}</td><td>{claim.claimStatus || "—"}</td><td>{display("filedAt", claim.filedAt)}</td>
          <td><select value={claim.claimStatus} onChange={(e) => mutate(`/warranties/${warranty.warrantyId}/claims/${index}`, { method: "PATCH", body: { claimStatus: e.target.value, resolution: claim.resolution } })}>
            {["filed", "in_review", "approved", "rejected", "resolved"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select></td>
        </tr>)}</tbody></table></div>{!filteredClaims.length && <div className="adm-empty"><strong>No warranty claims</strong></div>}</>}
    </>}
    {selected && collection === "student_verifications" && !verificationDecision && <Modal open onClose={() => setSelected(null)} title="Review student verification" size="lg"
      footer={selected.verifStatus === "pending" && <>
        <button type="button" className="adm-btn adm-btn-danger" onClick={() => startVerificationDecision("rejected")}>Reject</button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => startVerificationDecision("approved")}>Approve</button>
      </>}
    >
      <div className="adm-verification-person"><div><span className="adm-review-eyebrow">STUDENT PRICING APPLICATION</span><h3>{users.find((u) => u.userId === selected.userId)?.fullName || selected.userId}</h3></div><span className={`adm-review-status is-${String(selected.verifStatus || "pending").toLowerCase()}`}>{String(selected.verifStatus || "pending").replaceAll("_", " ")}</span></div>
      <section className="adm-section adm-review-card"><h3 className="adm-section-title">Applicant details</h3><p><b>Status:</b> {selected.verifStatus}</p><p><b>Submitted:</b> {display("submittedAt", selected.submittedAt)}</p>
        {proofLoading ? <div className="adm-review-no-proof">Loading submitted proof...</div>
          : proofError ? <div className="adm-review-no-proof is-error"><p>{proofError}</p><button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => loadVerificationProof(selected)}>Try again</button></div>
          : proofUrl ? <>
            {/^data:image\//i.test(proofUrl) || /\.(png|jpe?g|gif|webp)(?:[?#]|$)/i.test(proofUrl)
              ? <div className="adm-proof-frame"><img src={proofUrl} alt="Submitted Certificate of Registration (COR)" onError={() => setProofError("The submitted image could not be displayed.")} /></div>
              : <iframe title="Submitted proof document" src={proofUrl} className="adm-proof-document" />}
          </> : <p>No proof URL attached.</p>}
        <p><b>Remarks:</b> {selected.remarks || "—"}</p>
      </section>
    </Modal>}
    {selected && verificationDecision && <Modal open onClose={cancelVerificationDecision}
      title={verificationDecision === "approved" ? "Approve student verification" : "Reject student verification"}
      footer={<>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={cancelVerificationDecision} disabled={verificationSaving}>Cancel</button>
        <button type="submit" form="student-verification-decision" className={`adm-btn ${verificationDecision === "approved" ? "adm-btn-primary" : "adm-btn-danger"}`}
          disabled={verificationSaving || (verificationDecision === "approved" && !expiresAt)}>
          {verificationSaving ? "Saving…" : verificationDecision === "approved" ? "Approve" : "Confirm"}
        </button>
      </>}
    >
      <form id="student-verification-decision" onSubmit={submitVerificationDecision}>
        {verificationDecision === "approved" ? (
          <label className="adm-field">Student pricing valid through
            <input className="adm-input" type="date" required min={new Date().toLocaleDateString("sv-SE")}
              value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} disabled={verificationSaving} />
          </label>
        ) : (
          <>
            <p>Reject this application for student pricing?</p>
            <label className="adm-field">Reason for rejection (optional)
              <textarea value={verificationRemarks} onChange={(event) => setVerificationRemarks(event.target.value)} disabled={verificationSaving} />
            </label>
          </>
        )}
        {verificationError && <p className="adm-error" role="alert">{verificationError}</p>}
      </form>
    </Modal>}
    {selected && collection === "orders" && <Modal open onClose={() => setSelected(null)} title={`Order ${selected.orderNo}`} subtitle={`Placed ${display("orderCreatedAt", selected.orderCreatedAt)}`} size="lg">
      {(() => { const customer = users.find((u) => u.userId === selected.userId); return <>
        <section className="adm-section"><h3 className="adm-section-title">Customer</h3><p>{customer?.fullName || selected.userId}</p><p>{customer?.email || ""}{customer?.phone ? ` · ${customer.phone}` : ""}</p></section>
        <section className="adm-section"><h3 className="adm-section-title">Order details</h3><p><b>Status:</b> {selected.orderStatus}</p><p><b>Pickup:</b> {display("pickupDate", selected.pickupDate)}</p><p><b>Picked up:</b> {display("pickedUpAt", selected.pickedUpAt)}</p><p><b>Subtotal:</b> {formatPeso(selected.subtotal)} · <b>Discount:</b> {formatPeso(selected.discountTotal)} · <b>Total:</b> {formatPeso(selected.total)}</p><p><b>Payment:</b> {selected.payment?.method || "—"} / {selected.payment?.payStatus || "—"}{selected.payment?.reference ? ` · ${selected.payment.reference}` : ""}</p><p><b>Verification:</b> {selected.verificationId || "None"}</p></section>
        {Object.hasOwn(transferMethods, selected.payment?.method) && selected.payment.reference && selected.orderStatus !== "cancelled"
          && ["under_review", "pending", "unpaid", ""].includes(selected.payment.payStatus) && <section className="adm-section">
            <h3 className="adm-section-title">Review {selected.payment.method} payment</h3>
            <p>Match reference <strong>{selected.payment.reference}</strong> and amount <strong>{formatPeso(selected.total)}</strong> against the received transfer.</p>
            {paymentError?.orderId === selected.orderId && <p className="adm-error" role="alert">{paymentError.message}</p>}
            <button type="button" className="adm-btn adm-btn-primary" onClick={verifyTransferPayment} disabled={paymentSaving}>
              {paymentSaving ? "Saving…" : "Mark as paid"}
            </button>
          </section>}
        <section className="adm-section"><h3 className="adm-section-title">Items</h3>{(selected.orderItems || []).map((item, i) => { const unit = units.find((u) => u.unitId === item.unitId); return <article className="adm-card" key={item.unitId || i}><b>{item.snapshot?.snapBrand} {item.snapshot?.snapModelName}</b><p>Serial: {item.snapshot?.snapSerialNumber || unit?.serialNumber || "—"}</p><p>Sale price: {formatPeso(item.priceAtSale)} · Return deadline: {display("returnDeadline", item.returnDeadline)}</p></article>; })}</section>
        <section className="adm-section"><h3 className="adm-section-title">Status history</h3>{(selected.statusHistory || []).map((h, i) => <p key={i}>{h.newStatus} · {display("changedAt", h.changedAt)}</p>)}</section>
      </>; })()}
    </Modal>}
    {selected && collection === "audit_logs" && <Drawer open onClose={() => setSelected(null)} title={`${selected.action} ${selected.targetCollection}`} subtitle={`${users.find((u) => u.userId === selected.adminId)?.fullName || "Staff"} · ${display("logCreatedAt", selected.logCreatedAt)}`}>
      <section className="adm-section"><h3 className="adm-section-title">Record</h3><p><b>Collection:</b> {selected.targetCollection}</p><p><b>Target ID:</b> {selected.targetId || "—"}</p></section>
      <section className="adm-section"><h3 className="adm-section-title">Before</h3><pre className="adm-json">{JSON.stringify(selected.changes?.before ?? null, null, 2)}</pre></section>
      <section className="adm-section"><h3 className="adm-section-title">After</h3><pre className="adm-json">{JSON.stringify(selected.changes?.after ?? null, null, 2)}</pre></section>
    </Drawer>}
  </section>;
}

function OrderStatusButtons({ order, mutate, onSeeDetails }) {
  const statusKey = String(order.orderStatus || "").trim().toLowerCase().replace(/[ -]+/g, "_");
  const available = {
    pending: [["confirmed", "Confirm"], ["cancelled", "Cancel"]],
    confirmed: [["ready_for_pickup", "Ready for pickup"], ["cancelled", "Cancel"]],
    ready_for_pickup: [["picked_up", "Picked up"], ["cancelled", "Cancel"]],
  }[statusKey] || [];
  if (!available.length) return <button type="button" className="adm-btn adm-btn-primary adm-btn-sm" onClick={(event) => { event.stopPropagation(); onSeeDetails(); }}>See Details</button>;
  return <div className="adm-action-buttons">{available.map(([status, label]) => <button type="button" key={status} className={`adm-btn ${status === "cancelled" ? "adm-btn-ghost" : "adm-btn-primary"} adm-btn-sm`}
    onClick={(event) => { event.stopPropagation(); mutate(`/orders/${order.orderId}`, { method: "PATCH", body: { orderStatus: status } }); }}>{label}</button>)}</div>;
}

function CreateCatalogForm({ refresh }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("laptop_models");
  const [draft, setDraft] = useState({ brand: "", modelName: "", msrp: "", specs: {}, courseCode: "", courseName: "", requirements: {} }); const [error, setError] = useState("");
  const setValue = (group, key, value) => setDraft((d) => group ? { ...d, [group]: { ...d[group], [key]: value } } : { ...d, [key]: value });
  const submit = async (e) => { e.preventDefault(); setError(""); try {
    const body = kind === "courses" ? { courseCode: draft.courseCode, courseName: draft.courseName, requirements: draft.requirements } : { brand: draft.brand, modelName: draft.modelName, msrp: Number(draft.msrp || 0), specs: Object.fromEntries(Object.entries(draft.specs).map(([k,v]) => [k, v === "" ? null : v])) };
    await adminRequest(`/${kind}`, { method: "POST", body });
    setDraft({ brand: "", modelName: "", msrp: "", specs: {}, courseCode: "", courseName: "", requirements: {} }); setOpen(false); await refresh();
  } catch (err) { setError(err.message); } };
  return <>
    <button type="button" className="adm-btn adm-btn-primary" onClick={() => { setError(""); setOpen(true); }}>Add catalog item</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Add catalog item" size="lg"
      footer={<><button type="button" className="adm-btn adm-btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button type="submit" form="catalog-create-form" className="adm-btn adm-btn-primary">Add item</button></>}>
      <form id="catalog-create-form" className="adm-form-grid adm-catalog-edit-form" onSubmit={submit}>
        <label>Item type<select value={kind} onChange={(e) => { setKind(e.target.value); setError(""); }}><option value="laptop_models">Laptop model</option><option value="courses">Course</option></select></label>
        {kind === "courses" ? <><CatalogFields group="" fields={COURSE_BASE_FIELDS} draft={draft} setValue={setValue} /><CatalogFields group="requirements" fields={COURSE_REQ_FIELDS} draft={draft} setValue={setValue} /></> : <><CatalogFields group="" fields={MODEL_BASE_FIELDS} draft={draft} setValue={setValue} /><CatalogFields group="specs" fields={MODEL_SPEC_FIELDS} draft={draft} setValue={setValue} /></>}
        {error && <p className="adm-error" role="alert">{error}</p>}
      </form>
    </Modal>
  </>;
}

function CatalogEdit({ row, refresh }) {
  const [editing, setEditing] = useState(false); const [error, setError] = useState(""); const [draft, setDraft] = useState(() => ({ ...row, specs: { ...(row.specs || {}) }, requirements: { ...(row.requirements || {}) } }));
  const id = row.courseId || row.modelId;
  const setValue = (group, key, value) => setDraft((d) => group ? { ...d, [group]: { ...d[group], [key]: value } } : { ...d, [key]: value });
  const save = async (e) => { e.preventDefault(); const collection = row._kind;
    try { const body = collection === "courses" ? { courseCode: draft.courseCode, courseName: draft.courseName, requirements: draft.requirements } : { brand: draft.brand, modelName: draft.modelName, msrp: Number(draft.msrp || 0), specs: draft.specs };
    await adminRequest(`/${collection}/${id}`, { method: "PATCH", body });
    setEditing(false); await refresh();
    } catch (e2) { setError(e2.message); }
  };
  return <>
    <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setError(""); setEditing(true); }}>Edit</button>
    <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${row._kind === "courses" ? "course" : "laptop model"}`} size="lg"
      footer={<><button type="button" className="adm-btn adm-btn-ghost" onClick={() => setEditing(false)}>Cancel</button><button type="submit" form={`catalog-edit-${id}`} className="adm-btn adm-btn-primary">Save changes</button></>}>
      <form id={`catalog-edit-${id}`} className="adm-form-grid adm-catalog-edit-form" onSubmit={save}>
        {row._kind === "courses"
          ? <><CatalogFields group="" fields={COURSE_BASE_FIELDS} draft={draft} setValue={setValue} /><CatalogFields group="requirements" fields={COURSE_REQ_FIELDS} draft={draft} setValue={setValue} /></>
          : <><CatalogFields group="" fields={MODEL_BASE_FIELDS} draft={draft} setValue={setValue} /><CatalogFields group="specs" fields={MODEL_SPEC_FIELDS} draft={draft} setValue={setValue} /></>}
        {error && <p className="adm-error" role="alert">{error}</p>}
      </form>
    </Modal>
  </>;
}

const MODEL_BASE_FIELDS = [["brand", "Brand", "text"], ["modelName", "Model name", "text"], ["msrp", "MSRP", "number"]];
const MODEL_SPEC_FIELDS = [["cpuName", "CPU name", "text"], ["cpuTier", "CPU tier", "number"], ["ramGb", "RAM (GB)", "number"], ["storageGb", "Storage (GB)", "number"], ["storageType", "Storage type", "text"], ["gpu", "GPU", "text"], ["hasDedicatedGpu", "Dedicated GPU", "text"], ["screenSizeIn", "Screen size (in)", "number"], ["weightKg", "Weight (kg)", "number"], ["os", "Operating system", "text"], ["designBatteryHrs", "Designed battery hours", "number"]];
const COURSE_BASE_FIELDS = [["courseCode", "Course code", "text"], ["courseName", "Course name", "text"]];
const COURSE_REQ_FIELDS = [["minRamGb", "Minimum RAM (GB)", "number"], ["minStorageGb", "Minimum storage (GB)", "number"], ["minCpuTier", "Minimum CPU tier", "number"], ["gpuRequired", "GPU required", "boolean"], ["minBatteryHours", "Minimum battery hours", "number"], ["reqNotes", "Requirement notes", "text"]];
function CatalogFields({ group, fields, draft, setValue }) { return fields.map(([key, label, type]) => <label key={key}>{label}{type === "boolean" ? <input type="checkbox" checked={Boolean((group ? draft[group] : draft)[key])} onChange={(e) => setValue(group, key, e.target.checked)} /> : <input required={!group && ["brand", "modelName", "courseCode", "courseName"].includes(key)} type={type} min={type === "number" ? "0" : undefined} value={(group ? draft[group] : draft)[key] ?? ""} onChange={(e) => setValue(group, key, type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} />}</label>); }
