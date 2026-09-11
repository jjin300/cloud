import express from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { query, withTransaction } from "../db.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { generateAccountNumber } from "../utils/accountNumber.js";

const router = express.Router();

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
}

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "이름, 이메일, 비밀번호를 모두 입력해주세요." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "비밀번호는 6자 이상이어야 합니다." });
  }
  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await query("SELECT 1 FROM users WHERE email = $1", [normalizedEmail]);
  if (existing.rowCount > 0) {
    return res.status(409).json({ error: "이미 가입된 이메일입니다." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuid();
  const accountNumber = await generateAccountNumber();

  const userRow = await withTransaction(async (client) => {
    const inserted = await client.query(
      "INSERT INTO users (id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, String(name).trim(), normalizedEmail, passwordHash]
    );
    await client.query(
      "INSERT INTO accounts (id, user_id, account_number, name, balance) VALUES ($1, $2, $3, $4, 0)",
      [uuid(), userId, accountNumber, "정기예금"]
    );
    return inserted.rows[0];
  });

  const token = signToken(userRow.id);
  res.status(201).json({ token, user: publicUser(userRow) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "이메일과 비밀번호를 입력해주세요." });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const result = await query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }
  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  const result = await query("SELECT * FROM users WHERE id = $1", [req.userId]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
  res.json({ user: publicUser(user) });
});

export default router;
