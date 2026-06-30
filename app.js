import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://prpvhnwedpnnwpdvrttz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHZobndlZHBubndwZHZydHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjAwMjcsImV4cCI6MjA5Nzk5NjAyN30.jnrGO7j0ptDfnKScitE3vU79SM6tvMevtfM6_Tv7iBE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const TARGET_BLACK = 40000;
const TARGET_WHITE = 28000;
const TARGET_TOTAL = 70000;
let bookingSearchQuery = "";

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

function formatDateShortIT(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).replace(".", "");
}

function getNights(arrival, departure) {
  if (!arrival || !departure) return null;
  const start = new Date(`${arrival}T00:00:00`);
  const end = new Date(`${departure}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diff = Math.round((end - start) / 86400000);
  return diff > 0 ? diff : null;
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

function getBookingDateLine(booking) {
  if (booking.notes) return formatSyncNote(booking.notes);
  if (booking.arrival_date || booking.departure_date) {
    return `Stay · ${formatDateIT(booking.arrival_date)} → ${formatDateIT(booking.departure_date)}`;
  }
  return "";
}

function restoreStayDatesFromNotes(booking) {
  if (!booking.notes || (booking.arrival_date && booking.departure_date)) return booking;

  const match = String(booking.notes).match(/(\d{4}-\d{2}-\d{2})\s*→\s*(\d{4}-\d{2}-\d{2})/);
  if (!match) return booking;

  return {
    ...booking,
    arrival_date: booking.arrival_date || match[1],
    departure_date: booking.departure_date || match[2]
  };
}

function applyAutomaticPaidStatus(bookings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return bookings.map(originalBooking => {
    const booking = restoreStayDatesFromNotes(originalBooking);
    const isOta = booking.synced_from === "Lodgify" || ["Airbnb", "Booking"].includes(String(booking.source || ""));
    if (!isOta) return booking;

    let checkout = booking.departure_date || null;

    if (!checkout && booking.notes) {
      const match = String(booking.notes).match(/→\s*(\d{4}-\d{2}-\d{2})/);
      checkout = match ? match[1] : null;
    }

    if (!checkout) return booking;

    const checkoutDate = new Date(`${checkout}T00:00:00`);
    if (Number.isNaN(checkoutDate.getTime())) return booking;

    if (checkoutDate <= today) {
      return { ...booking, status: "Saldato", departure_date: checkout };
    }

    return booking;
  });
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

      <section style="margin-top:12px;background:linear-gradient(135deg,rgba(22,27,34,.94),rgba(12,15,20,.94));border:1px solid rgba(255,255,255,.08);border-radius:${THEME.radius.card}px;padding:14px;box-shadow:0 14px 38px rgba(0,0,0,.22);">
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div>
            <div style="color:#d7b17a;font-size:${THEME.font.helper}px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;">Importa ID Lodgify</div>
            <div style="margin-top:4px;color:${THEME.colors.textSecondary};font-size:${THEME.font.helper}px;line-height:1.35;">Usalo per importare una prenotazione OTA che non compare nella sync automatica.</div>
          </div>
          <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;">
            <input id="lodgifyBookingId" inputmode="numeric" placeholder="ID prenotazione Lodgify" style="width:100%;box-sizing:border-box;padding:14px 14px;border:0;border-radius:${THEME.radius.input}px;background:${THEME.colors.cardSecondary};color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
            <button id="importLodgifyId" type="button" style="padding:14px 16px;border:1px solid rgba(215,177,122,.38);border-radius:${THEME.radius.button}px;background:rgba(215,177,122,.14);color:#d7b17a;font-size:${THEME.font.formText}px;font-weight:850;white-space:nowrap;">
              Importa
            </button>
          </div>
        </div>
      </section>

      <section id="syncSummary"></section>

      <form id="bookingForm" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.74);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);padding:calc(18px + env(safe-area-inset-top)) 14px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box;align-items:center;justify-content:center;overflow-y:auto;">
        <div style="width:100%;max-width:860px;background:linear-gradient(145deg,#111820,#080b10);padding:0;border-radius:28px;border:1px solid rgba(255,255,255,.10);box-shadow:0 28px 80px rgba(0,0,0,.62);overflow:hidden;margin:auto;">
        <div style="padding:22px 22px 16px;display:flex;align-items:center;justify-content:space-between;gap:14px;border-bottom:1px solid rgba(255,255,255,.07);">
          <div style="display:flex;align-items:center;gap:14px;min-width:0;">
            <div style="width:58px;height:58px;border-radius:999px;background:rgba(48,209,88,.08);border:1px solid rgba(48,209,88,.55);display:flex;align-items:center;justify-content:center;color:${THEME.colors.green};font-size:28px;font-weight:900;box-shadow:0 0 28px rgba(48,209,88,.10);flex-shrink:0;">+</div>
            <div style="min-width:0;">
              <div style="font-size:clamp(24px,4vw,34px);line-height:1.05;font-weight:950;letter-spacing:-.045em;color:${THEME.colors.textPrimary};">New Black Reservation</div>
              <div style="margin-top:6px;color:${THEME.colors.textSecondary};font-size:clamp(13px,2.8vw,16px);font-weight:650;">Insert the details for this Black booking</div>
            </div>
          </div>
          <button id="cancelFormTop" type="button" style="width:44px;height:44px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:${THEME.colors.textPrimary};font-size:26px;line-height:1;font-weight:350;flex-shrink:0;">×</button>
        </div>

        <div style="padding:20px 22px 18px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:0;border:1px solid rgba(255,255,255,.08);border-radius:22px;overflow:hidden;background:rgba(255,255,255,.025);">
            <label style="min-height:138px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;border-right:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:20px;">♙</span>Guest Name</span>
              <input name="name" placeholder="Enter guest name" required style="margin-top:auto;width:100%;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
            </label>

            <label style="min-height:138px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:22px;">€</span>Total Amount (€)</span>
              <input name="amount" type="number" placeholder="0,00" required style="margin-top:auto;width:100%;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
            </label>

            <label style="min-height:138px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;border-right:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:20px;">☷</span>Account Type</span>
              <select name="account_type" style="margin-top:auto;width:100%;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
                <option>Black</option>
                <option>White</option>
              </select>
            </label>

            <label style="min-height:138px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:20px;">▣</span>Payment Status</span>
              <select name="status" style="margin-top:auto;width:100%;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
                <option>Da saldare</option>
                <option>Saldato</option>
              </select>
            </label>

            <label style="min-height:138px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;border-right:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:20px;">◇</span>Acconto (€)</span>
              <input name="deposit" type="number" placeholder="0,00" value="0" style="margin-top:auto;width:100%;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
            </label>

            <label style="min-height:138px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:20px;">⌂</span>Apartment</span>
              <select name="apartment" style="margin-top:auto;width:100%;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
                <option value="">Select apartment</option>
                <option value="1">Apartment 1</option>
                <option value="2">Apartment 2</option>
                <option value="3">Apartment 3</option>
                <option value="4">Apartment 4</option>
                <option value="5">Apartment 5</option>
                <option value="6">Apartment 6</option>
                <option value="7">Apartment 7</option>
                <option value="8">Apartment 8</option>
              </select>
            </label>

            <label style="min-height:138px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;border-right:1px solid rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:20px;">▦</span>Check-in Date</span>
              <input name="arrival_date" type="date" style="margin-top:auto;width:100%;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
            </label>

            <label style="min-height:138px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:20px;">▦</span>Check-out Date</span>
              <input name="departure_date" type="date" style="margin-top:auto;width:100%;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
            </label>

            <label style="grid-column:1 / -1;min-height:126px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;border-bottom:1px solid rgba(255,255,255,.06);box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:20px;">◎</span>Source</span>
              <select name="source" style="margin-top:auto;width:100%;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;">
                <option value="">Select source</option>
                <option>Diretto</option>
                <option>Booking</option>
                <option>Airbnb</option>
              </select>
            </label>

            <label style="grid-column:1 / -1;min-height:154px;display:flex;flex-direction:column;gap:12px;padding:20px 20px 18px;color:${THEME.colors.textPrimary};font-size:${THEME.font.helper}px;font-weight:850;box-sizing:border-box;">
              <span style="display:flex;align-items:center;gap:8px;"><span style="color:${THEME.colors.green};font-size:20px;">▤</span>Notes</span>
              <textarea name="notes" placeholder="Add any additional notes..." style="margin-top:auto;width:100%;min-height:78px;box-sizing:border-box;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(9,13,20,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;resize:vertical;"></textarea>
            </label>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:16px 22px 22px;border-top:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);">
          <button id="cancelForm" type="button" style="width:100%;padding:16px;border:1px solid rgba(255,255,255,.10);border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.03));color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;font-weight:850;">× Cancel</button>
          <button type="submit" style="width:100%;padding:16px;border:0;border-radius:16px;background:linear-gradient(135deg,#30d158,#59d96b);color:#031007;font-size:${THEME.font.formText}px;font-weight:950;box-shadow:0 16px 36px rgba(48,209,88,.22);">▣ Save Black Reservation</button>
        </div>
        </div>
      </form>

  <div style="margin:28px 0 20px;display:flex;flex-direction:column;gap:12px;">
    <h3 style="margin:0;font-size:${THEME.font.sectionTitle}px;">Prenotazioni</h3>
    <div style="position:relative;width:100%;">
      <input id="bookingSearch" type="search" autocomplete="off" placeholder="Cerca cliente, appartamento, fonte..." style="width:100%;box-sizing:border-box;padding:15px 46px 15px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.10);background:rgba(28,28,30,.72);color:${THEME.colors.textPrimary};font-size:${THEME.font.formText}px;outline:none;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 12px 34px rgba(0,0,0,.22);">
      <span style="position:absolute;right:16px;top:50%;transform:translateY(-50%);color:${THEME.colors.textSecondary};font-size:18px;pointer-events:none;">⌕</span>
    </div>
  </div>
  <section id="bookingList"></section>
    </main>
  `;

  document.getElementById("openForm").onclick = () => {
    const form = document.getElementById("bookingForm");
    form.reset();
    delete form.dataset.editId;
    form.style.display = form.style.display === "flex" ? "none" : "flex";
  };
  document.getElementById("syncLodgify").onclick = syncLodgify;
  document.getElementById("bookingSearch").oninput = event => {
    bookingSearchQuery = String(event.target.value || "").trim().toLowerCase();
    loadBookings();
  };
  document.getElementById("importLodgifyId").onclick = importLodgifyById;

  document.getElementById("bookingForm").onsubmit = saveBooking;
  const closeBookingForm = () => {
    const form = document.getElementById("bookingForm");
    form.reset();
    delete form.dataset.editId;
    form.style.display = "none";
  };

  document.getElementById("cancelForm").onclick = closeBookingForm;
  document.getElementById("cancelFormTop").onclick = closeBookingForm;

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
    .order("arrival_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("bookingList").innerHTML = `<pre>${JSON.stringify(error, null, 2)}</pre>`;
    return;
  }

  const normalizedData = applyAutomaticPaidStatus(data || []);

  renderDashboard(normalizedData);
  renderSyncSummary(normalizedData);
  renderBookings(normalizedData);
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
          <div style="margin-top:8px;font-size:clamp(21px,5.8vw,26px);font-weight:950;line-height:1.12;white-space:nowrap;">${euro(blackResidual)}</div>
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
          <div style="margin-top:8px;font-size:clamp(21px,5.8vw,26px);font-weight:950;line-height:1.12;white-space:nowrap;">${euro(whiteResidual)}</div>
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
      <div style="margin-top:8px;font-size:clamp(22px,5.8vw,26px);font-weight:950;line-height:1.08;white-space:nowrap;">${euro(b.saldato)}</div>
      <div style="height:1px;background:#344150;margin:24px 0;"></div>
      <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Complessivo</div>
      <div style="margin-top:8px;font-size:clamp(20px,5.2vw,24px);font-weight:850;line-height:1.1;white-space:nowrap;">${euro(b.complessivo)}</div>
    </div>

    <div style="background:linear-gradient(145deg,#151b1e,#101214);padding:22px;border-radius:${THEME.radius.card}px;border:1px solid ${THEME.colors.cardBorder};box-shadow:0 18px 50px rgba(0,0,0,.35);">
      <div style="font-size:${THEME.font.summaryTitle}px;color:${THEME.colors.whiteLabel};font-weight:950;letter-spacing:.04em;">WHITE</div>
      <div style="margin-top:22px;color:#c7c7cc;font-size:${THEME.font.formText}px;">Incassato</div>
      <div style="margin-top:8px;font-size:clamp(22px,5.8vw,26px);font-weight:950;line-height:1.08;white-space:nowrap;">${euro(w.saldato)}</div>
      <div style="height:1px;background:#344150;margin:24px 0;"></div>
      <div style="color:#c7c7cc;font-size:${THEME.font.formText}px;">Complessivo</div>
      <div style="margin-top:8px;font-size:clamp(20px,5.2vw,24px);font-weight:850;line-height:1.1;white-space:nowrap;">${euro(w.complessivo)}</div>
    </div>

    <div class="se-glass-card se-total-card">
      <div class="se-total-grid">
        <div class="se-glass-panel">
          <div class="se-total-header">
            <div class="se-total-title">TOTALE</div>
            <div class="se-glass-pill">Black + White</div>
          </div>

          <div class="se-total-label">Actual complessivo</div>
          <div class="se-total-main-value">${euro(totalComplessivo)}</div>

          <div class="se-share-grid">
            <div class="se-share-box is-green">
              <div class="se-share-value">${blackShare.toFixed(1).replace('.', ',')}%</div>
              <div class="se-share-label">Black sul totale</div>
            </div>
            <div class="se-share-box is-red">
              <div class="se-share-value">${whiteShare.toFixed(1).replace('.', ',')}%</div>
              <div class="se-share-label">White sul totale</div>
            </div>
          </div>

          <div class="se-glass-progress">
            <div class="se-progress-segment is-green" style="width:${blackShare}%;"></div>
            <div class="se-progress-segment is-red" style="width:${whiteShare}%;"></div>
          </div>
        </div>

        <div class="se-total-side">
          <div class="se-glass-panel">
            <div class="se-total-label">Totale incassato</div>
            <div class="se-total-value is-green">${euro(b.saldato + w.saldato)}</div>
          </div>

          <div class="se-glass-panel">
            <div class="se-total-label">Cifra da raggiungere</div>
            <div class="se-total-value is-blue">${euro(TARGET_TOTAL)}</div>

            <div class="se-glass-progress">
              <div class="se-progress-fill" style="width:${totalProgress}%;"></div>
            </div>

            <div class="se-total-meta">
              <span><b style="color:${THEME.colors.blue};">${euro(totalComplessivo)}</b> / ${euro(TARGET_TOTAL)}</span>
              <span class="se-total-progress-percent">${totalProgress.toFixed(1).replace('.', ',')}%</span>
            </div>
            <div class="se-total-residual">Residuo: <b style="color:${THEME.colors.textPrimary};">${euro(totalResidual)}</b></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderBookings(bookings) {
  const sortedBookings = [...bookings].sort((a, b) => {
    const dateA = a.arrival_date || "9999-12-31";
    const dateB = b.arrival_date || "9999-12-31";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
  const filteredBookings = bookingSearchQuery
    ? sortedBookings.filter(b => {
        const haystack = [
          b.name,
          b.source,
          b.account_type,
          b.status,
          b.apartment ? `app ${b.apartment}` : "",
          b.apartment ? `appartamento ${b.apartment}` : "",
          b.arrival_date,
          b.departure_date,
          b.notes
        ].filter(Boolean).join(" ").toLowerCase();

        return haystack.includes(bookingSearchQuery);
      })
    : sortedBookings;

  const container = document.getElementById("bookingList");
  if (!container) return;

  if (!filteredBookings.length) {
    container.innerHTML = `
      <div style="margin-top:12px;padding:18px;border-radius:${THEME.radius.card}px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);color:${THEME.colors.textSecondary};font-size:${THEME.font.formText}px;text-align:center;">
        Nessuna prenotazione trovata.
      </div>
    `;
    return;
  }

  const renderBookingCard = b => {
    const sourceBadge = getSourceBadge(b.source);
    const statusBadge = getStatusBadge(b.status);
    const isPaid = b.status === "Saldato";
    const nights = getNights(b.arrival_date, b.departure_date);
    const sourceIconStyle = `background:${sourceBadge.background};border-color:${sourceBadge.border};color:${sourceBadge.color};`;
    const statusStyle = `background:${statusBadge.background};border:1px solid ${statusBadge.border};color:${statusBadge.color};`;

    return `
      <article onclick='editBooking(${JSON.stringify(b)})' class="se-booking-pass ${isPaid ? "is-paid" : ""}">
        <div class="se-booking-pass-main">
          <div class="se-source-icon" style="${sourceIconStyle}">${sourceBadge.icon}</div>

          <div style="min-width:0;">
            <div class="se-booking-name-row">
              <div class="se-booking-name">${b.name}</div>
              <span class="se-status-chip" style="${statusStyle}">${statusBadge.label}</span>
            </div>
            <div class="se-booking-meta">
              <span class="se-booking-source-text">${sourceBadge.label}</span>
              <span> · App. ${b.apartment || "-"}</span>
              <span> · ${b.account_type || "-"}</span>
              ${b.guest_count ? `<span> · ${b.guest_count} ospiti</span>` : ""}
            </div>
          </div>

          <div class="se-booking-price">
            <div class="se-booking-amount">${euro(b.amount)}</div>
            <div class="se-booking-chevron">›</div>
          </div>
        </div>

        <div class="se-booking-dates">
          <div class="se-date-box">
            <div class="se-date-value">${formatDateShortIT(b.arrival_date)}</div>
            <div class="se-date-label">Check-in</div>
          </div>
          <div class="se-date-arrow">→</div>
          <div class="se-date-box">
            <div class="se-date-value">${formatDateShortIT(b.departure_date)}</div>
            <div class="se-date-label">Check-out</div>
          </div>
          <div class="se-nights-box">${nights ? `${nights} notti` : "Notti -"}</div>
        </div>

        <div class="se-booking-footer">
          <div class="se-booking-deposit">Acconto: ${euro(b.deposit)}</div>
          <button onclick="event.stopPropagation(); deleteBooking('${b.id}')" class="se-delete-inline">Elimina</button>
        </div>
      </article>
    `;
  };

  const paidBookings = filteredBookings.filter(booking => booking.status === "Saldato");
  const unpaidBookings = filteredBookings.filter(booking => booking.status !== "Saldato");

  container.innerHTML = `
    <div class="se-booking-area">
      <div class="se-booking-list-header">
        <div>
          <div class="se-booking-list-title">Elenco prenotazioni</div>
          <div class="se-booking-list-count">${filteredBookings.length} prenotazioni</div>
        </div>
        <div class="se-booking-sort-chip">Ordina per · Check-in</div>
      </div>

      ${paidBookings.length ? `
        <section class="se-paid-section">
          <div class="se-booking-section-heading">
            <div>
              <div class="se-booking-section-title">Saldate</div>
              <div class="se-booking-section-count">${paidBookings.length} prenotazioni</div>
            </div>
            ${paidBookings.length > 1 ? `<div class="se-swipe-hint">Scorri →</div>` : ""}
          </div>
          <div class="se-paid-carousel">${paidBookings.map(renderBookingCard).join("")}</div>
        </section>
      ` : ""}

      ${unpaidBookings.length ? `
        <section class="se-unpaid-section">
          <div class="se-booking-section-heading">
            <div>
              <div class="se-booking-section-title">Da saldare</div>
              <div class="se-booking-section-count">${unpaidBookings.length} prenotazioni</div>
            </div>
          </div>
          <div class="se-unpaid-list">${unpaidBookings.map(renderBookingCard).join("")}</div>
        </section>
      ` : ""}
    </div>
  `;

  const paidCarousel = container.querySelector(".se-paid-carousel");
  if (paidCarousel) {
    const paidCards = [...paidCarousel.querySelectorAll(".se-booking-pass")];
    let animationFrame = null;

    const updatePaidDeck = () => {
      animationFrame = null;
      const focusPoint = paidCarousel.scrollLeft + paidCarousel.clientWidth / 2;
      let activeIndex = 0;
      let smallestDistance = Infinity;

      paidCards.forEach((card, index) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(cardCenter - focusPoint);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          activeIndex = index;
        }
      });

      paidCards.forEach((card, index) => {
        const signedDistance = index - activeIndex;
        card.style.setProperty("--deck-distance", Math.min(Math.abs(signedDistance), 4));
        card.style.setProperty("--deck-direction", Math.sign(signedDistance));
        card.style.zIndex = String(20 - Math.min(Math.abs(signedDistance), 10));
        card.classList.toggle("is-deck-active", index === activeIndex);
      });
    };

    const requestDeckUpdate = () => {
      if (animationFrame === null) animationFrame = requestAnimationFrame(updatePaidDeck);
    };

    paidCarousel.addEventListener("scroll", requestDeckUpdate, { passive: true });
    paidCarousel.addEventListener("wheel", event => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
    }, { passive: false });
    updatePaidDeck();
  }
}

async function callLodgifyFunction(payload, button, loadingText) {
  if (!button) return null;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = loadingText;
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
      body: JSON.stringify(payload || {})
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      alert(`Errore Lodgify: ${result.error || result.message || result.step || "errore sconosciuto"}`);
      console.log(result);
      return null;
    }

    return result;
  } catch (error) {
    alert(`Errore Lodgify: ${error.message}`);
    return null;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    button.style.opacity = "1";
  }
}

async function syncLodgify() {
  const button = document.getElementById("syncLodgify");
  const result = await callLodgifyFunction({}, button, "Sincronizzazione...");
  if (!result) return;

  const count = Number(result.imported_or_updated || result.imported || result.updated || 0);
  const skipped = Number(result.skipped || 0);
  const removed = Number(result.removed || 0);
  alert(`Sync completata: ${count} importate/aggiornate · ${skipped} ignorate · ${removed} rimosse.`);
  await loadBookings();
}

async function importLodgifyById() {
  const input = document.getElementById("lodgifyBookingId");
  const button = document.getElementById("importLodgifyId");
  const bookingId = String(input?.value || "").trim();

  if (!bookingId) {
    alert("Inserisci un ID prenotazione Lodgify");
    return;
  }

  const result = await callLodgifyFunction({ id: bookingId }, button, "Importo...");
  if (!result) return;

  if (result.action === "imported_or_updated") {
    alert(`Prenotazione importata: ${result.booking?.name || bookingId} · ${euro(result.booking?.amount || 0)}`);
    input.value = "";
    await loadBookings();
    return;
  }

  if (result.action === "skipped_or_removed") {
    alert(`Prenotazione non importata: stato ${result.reason?.status || "non valido"}, sorgente ${result.reason?.source || "non OTA"}.`);
    await loadBookings();
    return;
  }

  alert("Risposta Lodgify non valida per import. Controlla che la Edge Function sia quella definitiva, non una diagnostica.");
  console.log(result);
}

async function saveBooking(event) {
  event.preventDefault();

  const form = event.target;
  const booking = Object.fromEntries(new FormData(form).entries());

  booking.amount = Number(booking.amount);
  booking.deposit = Number(booking.deposit || 0);
  booking.apartment = booking.apartment ? Number(booking.apartment) : null;
  booking.arrival_date = booking.arrival_date || null;
  booking.departure_date = booking.departure_date || null;

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
  form.arrival_date.value = b.arrival_date || "";
  form.departure_date.value = b.departure_date || "";
  form.source.value = b.source || "";
  form.notes.value = b.notes || "";

  form.style.display = "flex";
};
