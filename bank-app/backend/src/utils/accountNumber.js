import { db } from "../db.js";

function randomDigits(len) {
  let s = "";
  for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export function generateAccountNumber() {
  let accountNumber;
  do {
    accountNumber = `110-${randomDigits(3)}-${randomDigits(6)}`;
  } while (db.accounts.some((a) => a.accountNumber === accountNumber));
  return accountNumber;
}
