import { useState } from "react";
import api, { apiErrorMessage } from "../api.js";
import Modal from "./Modal.jsx";

const TITLES = {
  deposit: "입금",
  withdraw: "출금",
  transfer: "계좌 이체",
};

export default function TransactionModal({ mode, account, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [toAccountNumber, setToAccountNumber] = useState("");
  const [recipient, setRecipient] = useState(null);
  const [checkingRecipient, setCheckingRecipient] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function checkRecipient() {
    setError("");
    setRecipient(null);
    if (!toAccountNumber.trim()) return;
    setCheckingRecipient(true);
    try {
      const res = await api.get(`/accounts/lookup/${encodeURIComponent(toAccountNumber.trim())}`);
      setRecipient(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCheckingRecipient(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("올바른 금액을 입력해주세요.");
      return;
    }
    if (mode === "transfer" && !recipient) {
      setError("이체 전 수취 계좌를 확인해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "deposit") {
        await api.post(`/transactions/${account.id}/deposit`, { amount: parsedAmount, memo });
      } else if (mode === "withdraw") {
        await api.post(`/transactions/${account.id}/withdraw`, { amount: parsedAmount, memo });
      } else {
        await api.post("/transactions/transfer", {
          fromAccountId: account.id,
          toAccountNumber: toAccountNumber.trim(),
          amount: parsedAmount,
          memo,
        });
      }
      onSuccess();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`${account.name} · ${TITLES[mode]}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="transaction-form">
        <div className="balance-hint">현재 잔액: {account.balance.toLocaleString()}원</div>
        {error && <div className="error-box">{error}</div>}

        {mode === "transfer" && (
          <label>
            받는 계좌번호
            <div className="inline-field">
              <input
                value={toAccountNumber}
                onChange={(e) => {
                  setToAccountNumber(e.target.value);
                  setRecipient(null);
                }}
                placeholder="110-000-000000"
                required
              />
              <button type="button" onClick={checkRecipient} disabled={checkingRecipient}>
                {checkingRecipient ? "확인 중..." : "계좌 확인"}
              </button>
            </div>
            {recipient && (
              <div className="recipient-box">
                받는 사람: <strong>{recipient.ownerName}</strong> ({recipient.accountName})
              </div>
            )}
          </label>
        )}

        <label>
          금액 (원)
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus={mode !== "transfer"}
          />
        </label>
        <label>
          메모 (선택)
          <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={100} />
        </label>
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? "처리 중..." : `${TITLES[mode]} 실행`}
        </button>
      </form>
    </Modal>
  );
}
