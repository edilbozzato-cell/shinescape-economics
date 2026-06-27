import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://prpvhnwedpnnwpdvrttz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHZobndlZHBubndwZHZydHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjAwMjcsImV4cCI6MjA5Nzk5NjAyN30.jnrGO7j0ptDfnKScitE3vU79SM6tvMevtfM6_Tv7iBE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TARGET_BLACK = 40432;
const TARGET_WHITE = 28000;

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
    form.reset();
    delete form.dataset.editId;
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

  const blackResidual = Math.max(TARGET_BLACK - b.complessivo, 0);
  const whiteResidual = Math.max(TARGET_WHITE - w.complessivo, 0);
  const blackProgress = Math.min((b.complessivo / TARGET_BLACK) * 100, 100);
  const whiteProgress = Math.min((w.complessivo / TARGET_WHITE) * 100, 100);

  document.getElementById("dashboard").innerHTML = `
    <div style="grid-column:1 / -1;background:#1c1c1e;padding:16px;border-radius:22px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:12px;color:#8e8e93;font-weight:900;letter-spacing:.08em;">TARGET RESIDUO BLACK 💰</div>
      <div style="margin-top:8px;font-size:30px;font-weight:950;line-height:1;">${euro(blackResidual)} 🔥</div>
      <div style="margin-top:12px;height:10px;background:#2c2c2e;border-radius:999px;overflow:hidden;">
        <div style="height:100%;width:${blackProgress}%;background:#30d158;border-radius:999px;"></div>
      </div>
      <div style="margin-top:8px;color:#8e8e93;font-size:13px;">Raggiunto: ${euro(b.complessivo)} su ${euro(TARGET_BLACK)}</div>
    </div>

    <div style="grid-column:1 / -1;background:#1c1c1e;padding:16px;border-radius:22px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:12px;color:#8e8e93;font-weight:900;letter-spacing:.08em;">TARGET RESIDUO WHITE</div>
      <div style="margin-top:8px;font-size:30px;font-weight:950;line-height:1;">${euro(whiteResidual)} 👎🏼</div>
      <div style="margin-top:12px;height:10px;background:#2c2c2e;border-radius:999px;overflow:hidden;">
        <div style="height:100%;width:${whiteProgress}%;background:#ffffff;border-radius:999px;"></div>
      </div>
      <div style="margin-top:8px;color:#8e8e93;font-size:13px;">Raggiunto: ${euro(w.complessivo)} su ${euro(TARGET_WHITE)}</div>
    </div>

    <div style="background:#1c1c1e;padding:16px;border-radius:22px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:12px;color:#30d158;font-weight:900;letter-spacing:.08em;">BLACK</div>
      <div style="margin-top:10px;color:#8e8e93;font-size:13px;">Incassato</div>
      <div style="font-size:24px;font-weight:900;line-height:1.15;">${euro(b.saldato)}</div>
      <div style="margin-top:10px;color:#8e8e93;font-size:13px;">Complessivo</div>
      <div style="font-size:17px;font-weight:700;">${euro(b.complessivo)}</div>
    </div>
    <div style="background:#1c1c1e;padding:16px;border-radius:22px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:12px;color:#ffffff;font-weight:900;letter-spacing:.08em;">WHITE</div>
      <div style="margin-top:10px;color:#8e8e93;font-size:13px;">Incassato</div>
      <div style="font-size:24px;font-weight:900;line-height:1.15;">${euro(w.saldato)}</div>
      <div style="margin-top:10px;color:#8e8e93;font-size:13px;">Complessivo</div>
      <div style="font-size:17px;font-weight:700;">${euro(w.complessivo)}</div>
    </div>
    <div style="grid-column:1 / -1;background:#1c1c1e;padding:16px;border-radius:22px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:12px;color:#8e8e93;font-weight:900;letter-spacing:.08em;">TOTALE</div>
      <div style="display:flex;justify-content:space-between;gap:18px;margin-top:12px;">
        <div>
          <div style="color:#8e8e93;font-size:13px;">Incassato</div>
          <div style="font-size:25px;font-weight:900;">${euro(b.saldato + w.saldato)}</div>
        </div>
        <div style="text-align:right;">
          <div style="color:#8e8e93;font-size:13px;">Complessivo</div>
          <div style="font-size:25px;font-weight:900;">${euro(b.complessivo + w.complessivo)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderBookings(bookings) {
  document.getElementById("bookingList").innerHTML = bookings.map(b => `
    <div onclick='editBooking(${JSON.stringify(b)})' style="background:#1c1c1e;margin-bottom:10px;padding:14px;border-radius:16px;cursor:pointer;">
      <b>${b.name}</b><br>
      ${euro(b.amount)} · ${b.account_type} · ${b.status}<br>
      Acconto: ${euro(b.deposit)}<br>
      Appartamento: ${b.apartment || "-"}<br>
      Provenienza: ${b.source || "-"}<br>
      ${b.notes ? `<small>${b.notes}</small><br>` : ""}

<button onclick="event.stopPropagation(); deleteBooking('${b.id}')" style="margin-top:12px;padding:10px 14px;border:0;border-radius:12px;background:#ff3b30;color:white;font-weight:700;">
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

  let error;

  if (form.dataset.editId) {
    const response = await supabase
      .from("bookings")
      .update(booking)
      .eq("id", form.dataset.editId);

    error = response.error;
  } else {
    const response = await supabase
      .from("bookings")
      .insert([booking]);

    error = response.error;
  }

  if (error) {
    alert("Errore salvataggio: " + error.message);
    return;
  }

  form.reset();
  delete form.dataset.editId;
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

window.editBooking = function(b) {
  const form = document.getElementById("bookingForm");

  form.dataset.editId = b.id;

  form.name.value = b.name || "";
  form.amount.value = b.amount || "";
  form.account_type.value = b.account_type || "Black";
  form.status.value = b.status || "Da saldare";
  form.deposit.value = b.deposit || 0;
  form.apartment.value = b.apartment || "";
  form.source.value = b.source || "";
  form.notes.value = b.notes || "";

  form.style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
};
