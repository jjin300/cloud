import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api.js";
import TransactionModal from "../components/TransactionModal.jsx";

const TYPE_LABELS = {
  deposit: "입금",
  withdraw: "출금",
  transfer_in: "이체 입금",
  transfer_out: "이체 출금",
};

const PAGE_SIZE = 10;

export default function AccountDetail() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState(null);

  const loadAccount = useCallback(async () => {
    const res = await api.get(`/accounts/${id}`);
    setAccount(res.data.account);
  }, [id]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    const params = { page, pageSize: PAGE_SIZE };
    if (type !== "all") params.type = type;
    if (search) params.search = search;
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await api.get(`/transactions/${id}`, { params });
    setTransactions(res.data.transactions);
    setTotal(res.data.total);
    setLoading(false);
  }, [id, page, type, search, from, to]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function handleFilterChange(setter) {
    return (e) => {
      setPage(1);
      setter(e.target.value);
    };
  }

  function handleModalSuccess() {
    setActiveModal(null);
    loadAccount();
    loadTransactions();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (!account) return <div className="page">불러오는 중...</div>;

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ← 계좌 목록
      </Link>
      <div className="page-header">
        <div>
          <h1>{account.name}</h1>
          <p className="account-number">{account.accountNumber}</p>
          <p className="account-balance">{account.balance.toLocaleString()}원</p>
        </div>
        <div className="account-card-actions">
          <button onClick={() => setActiveModal("deposit")}>입금</button>
          <button onClick={() => setActiveModal("withdraw")}>출금</button>
          <button onClick={() => setActiveModal("transfer")}>이체</button>
        </div>
      </div>

      <div className="filter-bar">
        <select value={type} onChange={handleFilterChange(setType)}>
          <option value="all">전체</option>
          <option value="deposit">입금</option>
          <option value="withdraw">출금</option>
          <option value="transfer_in">이체 입금</option>
          <option value="transfer_out">이체 출금</option>
        </select>
        <input
          type="text"
          placeholder="메모/상대방 검색"
          value={search}
          onChange={handleFilterChange(setSearch)}
        />
        <input type="date" value={from} onChange={handleFilterChange(setFrom)} />
        <span>~</span>
        <input type="date" value={to} onChange={handleFilterChange(setTo)} />
      </div>

      {loading ? (
        <p>불러오는 중...</p>
      ) : transactions.length === 0 ? (
        <p>거래 내역이 없습니다.</p>
      ) : (
        <>
          <table className="tx-table">
            <thead>
              <tr>
                <th>일시</th>
                <th>구분</th>
                <th>상대방</th>
                <th>메모</th>
                <th>금액</th>
                <th>거래 후 잔액</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isCredit = tx.type === "deposit" || tx.type === "transfer_in";
                return (
                  <tr key={tx.id}>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${isCredit ? "badge-credit" : "badge-debit"}`}>
                        {TYPE_LABELS[tx.type]}
                      </span>
                    </td>
                    <td>{tx.counterpartName || "-"}</td>
                    <td>{tx.memo || "-"}</td>
                    <td className={isCredit ? "amount-credit" : "amount-debit"}>
                      {isCredit ? "+" : "-"}
                      {tx.amount.toLocaleString()}원
                    </td>
                    <td>{tx.balanceAfter.toLocaleString()}원</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              이전
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              다음
            </button>
          </div>
        </>
      )}

      {activeModal && (
        <TransactionModal
          mode={activeModal}
          account={account}
          onClose={() => setActiveModal(null)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
