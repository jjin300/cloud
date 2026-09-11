import express from "express";
import { v4 as uuid } from "uuid";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { generateAccountNumber } from "../utils/accountNumber.js";

const router = express.Router();
router.use(requireAuth);

function toPublicAccount(row) {
  return {
    id: row.id,
    accountNumber: row.account_number,
    name: row.name,
    balance: Number(row.balance),
    createdAt: row.created_at,
  };
}

router.get("/", async (req, res) => {
  const result = await query(
    "SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC",
    [req.userId]
  );
  res.json({ accounts: result.rows.map(toPublicAccount) });
});

router.post("/", async (req, res) => {
  const { name } = req.body || {};
  const accountNumber = await generateAccountNumber();
  const result = await query(
    "INSERT INTO accounts (id, user_id, account_number, name, balance) VALUES ($1, $2, $3, $4, 0) RETURNING *",
    [uuid(), req.userId, accountNumber, name && String(name).trim() ? String(name).trim() : "새 계좌"]
  );
  res.status(201).json({ account: toPublicAccount(result.rows[0]) });
});

router.get("/:id", async (req, res) => {
  const result = await query("SELECT * FROM accounts WHERE id = $1 AND user_id = $2", [
    req.params.id,
    req.userId,
  ]);
  const account = result.rows[0];
  if (!account) return res.status(404).json({ error: "계좌를 찾을 수 없습니다." });
  res.json({ account: toPublicAccount(account) });
});

// 이체 전 수취인 계좌 확인용 (본인 계좌를 포함해 은행 내 모든 계좌 대상 조회)
router.get("/lookup/:accountNumber", async (req, res) => {
  const result = await query(
    `SELECT accounts.account_number, accounts.name AS account_name, users.name AS owner_name
     FROM accounts JOIN users ON users.id = accounts.user_id
     WHERE accounts.account_number = $1`,
    [req.params.accountNumber]
  );
  const row = result.rows[0];
  if (!row) return res.status(404).json({ error: "존재하지 않는 계좌번호입니다." });
  res.json({
    accountNumber: row.account_number,
    accountName: row.account_name,
    ownerName: row.owner_name,
  });
});

export default router;
