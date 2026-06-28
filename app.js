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
    targetAmount: 28,
    dashboardAmount: 22,
    totalAmount: 22,
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
  document.documentElement.style.margin = "0";
  document.documentElement.style.padding = "0";
  document.documentElement.style.background = "#050506";
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.background = "#050506";

  document.body.innerHTML = `
    <main style="min-height:100vh;min-height:100dvh;width:100vw;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 18%,rgba(255,255,255,.055),transparent 28%),linear-gradient(180deg,#0b0c0e 0%,#050506 100%);padding:calc(26px + env(safe-area-inset-top)) 20px calc(26px + env(safe-area-inset-bottom));box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;overflow:hidden;">
      <section style="width:100%;max-width:420px;display:flex;flex-direction:column;align-items:center;gap:34px;">
        <div style="display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;">
          <div style="width:112px;height:112px;border-radius:28px;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(255,255,255,.08);box-shadow:0 18px 55px rgba(0,0,0,.55);">
            <img src="assets/logo.png" alt="ShinEscape Logo" style="width:100%;height:100%;object-fit:contain;display:block;">
          </div>
          <div style="font-size:18px;letter-spacing:.34em;color:#ffffff;font-weight:500;text-transform:uppercase;opacity:.92;">ShinEscape</div>
        </div>

        <div style="width:100%;background:rgba(28,28,30,.86);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);padding:30px 22px 22px;border-radius:30px;box-shadow:0 28px 80px rgba(0,0,0,.58);box-sizing:border-box;border:1px solid rgba(255,255,255,.06);">
          <div style="text-align:center;margin-bottom:26px;">
            <div style="font-size:clamp(30px,8vw,42px);font-weight:950;margin-bottom:2px;color:${THEME.colors.textPrimary};line-height:1.02;letter-spacing:-.055em;">ShinEscape</div>
            <div style="margin-top:2px;font-size:clamp(17px,4.5vw,22px);font-weight:800;letter-spacing:.34em;text-transform:uppercase;background:linear-gradient(180deg,#d7b17a,#a66b2c);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:#b88746;">Budoni</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <input id="loginEmail" type="email" autocomplete="username" placeholder="Email" style="width:100%;box-sizing:border-box;padding:16px 16px;font-size:18px;border-radius:18px;border:1px solid rgba(255,255,255,.04);background:rgba(58,58,60,.72);color:${THEME.colors.textPrimary};outline:none;">
            <input id="loginPassword" type="password" autocomplete="current-password" placeholder="Password" style="width:100%;box-sizing:border-box;padding:16px 16px;font-size:18px;border-radius:18px;border:1px solid rgba(255,255,255,.04);background:rgba(58,58,60,.72);color:${THEME.colors.textPrimary};outline:none;">
            <button id="loginButton" style="width:100%;box-sizing:border-box;margin-top:18px;padding:17px;font-size:20px;font-weight:850;border:0;border-radius:20px;background:${THEME.colors.blue};color:${THEME.colors.textPrimary};cursor:pointer;box-shadow:0 16px 34px rgba(10,132,255,.28);">Accedi</button>
          </div>
        </div>
      </section>
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
  const formatted = Number(value || 0).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  });

  return `${formatted} €`;
}

function formatDateIT(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).replaceAll("/", ".");
}

function formatDateTimeIT(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatSyncNote(notes) {
  const text = String(notes || "");
  const match = text.match(/Lodgify sync · (\d{4}-\d{2}-\d{2}) → (\d{4}-\d{2}-\d{2})/);
  if (!match) return text;
  return `Lodgify sync · ${formatDateIT(match[1])} → ${formatDateIT(match[2])}`;
}

function getSyncStats(bookings) {
  const lodgify = bookings.filter(b => b.synced_from === "Lodgify");
  const airbnb = lodgify.filter(b => String(b.source || "").toLowerCase().includes("airbnb"));
  const booking = lodgify.filter(b => String(b.source || "").toLowerCase().includes("booking"));
  const lastSync = lodgify
    .map(b => b.last_synced_at)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    total: lodgify.length,
    airbnb: airbnb.length,
    booking: booking.length,
    lastSync
  };
}

function getInitials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "?";
}

function getSourceBadge(source) {
  const normalized = String(source || "Diretta").trim().toLowerCase();

  if (normalized.includes("airbnb")) {
    return {
      label: "Airbnb",
      icon: "A",
      background: "#ff385c",
      border: "rgba(255,56,92,.35)",
      color: "#ffffff"
    };
  }

  if (normalized.includes("booking")) {
    return {
      label: "Booking",
      icon: "B.",
      background: "#003b95",
      border: "rgba(0,59,149,.45)",
      color: "#ffffff"
    };
  }

  return {
    label: "Diretta",
    icon: "S",
    background: "#121212",
    border: "rgba(215,177,122,.55)",
    color: "#d7b17a"
  };
}

function getStatusBadge(status) {
  if (status === "Saldato") {
    return {
      label: "Saldato",
      background: "rgba(48,209,88,.14)",
      color: THEME.colors.green,
      border: "rgba(48,209,88,.28)"
    };
  }

  return {
    label: "Da saldare",
    background: "rgba(255,159,10,.13)",
    color: "#ffcc66",
    border: "rgba(255,159,10,.28)"
  };
}

function renderApp() {
  document.documentElement.style.margin = "0";
  document.documentElement.style.padding = "0";
  document.documentElement.style.background = THEME.colors.pageBackground;
  document.documentElement.style.minHeight = "100%";
  document.body.style.margin = "0";
  document.body.style.padding = "0";
  document.body.style.background = THEME.colors.pageBackground;
  document.body.style.minHeight = "100%";
  document.body.innerHTML = `
    <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:${THEME.colors.pageBackground};color:${THEME.colors.textPrimary};min-height:100vh;min-height:100dvh;width:100vw;max-width:none;margin:0;padding:${THEME.spacing.page}px;padding-top:calc(${THEME.spacing.page}px + env(safe-area-inset-top));padding-bottom:calc(${THEME.spacing.page}px + env(safe-area-inset-bottom));box-sizing:border-box;overflow-x:hidden;">
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

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
        <button id="openForm" style="width:100%;padding:16px;border:0;border-radius:${THEME.radius.button}px;background:${THEME.colors.blue};color:${THEME.colors.textPrimary};font-size:${THEME.font.button}px;font-weight:700;">
          + Nuova prenotazione
        </button>
        <button id="syncLodgify" style="width:100%;padding:16px;border:1px solid rgba(215,177,122,.38);border-radius:${THEME.radius.button}px;background:linear-gradient(135deg,rgba(215,177,122,.18),rgba(120,70,22,.14));color:#d7b17a;font-size:${THEME.font.button}px;font-weight:800;">
          ↻ Sincronizza Lodgify
        </button>
      </div>

      <section id="syncSummary"></section>

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
  document.getElementById("syncLodgify").onclick = syncLodgify;

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
  renderSyncSummary(data);
  renderBookings(data);
}

function renderSyncSummary(bookings) {
  const stats = getSyncStats(bookings);
  const container = document.getElementById("syncSummary");
  if (!container) return;

  container.innerHTML = `
    <div style="margin-top:14px;background:linear-gradient(135deg,rgba(22,27,34,.94),rgba(12,15,20,.94));border:1px solid rgba(215,177,122,.26);border-radius:${THEME.radius.card}px;padding:14px;box-shadow:0 14px 38px rgba(0,0,0,.22);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div>
          <div style="color:#d7b17a;font-size:${THEME.font.helper}px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;">Lodgify Sync</div>
          <div style="margin-top:4px;color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;">Ultima sync: ${formatDateTimeIT(stats.lastSync)}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="padding:7px 10px;border-radius:999px;background:#003b95;color:#fff;font-size:${THEME.font.helper}px;font-weight:850;">Booking ${stats.booking}</span>
          <span style="padding:7px 10px;border-radius:999px;background:#ff385c;color:#fff;font-size:${THEME.font.helper}px;font-weight:850;">Airbnb ${stats.airbnb}</span>
          <span style="padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.08);color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;">OTA ${stats.total}</span>
        </div>
      </div>
    </div>
  `;
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
  const blackShare = totalComplessivo > 0 ? (b.complessivo / totalComplessivo) * 100 : 0;
  const whiteShare = totalComplessivo > 0 ? (w.complessivo / totalComplessivo) * 100 : 0;

  document.getElementById("dashboard").innerHTML = `
    <div style="grid-column:1 / -1;background:linear-gradient(135deg,#111820,#0b0f14);padding:${THEME.spacing.card}px;border-radius:${THEME.radius.card}px;border:1px solid ${THEME.colors.cardBorder};box-shadow:0 18px 50px rgba(0,0,0,.35);">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;align-items:start;">
        <div>
          <div style="font-size:${THEME.font.helper}px;color:${THEME.colors.blue};font-weight:900;letter-spacing:.04em;">TARGET RESIDUO BLACK</div>
          <div style="margin-top:8px;font-size:clamp(26px,4vw,${THEME.font.targetAmount}px);font-weight:950;line-height:1;">${euro(blackResidual)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Incassato</div>
          <div style="margin-top:8px;font-size:clamp(20px,3vw,${THEME.font.totalAmount}px);font-weight:800;">${euro(b.saldato)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Complessivo</div>
          <div style="margin-top:8px;font-size:clamp(20px,3vw,${THEME.font.totalAmount}px);font-weight:800;">${euro(b.complessivo)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Raggiunto</div>
          <div style="margin-top:8px;color:${THEME.colors.green};font-size:clamp(20px,3vw,${THEME.font.totalAmount}px);font-weight:900;">${blackProgress.toFixed(1).replace('.', ',')}%</div>
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
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:18px;align-items:start;">
        <div>
          <div style="font-size:${THEME.font.helper}px;color:${THEME.colors.whiteLabel};font-weight:900;letter-spacing:.04em;">TARGET RESIDUO WHITE</div>
          <div style="margin-top:8px;font-size:clamp(26px,4vw,${THEME.font.targetAmount}px);font-weight:950;line-height:1;">${euro(whiteResidual)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Incassato</div>
          <div style="margin-top:8px;font-size:clamp(20px,3vw,${THEME.font.totalAmount}px);font-weight:800;">${euro(w.saldato)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Complessivo</div>
          <div style="margin-top:8px;font-size:clamp(20px,3vw,${THEME.font.totalAmount}px);font-weight:800;">${euro(w.complessivo)}</div>
        </div>
        <div>
          <div style="color:#c7c7cc;font-size:${THEME.font.helper}px;">Raggiunto</div>
          <div style="margin-top:8px;color:${THEME.colors.green};font-size:clamp(20px,3vw,${THEME.font.totalAmount}px);font-weight:900;">${whiteProgress.toFixed(1).replace('.', ',')}%</div>
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
      <div style="margin-top:8px;font-size:clamp(26px,4vw,${THEME.font.targetAmount}px);font-weight:950;">${euro(b.saldato)}</div>
      <div style="height:1px;background:#344150;margin:24px 0;"></div>
      <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Complessivo</div>
      <div style="margin-top:8px;font-size:${THEME.font.dashboardAmount}px;font-weight:850;">${euro(b.complessivo)}</div>
    </div>

    <div style="background:linear-gradient(145deg,#151b1e,#101214);padding:22px;border-radius:${THEME.radius.card}px;border:1px solid ${THEME.colors.cardBorder};box-shadow:0 18px 50px rgba(0,0,0,.35);">
      <div style="font-size:${THEME.font.summaryTitle}px;color:${THEME.colors.whiteLabel};font-weight:950;letter-spacing:.04em;">WHITE</div>
      <div style="margin-top:22px;color:#c7c7cc;font-size:${THEME.font.formText}px;">Incassato</div>
      <div style="margin-top:8px;font-size:clamp(26px,4vw,${THEME.font.targetAmount}px);font-weight:950;">${euro(w.saldato)}</div>
      <div style="height:1px;background:#344150;margin:24px 0;"></div>
      <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Complessivo</div>
      <div style="margin-top:8px;font-size:${THEME.font.dashboardAmount}px;font-weight:850;">${euro(w.complessivo)}</div>
    </div>

    <div style="grid-column:1 / -1;background:linear-gradient(145deg,#101820,#090d12);padding:22px;border-radius:${THEME.radius.card}px;border:1px solid #0a84ff;box-shadow:0 18px 50px rgba(10,132,255,.16);">
      <div style="display:grid;grid-template-columns:minmax(0,1.8fr) minmax(260px,.8fr);gap:18px;align-items:flex-start;">
        <div style="min-width:0;width:100%;">
          <div style="font-size:${THEME.font.summaryTitle}px;color:${THEME.colors.blue};font-weight:950;letter-spacing:.04em;">TOTALE</div>
          <div style="margin-top:22px;color:#c7c7cc;font-size:${THEME.font.formText}px;">Actual Black + White</div>
          <div style="margin-top:8px;font-size:clamp(26px,4vw,${THEME.font.targetAmount}px);font-weight:950;">${euro(totalComplessivo)}</div>
          <div style="margin-top:18px;">
            <div style="display:flex;justify-content:space-between;gap:18px;align-items:flex-end;margin-bottom:8px;">
              <div style="text-align:center;flex:1;">
                <div style="color:${THEME.colors.green};font-size:clamp(20px,3vw,${THEME.font.totalAmount}px);font-weight:950;">${blackShare.toFixed(1).replace('.', ',')}%</div>
                <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${THEME.colors.green};margin:4px auto 0;"></div>
              </div>
              <div style="text-align:center;flex:1;">
                <div style="color:${THEME.colors.red};font-size:clamp(20px,3vw,${THEME.font.totalAmount}px);font-weight:950;">${whiteShare.toFixed(1).replace('.', ',')}%</div>
                <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${THEME.colors.red};margin:4px auto 0;"></div>
              </div>
            </div>
            <div style="display:flex;width:100%;max-width:none;height:14px;background:${THEME.colors.cardSecondary};border-radius:999px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04);">
              <div style="width:${blackShare}%;background:linear-gradient(90deg,#24b84f,${THEME.colors.green});"></div>
              <div style="width:${whiteShare}%;background:linear-gradient(90deg,${THEME.colors.red},#ff6b63);"></div>
            </div>
            <div style="display:flex;justify-content:center;gap:28px;flex-wrap:wrap;margin-top:12px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;">
              <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${THEME.colors.green};margin-right:7px;"></span>Black sul totale</span>
              <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${THEME.colors.red};margin-right:7px;"></span>White sul totale</span>
            </div>
          </div>
        </div>
        <div style="border-left:1px solid #344150;padding-left:22px;">
          <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Totale incassato</div>
          <div style="margin-top:8px;color:${THEME.colors.green};font-size:clamp(26px,4vw,${THEME.font.targetAmount}px);font-weight:950;">${euro(b.saldato + w.saldato)}</div>
        </div>
      </div>

      <div style="height:1px;background:#344150;margin:24px 0;"></div>

      <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Cifra da raggiungere</div>
      <div style="margin-top:8px;color:${THEME.colors.blue};font-size:clamp(26px,4vw,${THEME.font.targetAmount}px);font-weight:950;">${euro(TARGET_TOTAL)}</div>
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
  document.getElementById("bookingList").innerHTML = bookings.map(b => {
    const sourceBadge = getSourceBadge(b.source);
    const statusBadge = getStatusBadge(b.status);
    const isPaid = b.status === "Saldato";
    const isSumWhite = b.name === "SumWhite";
    const initials = getInitials(b.name);
    const cardBorder = isSumWhite ? "#ffffff" : (isPaid ? THEME.colors.green : "rgba(255,255,255,.06)");
    const cardBackground = isPaid
      ? "linear-gradient(135deg,rgba(20,61,34,.96),rgba(10,18,13,.96))"
      : "linear-gradient(135deg,rgba(22,27,34,.96),rgba(12,15,20,.96))";

    return `
      <div onclick='editBooking(${JSON.stringify(b)})' style="background:${cardBackground};margin-bottom:12px;padding:14px;border-radius:20px;cursor:pointer;border:1px solid ${cardBorder};box-shadow:0 14px 38px rgba(0,0,0,.28);box-sizing:border-box;">
        <div style="display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;">
          <div style="width:46px;height:46px;border-radius:999px;background:radial-gradient(circle at 35% 25%,#d7b17a,#6b3f13);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:15px;font-weight:900;border:1px solid rgba(215,177,122,.45);box-shadow:0 8px 22px rgba(215,177,122,.14);">
            ${initials}
          </div>

          <div style="min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;">
              <div style="font-size:${THEME.font.bookingName}px;font-weight:900;color:${THEME.colors.textPrimary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${b.name}${isPaid ? " ✅" : ""}
              </div>
            </div>
            <div style="margin-top:4px;color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              App. ${b.apartment || "-"} · ${b.account_type}
            </div>
          </div>

          <div style="text-align:right;white-space:nowrap;">
            <div style="font-size:${THEME.font.bookingAmount}px;font-weight:950;color:${THEME.colors.textPrimary};">
              ${euro(b.amount)}
            </div>
            <div style="margin-top:5px;font-size:${THEME.font.helper}px;color:${THEME.colors.textSecondary};">
              Acconto ${euro(b.deposit)}
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="display:inline-flex;align-items:center;gap:7px;padding:7px 10px;border-radius:999px;background:${sourceBadge.background};border:1px solid ${sourceBadge.border};color:${sourceBadge.color};font-size:${THEME.font.helper}px;font-weight:850;">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:999px;background:rgba(255,255,255,.12);font-size:11px;font-weight:950;">${sourceBadge.icon}</span>
              ${sourceBadge.label}
            </span>

            <span style="display:inline-flex;align-items:center;padding:7px 10px;border-radius:999px;background:${statusBadge.background};border:1px solid ${statusBadge.border};color:${statusBadge.color};font-size:${THEME.font.helper}px;font-weight:850;">
              ${statusBadge.label}
            </span>
          </div>

          <button onclick="event.stopPropagation(); deleteBooking('${b.id}')" style="padding:8px 12px;border:1px solid rgba(255,59,48,.35);border-radius:999px;background:rgba(255,59,48,.10);color:${THEME.colors.red};font-weight:850;font-size:${THEME.font.helper}px;">
            Elimina
          </button>
        </div>

        ${b.notes ? `<div style="margin-top:12px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.045);color:#c7c7cc;font-size:${THEME.font.helper}px;line-height:1.35;">${formatSyncNote(b.notes)}</div>` : ""}
async function syncLodgify() {
  const button = document.getElementById("syncLodgify");
  if (!button) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "Sincronizzazione...";
  button.style.opacity = ".72";

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/bright-api`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken || SUPABASE_KEY}`
      },
      body: JSON.stringify({ source: "ShinEscape Manager" })
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      alert(`Errore sync Lodgify: ${result.error || result.step || "errore sconosciuto"}`);
      console.log(result);
      return;
    }

    alert(`Sync completata: ${result.filteredAirbnbBooking || result.imported_or_updated || 0} prenotazioni OTA elaborate.`);
    await loadBookings();
  } catch (error) {
    alert(`Errore sync Lodgify: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    button.style.opacity = "1";
  }
}

      </div>
    `;
  }).join("");
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
