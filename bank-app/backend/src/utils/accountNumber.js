import { query } from "../db.js";

function randomDigits(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export async function generateAccountNumber() {
  let accountNumber;
  let exists = true;
  while (exists) {
    accountNumber = `110-${randomDigits(3)}-${randomDigits(6)}`;
    const res = await query("SELECT 1 FROM accounts WHERE account_number = $1", [accountNumber]);
    exists = res.rowCount > 0;
  }
  return accountNumber;
}
