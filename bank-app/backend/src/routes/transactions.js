import express from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

function findOwnAccount(accountId, userId) {
  return db.accounts.find((a) => a.id === accountId && a.userId === userId);
}

function parseAmount(raw) {
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function recordTransaction({ accountId, type, amount, balanceAfter, memo, counterpartAccountNumber, counterpartName }) {
  const tx = {
    id: uuid(),
    accountId,
    type,
    amount,
    balanceAfter,
    memo: memo ? String(memo).trim().slice(0, 100) : "",
    counterpartAccountNumber: counterpartAccountNumber || null,
    counterpartName: counterpartName || null,
    createdAt: new Date().toISOString(),
  };
  db.transactions.push(tx);
  return tx;
}

router.post("/:accountId/deposit", (req, res) => {
  const account = findOwnAccount(req.params.accountId, req.userId);
  if (!account) return res.status(404).json({ error: "계좌를 찾을 수 없습니다." });

  const amount = parseAmount(req.body?.amount);
  if (!amount) return res.status(400).json({ error: "올바른 입금 금액을 입력해주세요." });

  account.balance += amount;
  const tx = recordTransaction({
    accountId: account.id,
    type: "deposit",
    amount,
    balanceAfter: account.balance,
    memo: req.body?.memo,
  });
  db.save();
  res.status(201).json({ balance: account.balance, transaction: tx });
});

router.post("/:accountId/withdraw", (req, res) => {
  const account = findOwnAccount(req.params.accountId, req.userId);
  if (!account) return res.status(404).json({ error: "계좌를 찾을 수 없습니다." });

  const amount = parseAmount(req.body?.amount);
  if (!amount) return res.status(400).json({ error: "올바른 출금 금액을 입력해주세요." });
  if (amount > account.balance) {
    return res.status(400).json({ error: "잔액이 부족합니다." });
  }

  account.balance -= amount;
  const tx = recordTransaction({
    accountId: account.id,
    type: "withdraw",
    amount,
    balanceAfter: account.balance,
    memo: req.body?.memo,
  });
  db.save();
  res.status(201).json({ balance: account.balance, transaction: tx });
});

router.post("/transfer", (req, res) => {
  const { fromAccountId, toAccountNumber, amount: rawAmount, memo } = req.body || {};

  const fromAccount = findOwnAccount(fromAccountId, req.userId);
  if (!fromAccount) return res.status(404).json({ error: "출금 계좌를 찾을 수 없습니다." });

  const toAccount = db.accounts.find((a) => a.accountNumber === toAccountNumber);
  if (!toAccount) return res.status(404).json({ error: "존재하지 않는 수취 계좌번호입니다." });
  if (toAccount.id === fromAccount.id) {
    return res.status(400).json({ error: "같은 계좌로는 이체할 수 없습니다." });
  }

  const amount = parseAmount(rawAmount);
  if (!amount) return res.status(400).json({ error: "올바른 이체 금액을 입력해주세요." });
  if (amount > fromAccount.balance) {
    return res.status(400).json({ error: "잔액이 부족합니다." });
  }

  const fromOwner = db.users.find((u) => u.id === fromAccount.userId);
  const toOwner = db.users.find((u) => u.id === toAccount.userId);

  fromAccount.balance -= amount;
  toAccount.balance += amount;

  const outTx = recordTransaction({
    accountId: fromAccount.id,
    type: "transfer_out",
    amount,
    balanceAfter: fromAccount.balance,
    memo,
    counterpartAccountNumber: toAccount.accountNumber,
    counterpartName: toOwner ? toOwner.name : null,
  });
  recordTransaction({
    accountId: toAccount.id,
    type: "transfer_in",
    amount,
    balanceAfter: toAccount.balance,
    memo,
    counterpartAccountNumber: fromAccount.accountNumber,
    counterpartName: fromOwner ? fromOwner.name : null,
  });

  db.save();
  res.status(201).json({ balance: fromAccount.balance, transaction: outTx });
});

router.get("/:accountId", (req, res) => {
  const account = findOwnAccount(req.params.accountId, req.userId);
  if (!account) return res.status(404).json({ error: "계좌를 찾을 수 없습니다." });

  const { type, search, from, to } = req.query;
  let list = db.transactions.filter((t) => t.accountId === account.id);

  if (type && type !== "all") {
    list = list.filter((t) => t.type === type);
  }
  if (search) {
    const term = String(search).toLowerCase();
    list = list.filter(
      (t) =>
        (t.memo || "").toLowerCase().includes(term) ||
        (t.counterpartName || "").toLowerCase().includes(term) ||
        (t.counterpartAccountNumber || "").toLowerCase().includes(term)
    );
  }
  if (from) {
    const fromTime = new Date(from).getTime();
    list = list.filter((t) => new Date(t.createdAt).getTime() >= fromTime);
  }
  if (to) {
    const toTime = new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1;
    list = list.filter((t) => new Date(t.createdAt).getTime() <= toTime);
  }

  list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
  const total = list.length;
  const start = (page - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);

  res.json({ transactions: pageItems, total, page, pageSize });
});

export default router;
