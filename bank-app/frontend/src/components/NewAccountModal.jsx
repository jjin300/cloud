import { useState } from "react";
import api, { apiErrorMessage } from "../api.js";
import Modal from "./Modal.jsx";

export default function NewAccountModal({ onClose, onSuccess }) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post("/accounts", { name });
      onSuccess();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="새 계좌 만들기" onClose={onClose}>
      <form onSubmit={handleSubmit} className="transaction-form">
        {error && <div className="error-box">{error}</div>}
        <label>
          계좌 별칭
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 저축 계좌"
            maxLength={30}
            autoFocus
          />
        </label>
        <button type="submit" className="primary" disabled={submitting}>
          {submitting ? "생성 중..." : "계좌 만들기"}
        </button>
      </form>
    </Modal>
  );
}
