import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://prpvhnwedpnnwpdvrttz.supabase.co";
const SUPABASE_KEY = "sb_publishable_8L3WUiCoHM9ut9Pur_xyww_guaDeVFj";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", () => {
  document.body.innerHTML = `
    <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;background:#111;color:white;min-height:100vh;">
      <h1>ShinEscape Manager</h1>
      <h2>Economics</h2>

      <button id="addBooking" style="margin-top:24px;padding:14px 20px;border:0;border-radius:14px;background:#0a84ff;color:white;font-size:16px;">
        + Nuova prenotazione test
      </button>

      <pre id="result" style="margin-top:24px;white-space:pre-wrap;"></pre>
    </main>
  `;

  document.getElementById("addBooking").addEventListener("click", addTestBooking);
});

async function addTestBooking() {
  const { data, error } = await supabase
    .from("bookings")
    .insert([
      {
        name: "Test Cliente",
        amount: 1000,
        account_type: "Black",
        status: "Da saldare",
        deposit: 250,
        source: "Diretto"
      }
    ])
    .select();

  const result = document.getElementById("result");

  if (error) {
    result.textContent = "ERRORE:\n" + JSON.stringify(error, null, 2);
    return;
  }

  result.textContent = "Prenotazione inserita:\n" + JSON.stringify(data, null, 2);
}
