const SUPABASE_URL = "https://prpvhnwedpnnwpdvrttz.supabase.co";
const SUPABASE_KEY = "sb_publishable_8L3WUiCoHM9ut9Pur_xyww_guaDeVFj";

console.log("ShinEscape Manager online");
console.log("Supabase URL:", SUPABASE_URL);

document.addEventListener("DOMContentLoaded", () => {
  document.body.innerHTML = `
    <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;background:#111;color:white;min-height:100vh;">
      <h1>ShinEscape Manager</h1>
      <h2>Economics</h2>

      <div style="margin-top:24px;padding:20px;border-radius:20px;background:#1c1c1e;">
        <h3>Database collegato</h3>
        <p>Project URL:</p>
        <code>${SUPABASE_URL}</code>
      </div>

      <button style="margin-top:24px;padding:14px 20px;border:0;border-radius:14px;background:#0a84ff;color:white;font-size:16px;">
        + Nuova prenotazione
      </button>
    </main>
  `;
});
