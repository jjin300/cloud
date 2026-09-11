import express from "express";
import { v4 as uuid } from "uuid";
import { query, withTransaction } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

function parseAmount(raw) {
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount);
}

function toPublicTransaction(row) {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type,
    amount: Number(row.amount),
    balanceAfter: Number(row.balance_after),
    memo: row.memo || "",
    counterpartAccountNumber: row.counterpart_account_number,
    counterpartName: row.counterpart_name,
    createdAt: row.created_at,
  };
}

async function insertTransaction(client, { accountId, type, amount, balanceAfter, memo, counterpartAccountNumber, counterpartName }) {
  const result = await client.query(
    `INSERT INTO transactions
      (id, account_id, type, amount, balance_after, memo, counterpart_account_number, counterpart_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      uuid(),
      accountId,
      type,
      amount,
      balanceAfter,
      memo ? String(memo).trim().slice(0, 100) : "",
      counterpartAccountNumber || null,
      counterpartName || null,
    ]
  );
  return result.rows[0];
}

router.post("/:accountId/deposit", async (req, res) => {
  const amount = parseAmount(req.body?.amount);
  if (!amount) return res.status(400).json({ error: "올바른 입금 금액을 입력해주세요." });

  try {
    const { tx, balance } = await withTransaction(async (client) => {
      const accountResult = await client.query(
        "SELECT * FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [req.params.accountId, req.userId]
      );
      const account = accountResult.rows[0];
      if (!account) throw { status: 404, message: "계좌를 찾을 수 없습니다." };

      const newBalance = Number(account.balance) + amount;
      await client.query("UPDATE accounts SET balance = $1 WHERE id = $2", [newBalance, account.id]);
      const txRow = await insertTransaction(client, {
        accountId: account.id,
        type: "deposit",
        amount,
        balanceAfter: newBalance,
        memo: req.body?.memo,
      });
      return { tx: txRow, balance: newBalance };
    });
    res.status(201).json({ balance, transaction: toPublicTransaction(tx) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.post("/:accountId/withdraw", async (req, res) => {
  const amount = parseAmount(req.body?.amount);
  if (!amount) return res.status(400).json({ error: "올바른 출금 금액을 입력해주세요." });

  try {
    const { tx, balance } = await withTransaction(async (client) => {
      const accountResult = await client.query(
        "SELECT * FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [req.params.accountId, req.userId]
      );
      const account = accountResult.rows[0];
      if (!account) throw { status: 404, message: "계좌를 찾을 수 없습니다." };
      if (amount > Number(account.balance)) {
        throw { status: 400, message: "잔액이 부족합니다." };
      }

      const newBalance = Number(account.balance) - amount;
      await client.query("UPDATE accounts SET balance = $1 WHERE id = $2", [newBalance, account.id]);
      const txRow = await insertTransaction(client, {
        accountId: account.id,
        type: "withdraw",
        amount,
        balanceAfter: newBalance,
        memo: req.body?.memo,
      });
      return { tx: txRow, balance: newBalance };
    });
    res.status(201).json({ balance, transaction: toPublicTransaction(tx) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.post("/transfer", async (req, res) => {
  const { fromAccountId, toAccountNumber, amount: rawAmount, memo } = req.body || {};
  const amount = parseAmount(rawAmount);
  if (!amount) return res.status(400).json({ error: "올바른 이체 금액을 입력해주세요." });

  try {
    const { tx, balance } = await withTransaction(async (client) => {
      const fromResult = await client.query(
        "SELECT * FROM accounts WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [fromAccountId, req.userId]
      );
      const fromAccount = fromResult.rows[0];
      if (!fromAccount) throw { status: 404, message: "출금 계좌를 찾을 수 없습니다." };

      // 데드락 방지를 위해 계좌 id 순으로 잠금 순서를 고정
      const toResultBeforeLock = await client.query("SELECT id FROM accounts WHERE account_number = $1", [
        toAccountNumber,
      ]);
      const toId = toResultBeforeLock.rows[0]?.id;
      if (!toId) throw { status: 404, message: "존재하지 않는 수취 계좌번호입니다." };
      if (toId === fromAccount.id) throw { status: 400, message: "같은 계좌로는 이체할 수 없습니다." };

      const [firstId, secondId] = [fromAccount.id, toId].sort();
      await client.query("SELECT id FROM accounts WHERE id = $1 FOR UPDATE", [firstId]);
      await client.query("SELECT id FROM accounts WHERE id = $1 FOR UPDATE", [secondId]);

      const toResult = await client.query("SELECT * FROM accounts WHERE id = $1", [toId]);
      const toAccount = toResult.rows[0];

      if (amount > Number(fromAccount.balance)) throw { status: 400, message: "잔액이 부족합니다." };

      const fromUserResult = await client.query("SELECT name FROM users WHERE id = $1", [fromAccount.user_id]);
      const toUserResult = await client.query("SELECT name FROM users WHERE id = $1", [toAccount.user_id]);

      const fromNewBalance = Number(fromAccount.balance) - amount;
      const toNewBalance = Number(toAccount.balance) + amount;

      await client.query("UPDATE accounts SET balance = $1 WHERE id = $2", [fromNewBalance, fromAccount.id]);
      await client.query("UPDATE accounts SET balance = $1 WHERE id = $2", [toNewBalance, toAccount.id]);

      const outTx = await insertTransaction(client, {
        accountId: fromAccount.id,
        type: "transfer_out",
        amount,
        balanceAfter: fromNewBalance,
        memo,
        counterpartAccountNumber: toAccount.account_number,
        counterpartName: toUserResult.rows[0]?.name,
      });
      await insertTransaction(client, {
        accountId: toAccount.id,
        type: "transfer_in",
        amount,
        balanceAfter: toNewBalance,
        memo,
        counterpartAccountNumber: fromAccount.account_number,
        counterpartName: fromUserResult.rows[0]?.name,
      });

      return { tx: outTx, balance: fromNewBalance };
    });
    res.status(201).json({ balance, transaction: toPublicTransaction(tx) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    throw err;
  }
});

router.get("/:accountId", async (req, res) => {
  const accountResult = await query("SELECT id FROM accounts WHERE id = $1 AND user_id = $2", [
    req.params.accountId,
    req.userId,
  ]);
  if (!accountResult.rows[0]) return res.status(404).json({ error: "계좌를 찾을 수 없습니다." });

  const { type, search, from, to } = req.query;
  const conditions = ["account_id = $1"];
  const params = [req.params.accountId];

  if (type && type !== "all") {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(
      `(memo ILIKE $${idx} OR counterpart_name ILIKE $${idx} OR counterpart_account_number ILIKE $${idx})`
    );
  }
  if (from) {
    params.push(from);
    conditions.push(`created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    conditions.push(`created_at < ($${params.length}::date + interval '1 day')`);
  }

  const whereClause = conditions.join(" AND ");

  const countResult = await query(`SELECT COUNT(*) FROM transactions WHERE ${whereClause}`, params);
  const total = Number(countResult.rows[0].count);

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 10));
  const offset = (page - 1) * pageSize;

  const listParams = [...params, pageSize, offset];
  const listResult = await query(
    `SELECT * FROM transactions WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  res.json({ transactions: listResult.rows.map(toPublicTransaction), total, page, pageSize });
});

export default router;
