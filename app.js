import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://prpvhnwedpnnwpdvrttz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHZobndlZHBubndwZHZydHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjAwMjcsImV4cCI6MjA5Nzk5NjAyN30.jnrGO7j0ptDfnKScitE3vU79SM6tvMevtfM6_Tv7iBE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TARGET_BLACK = 40000;
const TARGET_WHITE = 28000;

const THEME = {
  colors: {
    pageBackground: "#111",
    cardBackground: "#1c1c1e",
    cardSecondary: "#2c2c2e",
    textPrimary: "#ffffff",
    textSecondary: "#8e8e93",
    green: "#30d158",
    blue: "#0a84ff",
    red: "#ff3b30",
    blackLabel: "#30d158",
    whiteLabel: "#ffffff"
  },
  font: {
    pageTitle: 32,
    pageSubtitle: 18,
    sectionTitle: 22,
    label: 12,
    helper: 13,
    normal: 14,
    formText: 16,
    button: 17,
    targetAmount: 30,
    dashboardAmount: 24,
    totalAmount: 25,
    bookingName: 18,
    bookingAmount: 20
  },
  radius: {
    input: 12,
    button: 14,
    card: 22,
    form: 20
  },
  spacing: {
    page: 20,
    card: 16,
    form: 18
  }
};

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
    <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:${THEME.colors.pageBackground};color:${THEME.colors.textPrimary};min-height:100vh;padding:${THEME.spacing.page}px;">
      <h1>ShinEscape Manager</h1>
      <h2>Economics</h2>

      <section id="dashboard" style="display:grid;gap:12px;margin:20px 0;"></section>

      <button id="openForm" style="width:100%;padding:16px;border:0;border-radius:${THEME.radius.button}px;background:${THEME.colors.blue};color:${THEME.colors.textPrimary};font-size:${THEME.font.button}px;font-weight:700;">
        + Nuova prenotazione
      </button>

      <form id="bookingForm" style="display:none;margin-top:20px;background:${THEME.colors.cardBackground};padding:${THEME.spacing.form}px;border-radius:${THEME.radius.form}px;">
        <input name="name" placeholder="Nome" required style="width:100%;margin-bottom:10px;padding:12px;border-radius:${THEME.radius.input}px;border:0;font-size:${THEME.font.formText}px;">
        <input name="amount" type="number" placeholder="Importo" required style="width:100%;margin-bottom:10px;padding:12px;border-radius:${THEME.radius.input}px;border:0;font-size:${THEME.font.formText}px;">
        <select name="account_type" style="width:100%;margin-bottom:10px;padding:12px;border-radius:${THEME.radius.input}px;font-size:${THEME.font.formText}px;">
          <option>Black</option>
          <option>White</option>
        </select>
        <select name="status" style="width:100%;margin-bottom:10px;padding:12px;border-radius:${THEME.radius.input}px;font-size:${THEME.font.formText}px;">
          <option>Da saldare</option>
          <option>Saldato</option>
        </select>
        <input name="deposit" type="number" placeholder="Acconto" value="0" style="width:100%;margin-bottom:10px;padding:12px;border-radius:${THEME.radius.input}px;border:0;font-size:${THEME.font.formText}px;">
        <input name="apartment" type="number" placeholder="Appartamento" style="width:100%;margin-bottom:10px;padding:12px;border-radius:${THEME.radius.input}px;border:0;font-size:${THEME.font.formText}px;">
        <input name="source" placeholder="Provenienza: Booking / Airbnb / Diretto" style="width:100%;margin-bottom:10px;padding:12px;border-radius:${THEME.radius.input}px;border:0;font-size:${THEME.font.formText}px;">
        <textarea name="notes" placeholder="Note" style="width:100%;margin-bottom:10px;padding:12px;border-radius:${THEME.radius.input}px;border:0;font-size:${THEME.font.formText}px;"></textarea>

        <button type="submit" style="width:100%;padding:14px;border:0;border-radius:${THEME.radius.button}px;background:${THEME.colors.green};color:#000;font-size:${THEME.font.formText}px;font-weight:700;">
          Salva
        </button>
      </form>

      <h3 style="margin-top:28px;font-size:${THEME.font.sectionTitle}px;">Prenotazioni</h3>
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
    <div style="grid-column:1 / -1;background:${THEME.colors.cardBackground};padding:${THEME.spacing.card}px;border-radius:${THEME.radius.card}px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:${THEME.font.label}px;color:${THEME.colors.textSecondary};font-weight:900;letter-spacing:.08em;">TARGET RESIDUO BLACK 💰</div>
      <div style="margin-top:8px;font-size:${THEME.font.targetAmount}px;font-weight:950;line-height:1;">${euro(blackResidual)} 🔥</div>
      <div style="margin-top:12px;height:10px;background:${THEME.colors.cardSecondary};border-radius:999px;overflow:hidden;">
        <div style="height:100%;width:${blackProgress}%;background:${THEME.colors.green};border-radius:999px;"></div>
      </div>
      <div style="margin-top:8px;color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;">Raggiunto: ${euro(b.complessivo)} su ${euro(TARGET_BLACK)}</div>
    </div>

    <div style="grid-column:1 / -1;background:${THEME.colors.cardBackground};padding:${THEME.spacing.card}px;border-radius:${THEME.radius.card}px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:${THEME.font.label}px;color:${THEME.colors.textSecondary};font-weight:900;letter-spacing:.08em;">TARGET RESIDUO WHITE</div>
      <div style="margin-top:8px;font-size:${THEME.font.targetAmount}px;font-weight:950;line-height:1;">${euro(whiteResidual)} 👎🏼</div>
      <div style="margin-top:12px;height:10px;background:${THEME.colors.cardSecondary};border-radius:999px;overflow:hidden;">
        <div style="height:100%;width:${whiteProgress}%;background:${THEME.colors.whiteLabel};border-radius:999px;"></div>
      </div>
      <div style="margin-top:8px;color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;">Raggiunto: ${euro(w.complessivo)} su ${euro(TARGET_WHITE)}</div>
    </div>

    <div style="background:${THEME.colors.cardBackground};padding:${THEME.spacing.card}px;border-radius:${THEME.radius.card}px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:${THEME.font.label}px;color:${THEME.colors.blackLabel};font-weight:900;letter-spacing:.08em;">BLACK</div>
      <div style="margin-top:10px;color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;">Incassato</div>
      <div style="font-size:${THEME.font.dashboardAmount}px;font-weight:900;line-height:1.15;">${euro(b.saldato)}</div>
      <div style="margin-top:10px;color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;">Complessivo</div>
      <div style="font-size:17px;font-weight:700;">${euro(b.complessivo)}</div>
    </div>
    <div style="background:${THEME.colors.cardBackground};padding:${THEME.spacing.card}px;border-radius:${THEME.radius.card}px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:${THEME.font.label}px;color:${THEME.colors.whiteLabel};font-weight:900;letter-spacing:.08em;">WHITE</div>
      <div style="margin-top:10px;color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;">Incassato</div>
      <div style="font-size:${THEME.font.dashboardAmount}px;font-weight:900;line-height:1.15;">${euro(w.saldato)}</div>
      <div style="margin-top:10px;color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;">Complessivo</div>
      <div style="font-size:17px;font-weight:700;">${euro(w.complessivo)}</div>
    </div>
    <div style="grid-column:1 / -1;background:${THEME.colors.cardBackground};padding:${THEME.spacing.card}px;border-radius:${THEME.radius.card}px;box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <div style="font-size:${THEME.font.label}px;color:${THEME.colors.textSecondary};font-weight:900;letter-spacing:.08em;">TOTALE</div>
      <div style="display:flex;justify-content:space-between;gap:18px;margin-top:12px;">
        <div>
          <div style="color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;">Incassato</div>
          <div style="font-size:${THEME.font.totalAmount}px;font-weight:900;">${euro(b.saldato + w.saldato)}</div>
        </div>
        <div style="text-align:right;">
          <div style="color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;">Complessivo</div>
          <div style="font-size:${THEME.font.totalAmount}px;font-weight:900;">${euro(b.complessivo + w.complessivo)}</div>
        </div>
      </div>
    </div>
  `;
}

function renderBookings(bookings) {
  document.getElementById("bookingList").innerHTML = bookings.map(b => `
    <div onclick='editBooking(${JSON.stringify(b)})' style="background:${THEME.colors.cardBackground};margin-bottom:10px;padding:14px;border-radius:${THEME.radius.button}px;cursor:pointer;">
      <b>${b.name}</b><br>
      ${euro(b.amount)} · ${b.account_type} · ${b.status}<br>
      Acconto: ${euro(b.deposit)}<br>
      Appartamento: ${b.apartment || "-"}<br>
      Provenienza: ${b.source || "-"}<br>
      ${b.notes ? `<small>${b.notes}</small><br>` : ""}

<button onclick="event.stopPropagation(); deleteBooking('${b.id}')" style="margin-top:12px;padding:10px 14px;border:0;border-radius:${THEME.radius.input}px;background:${THEME.colors.red};color:${THEME.colors.textPrimary};font-weight:700;">
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
