import express from "express";
import { v4 as uuid } from "uuid";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { generateAccountNumber } from "../utils/accountNumber.js";

const router = express.Router();
router.use(requireAuth);

function toPublicAccount(account) {
  return {
    id: account.id,
    accountNumber: account.accountNumber,
    name: account.name,
    balance: account.balance,
    createdAt: account.createdAt,
  };
}

router.get("/", (req, res) => {
  const accounts = db.accounts.filter((a) => a.userId === req.userId);
  res.json({ accounts: accounts.map(toPublicAccount) });
});

router.post("/", (req, res) => {
  const { name } = req.body || {};
  const account = {
    id: uuid(),
    userId: req.userId,
    accountNumber: generateAccountNumber(),
    name: name && String(name).trim() ? String(name).trim() : "새 계좌",
    balance: 0,
    createdAt: new Date().toISOString(),
  };
  db.accounts.push(account);
  db.save();
  res.status(201).json({ account: toPublicAccount(account) });
});

router.get("/:id", (req, res) => {
  const account = db.accounts.find((a) => a.id === req.params.id && a.userId === req.userId);
  if (!account) return res.status(404).json({ error: "계좌를 찾을 수 없습니다." });
  res.json({ account: toPublicAccount(account) });
});

// 이체 전 수취인 계좌 확인용 (본인 계좌를 포함해 은행 내 모든 계좌 대상 조회)
router.get("/lookup/:accountNumber", (req, res) => {
  const account = db.accounts.find((a) => a.accountNumber === req.params.accountNumber);
  if (!account) return res.status(404).json({ error: "존재하지 않는 계좌번호입니다." });
  const owner = db.users.find((u) => u.id === account.userId);
  res.json({
    accountNumber: account.accountNumber,
    accountName: account.name,
    ownerName: owner ? owner.name : "알수없음",
  });
});

export default router;
