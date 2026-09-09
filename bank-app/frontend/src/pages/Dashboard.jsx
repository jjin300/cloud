import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import TransactionModal from "../components/TransactionModal.jsx";
import NewAccountModal from "../components/NewAccountModal.jsx";

export default function Dashboard() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null); // { mode, account } | { mode: 'new' }

  async function loadAccounts() {
    setLoading(true);
    const res = await api.get("/accounts");
    setAccounts(res.data.accounts);
    setLoading(false);
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  function handleModalSuccess() {
    setActiveModal(null);
    loadAccounts();
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>내 계좌</h1>
          <p className="total-balance">총 자산 {totalBalance.toLocaleString()}원</p>
        </div>
        <button className="primary" onClick={() => setActiveModal({ mode: "new" })}>
          + 새 계좌
        </button>
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : accounts.length === 0 ? (
        <p>보유한 계좌가 없습니다.</p>
      ) : (
        <div className="account-grid">
          {accounts.map((account) => (
            <div className="account-card" key={account.id}>
              <div className="account-card-top">
                <h3>{account.name}</h3>
                <span className="account-number">{account.accountNumber}</span>
              </div>
              <p className="account-balance">{account.balance.toLocaleString()}원</p>
              <div className="account-card-actions">
                <button onClick={() => setActiveModal({ mode: "deposit", account })}>입금</button>
                <button onClick={() => setActiveModal({ mode: "withdraw", account })}>출금</button>
                <button onClick={() => setActiveModal({ mode: "transfer", account })}>이체</button>
                <Link to={`/accounts/${account.id}`} className="detail-link">
                  내역 보기 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeModal?.mode === "new" && (
        <NewAccountModal onClose={() => setActiveModal(null)} onSuccess={handleModalSuccess} />
      )}
      {["deposit", "withdraw", "transfer"].includes(activeModal?.mode) && (
        <TransactionModal
          mode={activeModal.mode}
          account={activeModal.account}
          onClose={() => setActiveModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
