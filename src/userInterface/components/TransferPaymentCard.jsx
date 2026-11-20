import { useId, useState } from "react";
import { submitPaymentReference } from "../../api";
import { StatusChip } from "../pages/BuyerShared";
import { formatPeso } from "../pages/buyerUtils";
import "./TransferPaymentCard.css";

const merchantName = import.meta.env.VITE_GCASH_ACCOUNT_NAME?.trim();
const merchantNumber = import.meta.env.VITE_GCASH_ACCOUNT_NUMBER?.trim();
const merchantQR = import.meta.env.VITE_GCASH_QR_URL?.trim();
const paymentConfigured = merchantName && (merchantNumber || merchantQR);

const bankName = import.meta.env.VITE_BANK_NAME?.trim();
const bankAccountName = import.meta.env.VITE_BANK_ACCOUNT_NAME?.trim();
const bankAccountNumber = import.meta.env.VITE_BANK_ACCOUNT_NUMBER?.trim();

export default function TransferPaymentCard({ method, orderNo, total, payment, onPaymentChange }) {
  const isGCash = method === "GCash";
  const accountName = isGCash ? merchantName : bankAccountName;
  const accountNumber = isGCash ? merchantNumber : bankAccountNumber;
  const qr = isGCash ? merchantQR : undefined;
  const configured = isGCash ? paymentConfigured : bankName && accountName && accountNumber;
  const referenceId = useId();
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const paid = payment?.payStatus === "paid";
  const awaitingReview = payment?.payStatus === "under_review" || Boolean(payment?.reference);

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopyMessage("Number copied.");
    } catch {
      setCopyMessage("Select the number to copy it.");
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!configured || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await submitPaymentReference(orderNo, method, reference);
      onPaymentChange(result.payment);
    } catch (requestError) {
      setError(requestError.message || "Could not submit your payment reference.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="transfer-card" aria-label={`${method} payment`}>
      <header className="transfer-card-head">
        <div><h3>{method} payment</h3><p>Order {orderNo}</p></div>
        <strong>{formatPeso(total)}</strong>
      </header>
      {paid ? <div>
          <StatusChip tone="green">Paid</StatusChip>
          {payment.reference && <p>Reference {payment.reference}</p>}
        </div>
        : payment?.payStatus === "refunded" ? <StatusChip tone="grey">Refunded</StatusChip>
        : awaitingReview ? <div role="status">
          <StatusChip tone="amber">Payment under review</StatusChip>
          {payment.reference && <p>Reference {payment.reference}</p>}
        </div>
        : <div className="transfer-instructions">
          {configured ? <>
            <p>{isGCash ? "Send the exact total in GCash, then enter the reference from your receipt."
              : "Transfer the exact total to this account, then enter the reference from your bank receipt."}</p>
            {qr && <div className="transfer-qr">
              <img src={qr} alt="ByteBud GCash payment QR code" />
              <a className="by-btn by-btn-outline by-btn-sm" href={qr} download>Save QR</a>
            </div>}
            <dl className="transfer-recipient">
              {!isGCash && <div><dt>Bank</dt><dd>{bankName}</dd></div>}
              <div><dt>Account name</dt><dd>{accountName}</dd></div>
              {accountNumber && <div><dt>{isGCash ? "GCash number" : "Account number"}</dt><dd>{accountNumber}
                <button type="button" className="by-btn by-btn-ghost by-btn-sm" onClick={copyNumber}>Copy</button>
              </dd></div>}
            </dl>
            {copyMessage && <p role="status">{copyMessage}</p>}
          </> : <p>Payment instructions are unavailable. Check this order again once ByteBud has set up this payment method.</p>}
          <form className="transfer-form" onSubmit={submit}>
            <label htmlFor={referenceId}>{isGCash ? "GCash reference number" : "Bank transaction reference"}</label>
            <input id={referenceId} value={reference} onChange={(event) => setReference(event.target.value)}
              placeholder="Enter the reference from your receipt" inputMode={isGCash ? "numeric" : "text"}
              pattern={isGCash ? "[0-9]{6,32}" : undefined} maxLength={isGCash ? 32 : 64}
              required disabled={!configured || busy} />
            {error && <p role="alert">{error}</p>}
            <button type="submit" className="by-btn by-btn-primary" disabled={!configured || busy}>
              {busy ? "Submitting…" : "Submit payment details"}
            </button>
          </form>
        </div>}
    </section>
  );
}
