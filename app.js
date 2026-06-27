import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://prpvhnwedpnnwpdvrttz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHZobndlZHBubndwZHZydHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjAwMjcsImV4cCI6MjA5Nzk5NjAyN30.jnrGO7j0ptDfnKScitE3vU79SM6tvMevtfM6_Tv7iBE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TARGET_BLACK = 40000;
const TARGET_WHITE = 28000;
const TARGET_TOTAL = 70000;

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
    blackLabel: "#2f8cff",
    whiteLabel: "#ffffff",
    cardBorder: "#2b3542"
  },
  font: {
    pageTitle: 32,
    pageSubtitle: 18,
    sectionTitle: 22,
    label: 12,
    summaryTitle: 24,
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

// --- Auth helpers ---
async function checkAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

function renderLogin() {
  document.body.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:${THEME.colors.pageBackground};">
      <div style="background:${THEME.colors.cardBackground};padding:38px 32px 32px 32px;border-radius:${THEME.radius.card}px;box-shadow:0 8px 40px rgba(0,0,0,.3);min-width:340px;max-width:96vw;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="font-size:${THEME.font.pageTitle}px;font-weight:900;margin-bottom:2px;color:${THEME.colors.textPrimary};">ShinEscape Manager</div>
          <div style="font-size:${THEME.font.pageSubtitle}px;color:${THEME.colors.textSecondary};font-weight:700;">Login</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:13px;">
          <input id="loginEmail" type="email" autocomplete="username" placeholder="Email" style="padding:13px;font-size:${THEME.font.formText}px;border-radius:${THEME.radius.input}px;border:1px solid ${THEME.colors.cardSecondary};background:${THEME.colors.cardSecondary};color:${THEME.colors.textPrimary};outline:none;">
          <input id="loginPassword" type="password" autocomplete="current-password" placeholder="Password" style="padding:13px;font-size:${THEME.font.formText}px;border-radius:${THEME.radius.input}px;border:1px solid ${THEME.colors.cardSecondary};background:${THEME.colors.cardSecondary};color:${THEME.colors.textPrimary};outline:none;">
          <button id="loginButton" style="margin-top:10px;padding:13px;font-size:${THEME.font.button}px;font-weight:700;border:0;border-radius:${THEME.radius.button}px;background:${THEME.colors.blue};color:${THEME.colors.textPrimary};cursor:pointer;">Accedi</button>
        </div>
      </div>
    </main>
  `;
  document.getElementById("loginButton").onclick = async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    if (!email || !password) {
      alert("Inserisci email e password");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      return;
    }
    renderApp();
    await loadBookings();
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = await checkAuth();
  if (!session) {
    renderLogin();
    return;
  }
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
      <header style="display:flex;align-items:center;gap:18px;margin-bottom:22px;padding:18px;border-radius:${THEME.radius.card}px;background:linear-gradient(135deg,#0b1118,#111820);border:1px solid ${THEME.colors.cardBorder};box-shadow:0 18px 50px rgba(0,0,0,.35);position:relative;">
        <div style="width:88px;height:88px;border-radius:22px;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1px solid rgba(255,255,255,.08);">
          <img src="assets/logo.png" alt="ShinEscape Logo" style="width:100%;height:100%;object-fit:contain;display:block;">
        </div>
        <div style="min-width:0;">
          <div style="font-size:${THEME.font.helper}px;color:${THEME.colors.blue};font-weight:900;letter-spacing:.14em;text-transform:uppercase;">ShinEscape</div>
          <h1 style="margin:4px 0 0;font-size:${THEME.font.pageTitle}px;line-height:1.05;font-weight:950;letter-spacing:-.04em;">Manager</h1>
          <div style="margin-top:8px;display:inline-flex;align-items:center;gap:8px;padding:7px 11px;border-radius:999px;background:rgba(10,132,255,.12);border:1px solid rgba(10,132,255,.35);color:#c7dfff;font-size:${THEME.font.helper}px;font-weight:800;">
            <span style="width:8px;height:8px;border-radius:999px;background:${THEME.colors.green};box-shadow:0 0 14px ${THEME.colors.green};"></span>
            Economics Dashboard
          </div>
        </div>
        <button id="logoutButton" style="position:absolute;right:18px;top:18px;padding:7px 14px;font-size:13px;font-weight:700;border:0;border-radius:999px;background:${THEME.colors.cardSecondary};color:${THEME.colors.textSecondary};cursor:pointer;transition:background .15s;">
          Logout
        </button>
      </header>

      <section id="dashboard" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:20px 0;"></section>

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

  // Logout handler
  document.getElementById("logoutButton").onclick = async () => {
    await supabase.auth.signOut();
    renderLogin();
  };
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

  const totalComplessivo = b.complessivo + w.complessivo;
  const totalResidual = Math.max(TARGET_TOTAL - totalComplessivo, 0);
  const totalProgress = Math.min((totalComplessivo / TARGET_TOTAL) * 100, 100);

  document.getElementById("dashboard").innerHTML = `
    <div style="grid-column:1 / -1;background:linear-gradient(135deg,#111820,#0b0f14);padding:${THEME.spacing.card}px;border-radius:${THEME.radius.card}px;border:1px solid ${THEME.colors.cardBorder};box-shadow:0 18px 50px rgba(0,0,0,.35);">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;align-items:center;">
        <div>
          <div style="font-size:${THEME.font.helper}px;color:${THEME.colors.blue};font-weight:900;letter-spacing:.04em;">TARGET RESIDUO BLACK</div>
          <div style="margin-top:8px;font-size:${THEME.font.targetAmount}px;font-weight:950;line-height:1;">${euro(blackResidual)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Incassato</div>
          <div style="margin-top:8px;font-size:${THEME.font.totalAmount}px;font-weight:800;">${euro(b.saldato)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Complessivo</div>
          <div style="margin-top:8px;font-size:${THEME.font.totalAmount}px;font-weight:800;">${euro(b.complessivo)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Raggiunto</div>
          <div style="margin-top:8px;color:${THEME.colors.green};font-size:${THEME.font.totalAmount}px;font-weight:900;">${blackProgress.toFixed(1).replace('.', ',')}%</div>
        </div>
        <div>
          <div style="font-size:${THEME.font.helper}px;color:${THEME.colors.blue};font-weight:800;">${euro(b.complessivo)} / ${euro(TARGET_BLACK)}</div>
          <div style="margin-top:12px;height:10px;background:${THEME.colors.cardSecondary};border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${blackProgress}%;background:linear-gradient(90deg,#0a84ff,#2f8cff);border-radius:999px;"></div>
          </div>
        </div>
      </div>
    </div>

    <div style="grid-column:1 / -1;background:linear-gradient(135deg,#15191b,#0b0f12);padding:${THEME.spacing.card}px;border-radius:${THEME.radius.card}px;border:1px solid ${THEME.colors.cardBorder};box-shadow:0 18px 50px rgba(0,0,0,.35);">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:14px;align-items:center;">
        <div>
          <div style="font-size:${THEME.font.helper}px;color:${THEME.colors.whiteLabel};font-weight:900;letter-spacing:.04em;">TARGET RESIDUO WHITE</div>
          <div style="margin-top:8px;font-size:${THEME.font.targetAmount}px;font-weight:950;line-height:1;">${euro(whiteResidual)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Incassato</div>
          <div style="margin-top:8px;font-size:${THEME.font.totalAmount}px;font-weight:800;">${euro(w.saldato)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Complessivo</div>
          <div style="margin-top:8px;font-size:${THEME.font.totalAmount}px;font-weight:800;">${euro(w.complessivo)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Raggiunto</div>
          <div style="margin-top:8px;color:${THEME.colors.green};font-size:${THEME.font.totalAmount}px;font-weight:900;">${whiteProgress.toFixed(1).replace('.', ',')}%</div>
        </div>
        <div>
          <div style="font-size:${THEME.font.helper}px;color:${THEME.colors.whiteLabel};font-weight:800;">${euro(w.complessivo)} / ${euro(TARGET_WHITE)}</div>
          <div style="margin-top:12px;height:10px;background:${THEME.colors.cardSecondary};border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${whiteProgress}%;background:linear-gradient(90deg,#ffffff,#d9d9d9);border-radius:999px;"></div>
          </div>
        </div>
      </div>
    </div>

    <div style="background:linear-gradient(145deg,#101b2b,#0b1018);padding:22px;border-radius:${THEME.radius.card}px;border:1px solid #0a84ff;box-shadow:0 18px 50px rgba(10,132,255,.14);">
      <div style="font-size:${THEME.font.summaryTitle}px;color:${THEME.colors.blue};font-weight:950;letter-spacing:.04em;">BLACK</div>
      <div style="margin-top:22px;color:#c7c7cc;font-size:${THEME.font.formText}px;">Incassato</div>
      <div style="margin-top:8px;font-size:${THEME.font.targetAmount}px;font-weight:950;">${euro(b.saldato)}</div>
      <div style="height:1px;background:#344150;margin:24px 0;"></div>
      <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Complessivo</div>
      <div style="margin-top:8px;font-size:${THEME.font.dashboardAmount}px;font-weight:850;">${euro(b.complessivo)}</div>
    </div>

    <div style="background:linear-gradient(145deg,#151b1e,#101214);padding:22px;border-radius:${THEME.radius.card}px;border:1px solid ${THEME.colors.cardBorder};box-shadow:0 18px 50px rgba(0,0,0,.35);">
      <div style="font-size:${THEME.font.summaryTitle}px;color:${THEME.colors.whiteLabel};font-weight:950;letter-spacing:.04em;">WHITE</div>
      <div style="margin-top:22px;color:#c7c7cc;font-size:${THEME.font.formText}px;">Incassato</div>
      <div style="margin-top:8px;font-size:${THEME.font.targetAmount}px;font-weight:950;">${euro(w.saldato)}</div>
      <div style="height:1px;background:#344150;margin:24px 0;"></div>
      <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Complessivo</div>
      <div style="margin-top:8px;font-size:${THEME.font.dashboardAmount}px;font-weight:850;">${euro(w.complessivo)}</div>
    </div>

    <div style="grid-column:1 / -1;background:linear-gradient(145deg,#101820,#090d12);padding:22px;border-radius:${THEME.radius.card}px;border:1px solid #0a84ff;box-shadow:0 18px 50px rgba(10,132,255,.16);">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:18px;align-items:flex-start;">
        <div style="min-width:0;">
          <div style="font-size:${THEME.font.summaryTitle}px;color:${THEME.colors.blue};font-weight:950;letter-spacing:.04em;">TOTALE</div>
          <div style="margin-top:22px;color:#c7c7cc;font-size:${THEME.font.formText}px;">Cifra attuale (Black + White)</div>
          <div style="margin-top:8px;font-size:${THEME.font.targetAmount}px;font-weight:950;">${euro(totalComplessivo)}</div>
        </div>
        <div style="border-left:1px solid #344150;padding-left:22px;">
          <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Totale incassato</div>
          <div style="margin-top:8px;color:${THEME.colors.green};font-size:${THEME.font.targetAmount}px;font-weight:950;">${euro(b.saldato + w.saldato)}</div>
        </div>
      </div>

      <div style="height:1px;background:#344150;margin:24px 0;"></div>

      <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Cifra da raggiungere</div>
      <div style="margin-top:8px;color:${THEME.colors.blue};font-size:${THEME.font.targetAmount}px;font-weight:950;">${euro(TARGET_TOTAL)}</div>
      <div style="margin-top:14px;height:12px;background:${THEME.colors.cardSecondary};border-radius:999px;overflow:hidden;">
        <div style="height:100%;width:${totalProgress}%;background:linear-gradient(90deg,#0a84ff,#2f8cff);border-radius:999px;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:10px;color:#c7c7cc;font-size:${THEME.font.helper}px;">
        <span><b style="color:${THEME.colors.blue};">${euro(totalComplessivo)}</b> / ${euro(TARGET_TOTAL)}</span>
        <span style="color:${THEME.colors.blue};font-weight:900;">${totalProgress.toFixed(1).replace('.', ',')}%</span>
      </div>
      <div style="margin-top:10px;color:#c7c7cc;font-size:${THEME.font.helper}px;">Residuo: <b style="color:${THEME.colors.textPrimary};">${euro(totalResidual)}</b></div>
    </div>
  `;
}

function renderBookings(bookings) {
  document.getElementById("bookingList").innerHTML = bookings.map(b => `
    <div onclick='editBooking(${JSON.stringify(b)})' style="background:${b.status === 'Saldato' ? '#143d22' : THEME.colors.cardBackground};margin-bottom:10px;padding:14px;border-radius:${THEME.radius.button}px;cursor:pointer;border:${b.status === 'Saldato' ? '1px solid #30d158' : '1px solid transparent'};">
      <b>${b.name}${b.status === 'Saldato' ? ' ✅' : ''}</b><br>
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
