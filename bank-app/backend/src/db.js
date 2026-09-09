import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data.json");

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { users: [], accounts: [], transactions: [] };
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { users: [], accounts: [], transactions: [] };
  }
}

const data = loadData();

function persist() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export const db = {
  get users() {
    return data.users;
  },
  get accounts() {
    return data.accounts;
  },
  get transactions() {
    return data.transactions;
  },
  save: persist,
};
