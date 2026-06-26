import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://prpvhnwedpnnwpdvrttz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHZobndlZHBubndwZHZydHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjAwMjcsImV4cCI6MjA5Nzk5NjAyN30.jnrGO7j0ptDfnKScitE3vU79SM6tvMevtfM6_Tv7iBE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

document.addEventListener("DOMContentLoaded", async () => {
  renderApp();
  await loadBookings();
});

function euro(value) {
  return Number(value || 0).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  });
}

function renderApp() {
  document.body.innerHTML = `
    <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#111;color:white;min-height:100vh;padding:20px;">
      <h1>ShinEscape Manager</h1>
      <h2>Economics</h2>

      <section id="dashboard" style="display:grid;gap:12px;margin:20px 0;"></section>

      <button id="openForm" style="width:100%;padding:16px;border:0;border-radius:16px;background:#0a84ff;color:white;font-size:17px;font-weight:700;">
        + Nuova prenotazione
      </button>

      <form id="bookingForm" style="display:none;margin-top:20px;background:#1c1c1e;padding:18px;border-radius:20px;">
        <input name="name" placeholder="Nome" required style="width:100%;margin-bottom:10px;padding:12px;border-radius:12px;border:0;">
        <input name="amount" type="number" placeholder="Importo" required style="width:100%;margin-bottom:10px;padding:12px;border-radius:12px;border:0;">
        <select name="account_type" style="width:100%;margin-bottom:10px;padding:12px;border-radius:12px;">
          <option>Black</option>
          <option>White</option>
        </select>
        <select name="status" style="width:100%;margin-bottom:10px;padding:12px;border-radius:12px;">
          <option>Da saldare</option>
          <option>Saldato</option>
        </select>
        <input name="deposit" type="number" placeholder="Acconto" value="0" style="width:100%;margin-bottom:10px;padding:12px;border-radius:12px;border:0;">
        <input name="apartment" type="number" placeholder="Appartamento" style="width:100%;margin-bottom:10px;padding:12px;border-radius:12px;border:0;">
        <input name="source" placeholder="Provenienza: Booking / Airbnb / Diretto" style="width:100%;margin-bottom:10px;padding:12px;border-radius:12px;border:0;">
        <textarea name="notes" placeholder="Note" style="width:100%;margin-bottom:10px;padding:12px;border-radius:12px;border:0;"></textarea>

        <button type="submit" style="width:100%;padding:14px;border:0;border-radius:14px;background:#30d158;color:#000;font-size:16px;font-weight:700;">
          Salva
        </button>
      </form>

      <h3 style="margin-top:28px;">Prenotazioni</h3>
      <section id="bookingList"></section>
    </main>
  `;

  document.getElementById("openForm").onclick = () => {
    const form = document.getElementById("bookingForm");
    form.style.display = form.style.display === "none" ? "block" : "none";
  };

  document.getElementById("bookingForm").onsubmit = saveBooking;
}

async function loadBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("bookingList").innerHTML = `<pre>${JSON.stringify(error, null, 2)}</pre>`;
    return;
  }

  renderDashboard(data);
  renderBookings(data);
}

function renderDashboard(bookings) {
  const black = bookings.filter(b => b.account_type === "Black");
  const white = bookings.filter(b => b.account_type === "White");

  const calc = list => ({
    saldato: list.reduce((sum, b) => {
      if (b.status === "Saldato") return sum + Number(b.amount || 0);
      return sum + Number(b.deposit || 0);
    }, 0),
    complessivo: list.reduce((sum, b) => sum + Number(b.amount || 0), 0)
  });

  const b = calc(black);
  const w = calc(white);

  document.getElementById("dashboard").innerHTML = `
    <div style="background:#1c1c1e;padding:16px;border-radius:18px;">
      <b style="color:#30d158;">BLACK</b><br>
      Incassato: ${euro(b.saldato)}<br>
      Complessivo: ${euro(b.complessivo)}
    </div>
    <div style="background:#1c1c1e;padding:16px;border-radius:18px;">
      <b style="color:#ff3b30;">WHITE</b><br>
      Incassato: ${euro(w.saldato)}<br>
      Complessivo: ${euro(w.complessivo)}
    </div>
    <div style="background:#1c1c1e;padding:16px;border-radius:18px;">
      <b>TOTALE</b><br>
      Incassato: ${euro(b.saldato + w.saldato)}<br>
      Complessivo: ${euro(b.complessivo + w.complessivo)}
    </div>
  `;
}

function renderBookings(bookings) {
  document.getElementById("bookingList").innerHTML = bookings.map(b => `
    <div style="background:#1c1c1e;margin-bottom:10px;padding:14px;border-radius:16px;">
      <b>${b.name}</b><br>
      ${euro(b.amount)} · ${b.account_type} · ${b.status}<br>
      Acconto: ${euro(b.deposit)}<br>
      Appartamento: ${b.apartment || "-"}<br>
      Provenienza: ${b.source || "-"}<br>
      ${b.notes ? `<small>${b.notes}</small><br>` : ""}

<button onclick="deleteBooking('${b.id}')" style="margin-top:12px;padding:10px 14px;border:0;border-radius:12px;background:#ff3b30;color:white;font-weight:700;">
  Elimina
</button>
    </div>
  `).join("");
}

async function saveBooking(event) {
  event.preventDefault();

  const form = event.target;
  const booking = Object.fromEntries(new FormData(form).entries());

  booking.amount = Number(booking.amount);
  booking.deposit = Number(booking.deposit || 0);
  booking.apartment = booking.apartment ? Number(booking.apartment) : null;

  const { error } = await supabase.from("bookings").insert([booking]);

  if (error) {
    alert("Errore salvataggio: " + error.message);
    return;
  }

  form.reset();
  form.style.display = "none";
  await loadBookings();
}

window.deleteBooking = async function(id) {
  const confirmed = confirm("Vuoi eliminare questa prenotazione?");
  if (!confirmed) return;

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Errore eliminazione: " + error.message);
    return;
  }

  await loadBookings();
};
