import "dotenv/config";
import express from "express";
import "express-async-errors";
import cors from "cors";
import { initSchema } from "./db.js";
import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import transactionRoutes from "./routes/transactions.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transactions", transactionRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Mock bank API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("데이터베이스 초기화 실패:", err);
    process.exit(1);
  });
