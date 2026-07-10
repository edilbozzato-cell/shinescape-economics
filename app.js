import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://prpvhnwedpnnwpdvrttz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHZobndlZHBubndwZHZydHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjAwMjcsImV4cCI6MjA5Nzk5NjAyN30.jnrGO7j0ptDfnKScitE3vU79SM6tvMevtfM6_Tv7iBE";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_BLACK = 40000;
const TARGET_WHITE = 28000;
const TARGET_TOTAL = 70000;
const TRACKED_APARTMENTS = [2, 3, 4, 7];
const WHITE_OWNERS = [
  { name: "Janita", apartments: [2, 3] },
  { name: "Andrea", apartments: [4, 7] }
];
const WHITE_OTA_FEE_RATE = 0.18;
const WHITE_PRIMARY_TAX_RATE = 0.21;
const WHITE_SECONDARY_TAX_RATE = 0.26;
const FIXED_EXPENSES = { elio: 10000, patty: 5000, roxy: 2500 };
const TARGET_NIGHTS = 320;

let matchedApartmentByStayKey = new Map();
let currentWhiteMarginDetails = null;
let currentUsefulDetails = null;

function cloneTemplate(id) {
  const template = document.getElementById(id);
  if (!template) throw new Error(`Template mancante: ${id}`);
  return template.content.firstElementChild.cloneNode(true);
}

function mountView(templateId) {
  document.getElementById("appRoot").replaceChildren(cloneTemplate(templateId));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setSyncButtonMeta(lastSync, label = "Sync") {
  const button = document.getElementById("syncLodgify");
  if (!button) return;
  const meta = lastSync ? `Sync ${formatSyncButtonDate(lastSync)}` : "Sync -";
  button.innerHTML = `<span>${label}</span><small id="syncButtonMeta">${meta}</small>`;
}

function setProgress(id, value) {
  const element = document.getElementById(id);
  if (element) element.style.setProperty("--progress", `${value}%`);
}

function setControlState(id, reached) {
  const element = document.getElementById(id);
  if (!element) return;
  element.classList.toggle("is-reached", reached);
  element.setAttribute("aria-label", `${element.textContent.trim()}: ${reached ? "raggiunto" : "non raggiunto"}`);
}

function euro(value) {
  const formatted = Number(value || 0).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  });
  return `${formatted} €`;
}

function euroPrefix(value) {
  const formatted = Number(value || 0).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  });
  return `€ ${formatted}`;
}

function normalizeMatchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function formatDateKey(value) {
  const date = getCalendarDate(value);
  if (!date) return "";
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

function getBookingMatchKey(booking) {
  const name = normalizeMatchText(booking.name);
  const arrival = formatDateKey(getBookingArrivalDate(booking));
  return name && arrival ? `${name}|${arrival}` : null;
}

function isOtaSource(booking) {
  const source = String(booking.source || "").toLowerCase();
  return source.includes("airbnb") || source.includes("booking");
}

function isSyncedFromLodgify(booking) {
  return String(booking.synced_from || "").toLowerCase().includes("lodgify");
}

function isLodgifyDirectBooking(booking) {
  return isSyncedFromLodgify(booking) && !isOtaSource(booking);
}

function convertLodgifyApartment(apartment) {
  const map = {
    1: 3,
    2: 2,
    3: 4,
    4: 7
  };

  return map[apartment] || apartment || null;
}

function getRawApartment(booking) {
  const directValue = Number(booking.apartment || 0);
  if (directValue) return directValue;

  const text = [
    booking.property_name,
    booking.rental_name,
    booking.room_name,
    booking.unit_name,
    booking.listing_name,
    booking.apartment_name,
    booking.lodgify_property_name,
    booking.notes
  ].filter(Boolean).join(" ");
  const match = text.match(/(?:app(?:artamento)?\.?|apartment|room|unit|property)\s*#?\s*(\d+)/i);
  return match ? Number(match[1]) : null;
}

function buildApartmentMatchIndex(bookings) {
  matchedApartmentByStayKey = new Map();

  bookings.forEach(booking => {
    if (!isLodgifyDirectBooking(booking)) return;
    const apartment = getRawApartment(booking);
    if (!apartment) return;

    const key = getBookingMatchKey(booking);
    if (key && !matchedApartmentByStayKey.has(key)) {
      matchedApartmentByStayKey.set(key, convertLodgifyApartment(apartment));
    }
  });
}

function getDisplayApartment(booking) {
  const storedApartment = Number(booking.apartment || 0);
  const lodgifyApartment = getRawApartment(booking);
  const matchedApartment = storedApartment ? null : matchedApartmentByStayKey.get(getBookingMatchKey(booking));
  const isWhiteOta = booking.account_type === "White"
    && (isSyncedFromLodgify(booking) || isOtaSource(booking));

  if (isWhiteOta) return convertLodgifyApartment(lodgifyApartment);

  if (booking.account_type === "Black" && matchedApartment) {
    return matchedApartment;
  }

  return storedApartment || null;
}

function getCalendarDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);

  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const timestamp = Date.UTC(year, month - 1, day);
    const date = new Date(timestamp);
    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
      return { year, month, day, timestamp };
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();
  return { year, month, day, timestamp: Date.UTC(year, month - 1, day) };
}

function formatDateShortIT(value) {
  const calendarDate = getCalendarDate(value);
  if (!calendarDate) return "-";
  const date = new Date(calendarDate.timestamp);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).replace(".", "");
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

function formatSyncButtonDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const parts = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}.${parts.minute}`;
}

function getNights(arrival, departure) {
  const start = getCalendarDate(arrival);
  const end = getCalendarDate(departure);
  if (!start || !end) return null;
  const difference = Math.round((end.timestamp - start.timestamp) / 86400000);
  return difference > 0 ? difference : null;
}

function getStoredNights(booking) {
  const value = Number(booking.nights ?? booking.night_count ?? booking.nights_count ?? booking.total_nights);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function getBookingDepartureDate(booking) {
  if (booking.departure_date) return booking.departure_date;
  const match = String(booking.notes || "").match(/→\s*(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function getBookingArrivalDate(booking) {
  if (booking.arrival_date) return booking.arrival_date;
  const match = String(booking.notes || "").match(/(\d{4}-\d{2}-\d{2})\s*→/);
  return match ? match[1] : null;
}

function getBookingNights(booking) {
  const arrival = getBookingArrivalDate(booking);
  const departure = getBookingDepartureDate(booking);
  if (!arrival || !departure) return 0;

  const start = new Date(`${arrival}T00:00:00`);
  const end = new Date(`${departure}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const nights = Math.round((end - start) / 86400000);
  return nights > 0 ? nights : 0;
}

function getApartmentStats(bookings, mode = "white") {
  const stats = TRACKED_APARTMENTS.map(apartment => ({
    apartment,
    amount: 0,
    nights: 0
  }));

  bookings.forEach(booking => {
    if (mode === "white" && booking.account_type !== "White") return;
    if (mode === "total" && !["White", "Black"].includes(String(booking.account_type || ""))) return;

    const apartment = getDisplayApartment(booking);
    const row = stats.find(item => item.apartment === apartment);
    if (!row) return;

    row.amount += Number(booking.amount || 0);
    row.nights += getBookingNights(booking);
  });

  return stats;
}

function calculateWhiteMargin(bookings) {
  const apartments = getApartmentStats(bookings, "white");
  const gross = apartments.reduce((sum, item) => sum + item.amount, 0);
  const otaFee = gross * WHITE_OTA_FEE_RATE;
  const owners = WHITE_OWNERS.map(owner => {
    const ranked = owner.apartments
      .map(apartment => apartments.find(item => item.apartment === apartment) || { apartment, amount: 0 })
      .sort((a, b) => b.amount - a.amount || a.apartment - b.apartment)
      .map((item, index) => {
        const rate = index === 0 ? WHITE_PRIMARY_TAX_RATE : WHITE_SECONDARY_TAX_RATE;
        return { ...item, rate, tax: item.amount * rate };
      });
    return { ...owner, apartments: ranked, tax: ranked.reduce((sum, item) => sum + item.tax, 0) };
  });
  const tax = owners.reduce((sum, owner) => sum + owner.tax, 0);
  const expenses = otaFee + tax;
  return { gross, otaFee, owners, tax, expenses, margin: gross - expenses };
}

function renderWhiteMarginBreakdown(details) {
  const container = document.getElementById("whiteMarginBreakdown");
  if (!container || !details) return;
  const ownerRows = details.owners.map(owner => `
    <section class="margin-owner-section">
      <div class="margin-owner-title">${owner.name}</div>
      ${owner.apartments.map(item => `
        <div class="margin-detail-row">
          <span>App. ${item.apartment} · ${Math.round(item.rate * 100)}% <small>su ${euro(item.amount)}</small></span>
          <strong>− ${euro(item.tax)}</strong>
        </div>
      `).join("")}
    </section>
  `).join("");
  container.innerHTML = `
    <div class="margin-detail-row"><span>Totale White lordo</span><strong>${euro(details.gross)}</strong></div>
    <div class="margin-detail-row is-expense"><span>Fee OTA · 18% <small>su tutto il White</small></span><strong>− ${euro(details.otaFee)}</strong></div>
    ${ownerRows}
    <div class="margin-detail-row is-expense-total"><span>Spese totali</span><strong>− ${euro(details.expenses)}</strong></div>
    <div class="margin-detail-row is-margin-total"><span>Margine White</span><strong>${euro(details.margin)}</strong></div>
  `;
}

function openWhiteMarginDetails() {
  const dialog = document.getElementById("whiteMarginDetails");
  renderWhiteMarginBreakdown(currentWhiteMarginDetails);
  dialog.hidden = false;
  dialog.classList.add("is-open");
  document.getElementById("closeWhiteMarginTop").focus();
}

function closeWhiteMarginDetails() {
  const dialog = document.getElementById("whiteMarginDetails");
  dialog.classList.remove("is-open");
  dialog.hidden = true;
}

function renderUsefulBreakdown(details) {
  const container = document.getElementById("usefulBreakdown");
  if (!container || !details) return;
  const whiteOwnerRows = details.whiteDetails.owners.map(owner => `
    <section class="margin-owner-section">
      <div class="margin-owner-title">${owner.name}</div>
      ${owner.apartments.map(item => `
        <div class="margin-detail-row">
          <span>App. ${item.apartment} · ${Math.round(item.rate * 100)}% <small>su ${euro(item.amount)}</small></span>
          <strong>− ${euro(item.tax)}</strong>
        </div>
      `).join("")}
    </section>
  `).join("");
  container.innerHTML = `
    <section class="useful-calculation-section">
      <div class="margin-owner-title is-green">Calcolo Margine Black</div>
      <div class="margin-detail-row"><span>Totale Black</span><strong>${euro(details.blackMargin)}</strong></div>
      <div class="margin-formula">${euro(details.blackMargin)} × 100% = ${euro(details.blackMargin)}</div>
      <div class="margin-detail-row is-margin-total"><span>Margine Black</span><strong>${euro(details.blackMargin)}</strong></div>
    </section>
    <section class="useful-calculation-section">
      <div class="margin-owner-title is-red">Calcolo Margine White</div>
      <div class="margin-detail-row"><span>Totale White lordo</span><strong>${euro(details.whiteDetails.gross)}</strong></div>
      <div class="margin-detail-row is-expense"><span>Fee OTA · 18% <small>su tutto il White</small></span><strong>− ${euro(details.whiteDetails.otaFee)}</strong></div>
      ${whiteOwnerRows}
      <div class="margin-detail-row is-expense-total"><span>Spese White totali</span><strong>− ${euro(details.whiteDetails.expenses)}</strong></div>
      <div class="margin-formula">${euro(details.whiteDetails.gross)} − ${euro(details.whiteDetails.expenses)} = ${euro(details.whiteMargin)}</div>
      <div class="margin-detail-row is-margin-total"><span>Margine White</span><strong>${euro(details.whiteMargin)}</strong></div>
    </section>
    <div class="margin-detail-separator"></div>
    <div class="margin-detail-row is-expense"><span>Spesa Elio</span><strong>− ${euro(details.expenses.elio)}</strong></div>
    <div class="margin-detail-row is-expense"><span>Spesa Patty</span><strong>− ${euro(details.expenses.patty)}</strong></div>
    <div class="margin-detail-row is-expense"><span>Spesa Roxy</span><strong>− ${euro(details.expenses.roxy)}</strong></div>
    <div class="margin-detail-row is-expense-total"><span>Spese totali</span><strong>− ${euro(details.expensesTotal)}</strong></div>
    <div class="margin-formula">${euro(details.blackMargin)} + ${euro(details.whiteMargin)} − ${euro(details.expensesTotal)}</div>
    <div class="margin-detail-row is-margin-total"><span>Utile finale</span><strong>${euro(details.total)}</strong></div>
  `;
}

function openUsefulDetails() {
  const dialog = document.getElementById("usefulDetails");
  renderUsefulBreakdown(currentUsefulDetails);
  dialog.hidden = false;
  dialog.classList.add("is-open");
  document.getElementById("closeUsefulDetailsTop").focus();
}

function closeUsefulDetails() {
  const dialog = document.getElementById("usefulDetails");
  dialog.classList.remove("is-open");
  dialog.hidden = true;
}

function restoreStayDatesFromNotes(booking) {
  const existingArrival = booking.arrival_date || booking.check_in || booking.checkin || booking.start_date || null;
  const existingDeparture = booking.departure_date || booking.check_out || booking.checkout || booking.end_date || null;
  if (existingArrival && existingDeparture) {
    return { ...booking, arrival_date: existingArrival, departure_date: existingDeparture };
  }
  if (!booking.notes) return booking;

  const notes = String(booking.notes);
  const isoDates = notes.match(/\d{4}-\d{2}-\d{2}/g) || [];
  const italianMatch = notes.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s)*[→➜➡-](?:\s)*(\d{1,2})[./](\d{1,2})[./](\d{4})/);

  let arrivalFromNotes = isoDates[0] || null;
  let departureFromNotes = isoDates[1] || null;
  if (!arrivalFromNotes && italianMatch) {
    arrivalFromNotes = `${italianMatch[3]}-${italianMatch[2].padStart(2, "0")}-${italianMatch[1].padStart(2, "0")}`;
    departureFromNotes = `${italianMatch[6]}-${italianMatch[5].padStart(2, "0")}-${italianMatch[4].padStart(2, "0")}`;
  }
  if (!arrivalFromNotes || !departureFromNotes) return booking;

  return {
    ...booking,
    arrival_date: existingArrival || arrivalFromNotes,
    departure_date: existingDeparture || departureFromNotes
  };
}

function applyAutomaticPaidStatus(bookings) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  return bookings.map(originalBooking => {
    const booking = restoreStayDatesFromNotes(originalBooking);
    const isOta = booking.synced_from === "Lodgify" || ["Airbnb", "Booking"].includes(String(booking.source || ""));
    if (!isOta || !booking.departure_date) return booking;

    const checkoutDate = getCalendarDate(booking.departure_date);
    if (checkoutDate && checkoutDate.timestamp <= todayTimestamp) {
      return { ...booking, status: "Saldato" };
    }
    return booking;
  });
}

function getSourcePresentation(source) {
  const normalized = String(source || "Diretta").trim().toLowerCase();
  if (normalized.includes("airbnb")) return { label: "Airbnb", icon: "A", className: "is-airbnb" };
  if (normalized.includes("booking")) return { label: "Booking", icon: "B.", className: "is-booking" };
  return { label: "Diretta", icon: "S", className: "is-direct" };
}

function getSyncStats(bookings) {
  const lodgify = bookings.filter(booking => booking.synced_from === "Lodgify");
  const airbnb = lodgify.filter(booking => String(booking.source || "").toLowerCase().includes("airbnb"));
  const booking = lodgify.filter(item => String(item.source || "").toLowerCase().includes("booking"));
  const direct = bookings.filter(item => item.account_type === "Black");
  const lastSync = lodgify.map(item => item.last_synced_at).filter(Boolean).sort().at(-1);
  return {
    total: booking.length + airbnb.length + direct.length,
    airbnb: airbnb.length,
    booking: booking.length,
    direct: direct.length,
    lastSync
  };
}

async function checkAuth() {
  const { data, error } = await supabase.auth.getSession();
  return error ? null : data.session;
}

function renderLogin() {
  mountView("loginTemplate");
  document.getElementById("loginButton").addEventListener("click", async () => {
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
  });
}

function openBookingForm(booking = null) {
  const form = document.getElementById("bookingForm");
  form.reset();
  delete form.dataset.editId;

  if (booking) {
    form.dataset.editId = booking.id;
    form.name.value = booking.name || "";
    form.amount.value = booking.amount || "";
    form.account_type.value = booking.account_type || "Black";
    form.status.value = booking.status || "Da saldare";
    form.deposit.value = booking.deposit || 0;
    form.apartment.value = booking.apartment || "";
    form.arrival_date.value = booking.arrival_date || "";
    form.departure_date.value = booking.departure_date || "";
    form.source.value = booking.source || "";
    form.notes.value = booking.notes || "";
  }

  form.hidden = false;
  form.classList.add("is-open");
}

function closeBookingForm() {
  const form = document.getElementById("bookingForm");
  form.reset();
  delete form.dataset.editId;
  form.classList.remove("is-open");
  form.hidden = true;
}

function updateTaxCalculator() {
  const revenue = Math.max(0, Number(document.getElementById("taxRevenue")?.value || 0));
  const profitability = revenue * 0.67;
  const tax = profitability * 0.05;
  const inps = profitability * 0.2627;
  const taxAdvance = tax;
  const inpsAdvance = inps * 0.8;
  const janitaTotal = tax + inps + taxAdvance + inpsAdvance;
  const profit = revenue - janitaTotal;

  setText("taxProfitability", euro(profitability));
  setText("taxAmount", euro(tax));
  setText("taxInps", euro(inps));
  setText("taxAdvance", euro(taxAdvance));
  setText("taxInpsAdvance", euro(inpsAdvance));
  setText("taxJanitaTotal", euro(janitaTotal));
  setText("taxProfit", euro(profit));
}

function openTaxCalculator() {
  const calculator = document.getElementById("taxCalculator");
  calculator.hidden = false;
  calculator.classList.add("is-open");
  updateTaxCalculator();
  document.getElementById("taxRevenue").focus();
}

function closeTaxCalculator() {
  const calculator = document.getElementById("taxCalculator");
  calculator.classList.remove("is-open");
  calculator.hidden = true;
}

function renderApp() {
  mountView("appTemplate");
  const dashboard = document.getElementById("dashboard");
  dashboard.insertBefore(document.querySelector(".nights-chart-card"), dashboard.querySelector(".se-total-card"));
  document.getElementById("openForm").addEventListener("click", () => openBookingForm());
  document.getElementById("syncLodgify").addEventListener("click", syncLodgify);
  document.getElementById("openTaxCalculator").addEventListener("click", openTaxCalculator);
  document.getElementById("taxRevenue").addEventListener("input", updateTaxCalculator);
  document.getElementById("closeTaxCalculator").addEventListener("click", closeTaxCalculator);
  document.getElementById("closeTaxCalculatorTop").addEventListener("click", closeTaxCalculator);
  document.getElementById("taxCalculator").addEventListener("click", event => {
    if (event.target.id === "taxCalculator") closeTaxCalculator();
  });
  document.getElementById("openWhiteMargin").addEventListener("click", openWhiteMarginDetails);
  document.getElementById("closeWhiteMargin").addEventListener("click", closeWhiteMarginDetails);
  document.getElementById("closeWhiteMarginTop").addEventListener("click", closeWhiteMarginDetails);
  document.getElementById("whiteMarginDetails").addEventListener("click", event => {
    if (event.target.id === "whiteMarginDetails") closeWhiteMarginDetails();
  });
  document.getElementById("openUsefulDetails").addEventListener("click", openUsefulDetails);
  document.getElementById("closeUsefulDetails").addEventListener("click", closeUsefulDetails);
  document.getElementById("closeUsefulDetailsTop").addEventListener("click", closeUsefulDetails);
  document.getElementById("usefulDetails").addEventListener("click", event => {
    if (event.target.id === "usefulDetails") closeUsefulDetails();
  });
  document.getElementById("importLodgifyId").addEventListener("click", importLodgifyById);
  document.getElementById("bookingForm").addEventListener("submit", saveBooking);
  document.getElementById("cancelForm").addEventListener("click", closeBookingForm);
  document.getElementById("cancelFormTop").addEventListener("click", closeBookingForm);
  document.getElementById("logoutButton").addEventListener("click", async () => {
    await supabase.auth.signOut();
    renderLogin();
  });
}

async function loadBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("arrival_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    const errorState = cloneTemplate("errorStateTemplate");
    errorState.textContent = JSON.stringify(error, null, 2);
    document.getElementById("bookingList").replaceChildren(errorState);
    return;
  }

  const bookings = applyAutomaticPaidStatus(data || []);
  buildApartmentMatchIndex(bookings);
  renderDashboard(bookings);
  renderMonthlyNightsChart(bookings);
  renderSyncSummary(bookings);
  renderApartmentPerformance(bookings);
  renderBookings(bookings);
}

function getSeasonYear(bookings) {
  const years = bookings.map(booking => getCalendarDate(booking.arrival_date)?.year).filter(Boolean);
  if (!years.length) return new Date().getFullYear();

  const frequencies = years.reduce((counts, year) => {
    counts.set(year, (counts.get(year) || 0) + 1);
    return counts;
  }, new Map());
  return [...frequencies.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function calculateMonthlyNights(bookings, year) {
  const totals = [0, 0, 0, 0, 0];

  bookings.forEach(booking => {
    const arrival = getCalendarDate(booking.arrival_date);
    const departure = getCalendarDate(booking.departure_date);
    if (!arrival || !departure || departure.timestamp <= arrival.timestamp) return;

    for (let night = arrival.timestamp; night < departure.timestamp; night += 86400000) {
      const date = new Date(night);
      const month = date.getUTCMonth();
      if (date.getUTCFullYear() === year && month >= 5 && month <= 9) totals[month - 5] += 1;
    }
  });
  return totals;
}

function renderMonthlyNightsChart(bookings) {
  const fullTarget = [40, 120, 120, 40, 0];
  const seasonYear = getSeasonYear(bookings);
  const fullActual = calculateMonthlyNights(bookings, seasonYear);
  const showOctober = fullActual[4] > 0;
  const actual = showOctober ? fullActual : fullActual.slice(0, 4);
  const target = showOctober ? fullTarget : fullTarget.slice(0, 4);
  const totalActual = fullActual.reduce((sum, value) => sum + value, 0);
  const totalTarget = fullTarget.reduce((sum, value) => sum + value, 0);
  const delta = totalActual - totalTarget;
  const maximum = Math.max(120, ...actual);
  const chartMaximum = Math.ceil((maximum * 1.15) / 20) * 20;
  const compactChart = window.matchMedia("(max-width: 560px)").matches;
  const xPositions = compactChart
    ? (showOctober ? [50, 120, 190, 260, 330] : [55, 145, 235, 325])
    : (showOctober ? [86, 246, 406, 566, 726] : [100, 310, 520, 730]);
  const chartTop = 34;
  const chartBottom = 246;
  const chartHeight = chartBottom - chartTop;
  const yForValue = value => chartBottom - (value / chartMaximum) * chartHeight;
  const pointsFor = values => values.map((value, index) => `${xPositions[index]},${yForValue(value)}`).join(" ");

  const chart = document.querySelector(".nights-chart");
  const gridStart = compactChart ? 34 : 64;
  const gridEnd = compactChart ? 344 : 764;
  chart.setAttribute("viewBox", compactChart ? "0 0 360 300" : "0 0 800 300");
  chart.querySelectorAll(".nights-chart-grid line").forEach(line => {
    line.setAttribute("x1", gridStart);
    line.setAttribute("x2", gridEnd);
  });
  chart.querySelectorAll(".nights-chart-y-label").forEach(label => {
    label.setAttribute("x", compactChart ? 29 : 51);
  });

  setText("nightsChartYear", seasonYear);
  setText("nightsChartTotal", `${totalActual} notti`);
  setText("nightsChartTarget", `${totalTarget} notti`);
  const deltaElement = document.getElementById("nightsChartDelta");
  deltaElement.textContent = delta === 0 ? "Target raggiunto" : `${Math.abs(delta)} notti ${delta > 0 ? "sopra" : "sotto"} il target`;
  deltaElement.classList.toggle("is-above", delta > 0);
  deltaElement.classList.toggle("is-below", delta < 0);
  document.getElementById("targetNightsLine").setAttribute("points", pointsFor(target));
  document.getElementById("actualNightsLine").setAttribute("points", pointsFor(actual));
  document.getElementById("actualNightsArea").setAttribute("d", `M ${xPositions[0]} ${chartBottom} L ${pointsFor(actual).replaceAll(" ", " L ")} L ${xPositions.at(-1)} ${chartBottom} Z`);

  const levels = [chartMaximum, chartMaximum * .75, chartMaximum * .5, chartMaximum * .25, 0];
  document.querySelectorAll(".nights-chart-y-label").forEach((label, index) => {
    label.textContent = Math.round(levels[index]);
  });

  fullActual.forEach((value, index) => {
    const dot = document.getElementById(`actualNightDot${index}`);
    const label = document.getElementById(`actualNightValue${index}`);
    const deltaLabel = document.getElementById(`nightDelta${index}`);
    const month = document.getElementById(`nightMonth${index}`);
    const isVisible = index < xPositions.length;
    dot.classList.toggle("is-hidden", !isVisible);
    label.classList.toggle("is-hidden", !isVisible);
    deltaLabel.classList.toggle("is-hidden", !isVisible);
    month.classList.toggle("is-hidden", !isVisible);
    if (!isVisible) return;

    dot.setAttribute("cx", xPositions[index]);
    dot.setAttribute("cy", yForValue(value));
    label.setAttribute("x", xPositions[index]);
    label.setAttribute("y", Math.max(yForValue(value) - 15, 18));
    deltaLabel.setAttribute("x", xPositions[index]);
    month.setAttribute("x", xPositions[index]);
    label.textContent = value;
    const monthlyDelta = value - fullTarget[index];
    deltaLabel.textContent = monthlyDelta > 0 ? `+${monthlyDelta}` : String(monthlyDelta);
    deltaLabel.classList.toggle("is-positive", monthlyDelta > 0);
    deltaLabel.classList.toggle("is-negative", monthlyDelta < 0);
    deltaLabel.classList.toggle("is-neutral", monthlyDelta === 0);
  });
}

function renderSyncSummary(bookings) {
  const stats = getSyncStats(bookings);
  const summary = document.getElementById("syncSummary");
  summary.hidden = false;
  setSyncButtonMeta(stats.lastSync);
  setText("bookingSyncCount", `Booking ${stats.booking}`);
  setText("airbnbSyncCount", `Airbnb ${stats.airbnb}`);
  setText("directSyncCount", `Direct ${stats.direct}`);
  setText("otaSyncCount", `Tot ${stats.total}`);
}

function renderDashboard(bookings) {
  const calculate = list => ({
    collected: list.reduce((sum, booking) => sum + (booking.status === "Saldato" ? Number(booking.amount || 0) : Number(booking.deposit || 0)), 0),
    overall: list.reduce((sum, booking) => sum + Number(booking.amount || 0), 0)
  });

  const black = calculate(bookings.filter(booking => booking.account_type === "Black"));
  const white = calculate(bookings.filter(booking => booking.account_type === "White"));
  const blackResidual = Math.max(TARGET_BLACK - black.overall, 0);
  const whiteResidual = Math.max(TARGET_WHITE - white.overall, 0);
  const blackProgress = Math.min((black.overall / TARGET_BLACK) * 100, 100);
  const whiteProgress = Math.min((white.overall / TARGET_WHITE) * 100, 100);
  const totalOverall = black.overall + white.overall;
  const totalCollected = black.collected + white.collected;
  const totalResidual = Math.max(TARGET_TOTAL - totalOverall, 0);
  const totalProgress = Math.min((totalOverall / TARGET_TOTAL) * 100, 100);
  const blackShare = totalOverall > 0 ? (black.overall / totalOverall) * 100 : 0;
  const whiteShare = totalOverall > 0 ? (white.overall / totalOverall) * 100 : 0;
  const whiteMarginDetails = calculateWhiteMargin(bookings);
  const seasonNights = calculateMonthlyNights(bookings, getSeasonYear(bookings)).reduce((sum, value) => sum + value, 0);
  const fixedExpensesTotal = Object.values(FIXED_EXPENSES).reduce((sum, value) => sum + value, 0);
  const totalUseful = black.overall + whiteMarginDetails.margin - fixedExpensesTotal;
  const percent = value => `${value.toFixed(1).replace(".", ",")}%`;

  setText("blackResidual", euro(blackResidual));
  setText("blackCollected", euro(black.collected));
  setText("blackOverall", euro(black.overall));
  setText("blackReached", percent(blackProgress));
  setText("blackProgressMeta", `${euro(black.overall)} / ${euro(TARGET_BLACK)}`);
  setProgress("blackProgressBar", blackProgress);

  setText("whiteResidual", euro(whiteResidual));
  setText("whiteCollected", euro(white.collected));
  setText("whiteOverall", euro(white.overall));
  setText("whiteReached", percent(whiteProgress));
  setText("whiteProgressMeta", `${euro(white.overall)} / ${euro(TARGET_WHITE)}`);
  setProgress("whiteProgressBar", whiteProgress);

  setText("totalOverall", euro(totalOverall));
  setText("blackShare", percent(blackShare));
  setText("whiteShare", percent(whiteShare));
  setProgress("blackShareBar", blackShare);
  setProgress("whiteShareBar", whiteShare);
  setText("blackMargin", euro(black.overall));
  setText("whiteMargin", euro(whiteMarginDetails.margin));
  currentWhiteMarginDetails = whiteMarginDetails;
  setControlState("controlElio", black.overall >= FIXED_EXPENSES.elio);
  setControlState("controlPatty", black.overall - FIXED_EXPENSES.elio >= FIXED_EXPENSES.patty);
  setControlState("controlRoxy", black.overall - FIXED_EXPENSES.elio - FIXED_EXPENSES.patty >= FIXED_EXPENSES.roxy);
  setControlState("controlNights", seasonNights >= TARGET_NIGHTS);
  setControlState("controlBlack", black.overall >= TARGET_BLACK);
  setControlState("controlWhite", white.overall >= TARGET_WHITE);
  setText("totalUseful", euro(totalUseful));
  currentUsefulDetails = {
    blackMargin: black.overall,
    whiteMargin: whiteMarginDetails.margin,
    whiteDetails: whiteMarginDetails,
    expenses: { ...FIXED_EXPENSES },
    expensesTotal: fixedExpensesTotal,
    total: totalUseful
  };
  setText("totalCollected", euro(totalCollected));
  setText("totalTarget", euro(TARGET_TOTAL));
  setProgress("totalProgressBar", totalProgress);
  setText("totalProgressCurrent", euro(totalOverall));
  setText("totalProgressTarget", euro(TARGET_TOTAL));
  setText("totalProgressPercent", percent(totalProgress));
  setText("totalResidual", euro(totalResidual));
}

function renderApartmentPerformance(bookings) {
  const container = document.getElementById("apartmentPerformance");
  if (!container) return;

  const renderCard = item => `
    <article class="se-apartment-card">
      <div class="se-apartment-label">App. ${item.apartment}</div>
      <div class="se-apartment-amount">${euroPrefix(item.amount)}</div>
      <div class="se-apartment-nights">${item.nights} notti</div>
    </article>
  `;

  container.innerHTML = `
    <div class="se-apartment-performance-section">
      <div class="se-apartment-performance-title">Performance Appartamenti White</div>
      <div class="se-apartment-grid">${getApartmentStats(bookings, "white").map(renderCard).join("")}</div>
    </div>
  `;
}

function createBookingCard(booking) {
  const card = cloneTemplate("bookingCardTemplate");
  const source = getSourcePresentation(booking.source);
  const isPaid = booking.status === "Saldato";
  const nights = getNights(booking.arrival_date, booking.departure_date) || getStoredNights(booking);
  const displayApartment = getDisplayApartment(booking);

  if (isPaid) card.classList.add("is-paid");
  card.querySelector(".se-source-icon").classList.add(source.className);
  card.querySelector(".se-source-icon").textContent = source.icon;
  card.querySelector(".se-booking-name").textContent = booking.name || "-";
  const createdAt = new Date(booking.created_at).getTime();
  const newBadgeDuration = 24 * 60 * 60 * 1000;
  const bookingAge = Date.now() - createdAt;
  const isNewLodgifyBooking = booking.synced_from === "Lodgify"
    && Number.isFinite(createdAt)
    && bookingAge >= 0
    && bookingAge < newBadgeDuration;
  const newChip = card.querySelector(".se-new-chip");
  newChip.hidden = !isNewLodgifyBooking;
  if (isNewLodgifyBooking) {
    window.setTimeout(() => { newChip.hidden = true; }, newBadgeDuration - bookingAge);
  }
  card.querySelector(".se-booking-source-text").textContent = source.label;
  card.querySelector(".se-booking-details").textContent = ` · App. ${displayApartment || "-"} · ${booking.account_type || "-"}${booking.guest_count ? ` · ${booking.guest_count} ospiti` : ""}`;
  card.querySelector(".se-booking-amount").textContent = euro(booking.amount);
  card.querySelector(".is-arrival").textContent = formatDateShortIT(booking.arrival_date);
  card.querySelector(".is-departure").textContent = formatDateShortIT(booking.departure_date);
  card.querySelector(".se-nights-box").textContent = nights ? `${nights} notti` : "Notti -";
  card.querySelector(".se-booking-deposit").textContent = `Acconto: ${euro(booking.deposit)}`;

  const status = card.querySelector(".se-status-chip");
  status.textContent = isPaid ? "Saldato" : "Da saldare";
  status.classList.add(isPaid ? "is-paid" : "is-unpaid");

  card.addEventListener("click", () => openBookingForm(booking));
  card.querySelector(".se-delete-inline").addEventListener("click", event => {
    event.stopPropagation();
    deleteBooking(booking.id);
  });
  return card;
}

function renderBookings(bookings) {
  const sorted = [...bookings].sort((a, b) => {
    const dateComparison = String(a.arrival_date || "9999-12-31").localeCompare(String(b.arrival_date || "9999-12-31"));
    return dateComparison || String(a.name || "").localeCompare(String(b.name || ""));
  });
  const filtered = sorted;
  const container = document.getElementById("bookingList");

  if (!filtered.length) {
    container.replaceChildren(cloneTemplate("emptyStateTemplate"));
    return;
  }

  const area = cloneTemplate("bookingAreaTemplate");
  const paid = filtered.filter(booking => booking.status === "Saldato");
  const unpaid = filtered.filter(booking => booking.status !== "Saldato");

  if (paid.length) {
    const section = area.querySelector(".se-paid-section");
    section.hidden = false;
    section.querySelector(".se-paid-carousel").append(...paid.map(createBookingCard));
  }

  if (unpaid.length) {
    const section = area.querySelector(".se-unpaid-section");
    section.hidden = false;
    section.querySelector(".se-booking-section-count").textContent = `${unpaid.length} prenotazioni`;
    section.querySelector(".se-unpaid-list").append(...unpaid.map(createBookingCard));
  }

  container.replaceChildren(area);
  initializePaidDeck(area.querySelector(".se-paid-carousel"));
}

function initializePaidDeck(carousel) {
  if (!carousel || !carousel.children.length) return;
  const cards = [...carousel.querySelectorAll(".se-booking-pass")];
  let animationFrame = null;

  const update = () => {
    animationFrame = null;
    const focusPoint = carousel.scrollLeft + carousel.clientWidth / 2;
    let activeIndex = 0;
    let smallestDistance = Infinity;

    cards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - focusPoint);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        activeIndex = index;
      }
    });

    cards.forEach((card, index) => {
      const signedDistance = index - activeIndex;
      card.style.setProperty("--deck-distance", Math.min(Math.abs(signedDistance), 4));
      card.style.setProperty("--deck-direction", Math.sign(signedDistance));
      card.style.zIndex = String(20 - Math.min(Math.abs(signedDistance), 10));
      card.classList.toggle("is-deck-active", index === activeIndex);
    });
  };

  carousel.addEventListener("scroll", () => {
    if (animationFrame === null) animationFrame = requestAnimationFrame(update);
  }, { passive: true });
  carousel.addEventListener("wheel", event => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
  }, { passive: false });
  update();
}

async function callLodgifyFunction(payload, button, loadingText) {
  if (!button) return null;
  const originalText = button.textContent;
  const originalHtml = button.innerHTML;
  button.disabled = true;
  if (button.id === "syncLodgify") {
    button.innerHTML = `<span>${loadingText}</span><small id="syncButtonMeta">Attendi...</small>`;
  } else {
    button.textContent = loadingText;
  }
  button.classList.add("is-loading");

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const response = await fetch(`${SUPABASE_URL}/functions/v1/bright-api`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken || SUPABASE_KEY}` },
      body: JSON.stringify(payload || {})
    });
    const result = await response.json();
    if (!response.ok || result.success === false) {
      const message = String(result.error || result.message || result.step || "errore sconosciuto").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, 240);
      alert(`Errore Lodgify: ${message}`);
      return null;
    }
    return result;
  } catch (error) {
    alert(`Errore Lodgify: ${error.message}`);
    return null;
  } finally {
    button.disabled = false;
    button.innerHTML = originalHtml || originalText;
    button.classList.remove("is-loading");
  }
}

async function syncLodgify() {
  const result = await callLodgifyFunction({}, document.getElementById("syncLodgify"), "Sincronizzazione...");
  if (!result) return;
  const count = Number(result.imported_or_updated || result.imported || result.updated || 0);
  const directUpdated = Number(result.direct_match?.updated?.length || 0);
  const directCandidates = Number(result.direct_match?.candidates || 0);
  const directErrors = Number(result.direct_match?.update_errors?.length || 0);
  const directReady = Number(result.direct_readiness?.ready || 0);
  const directTotal = Number(result.direct_readiness?.total || 0);
  const directMissingAmount = Number(result.direct_readiness?.missing_amount || 0);
  const dashboardDirectTotal = Number.isFinite(Number(result.dashboard_direct?.total)) ? Number(result.dashboard_direct.total) : null;
  const dashboardLine = dashboardDirectTotal === null
    ? "Dashboard: conteggio dirette non disponibile"
    : `Dashboard: ${dashboardDirectTotal} dirette`;
  const mismatch = dashboardDirectTotal === null || !directTotal
    ? ""
    : `\nDiscrepanza: ${dashboardDirectTotal - directTotal > 0 ? "+" : ""}${dashboardDirectTotal - directTotal} in dashboard`;
  const warnings = [
    directMissingAmount ? `${directMissingAmount} diretta Lodgify senza importo` : "",
    directErrors ? `${directErrors} errori update` : "",
    result.direct_match?.select_error ? "errore lettura Black" : "",
    result.dashboard_direct?.error ? "errore conteggio dashboard" : ""
  ].filter(Boolean);

  alert([
    "Sync completata.",
    `OTA: ${count} aggiornate · ${Number(result.skipped || 0)} ignorate · ${Number(result.removed || 0)} rimosse`,
    `Lodgify riconosciute: ${directTotal || directCandidates} dirette · ${directReady} importabili`,
    dashboardLine,
    `Match appartamenti: ${directUpdated}/${directCandidates}`,
    mismatch.trim(),
    warnings.length ? `Attenzione: ${warnings.join(" · ")}` : ""
  ].filter(Boolean).join("\n"));
  await loadBookings();
}

async function importLodgifyById() {
  const input = document.getElementById("lodgifyBookingId");
  const bookingId = String(input.value || "").trim();
  if (!bookingId) {
    alert("Inserisci un ID prenotazione Lodgify");
    return;
  }

  const result = await callLodgifyFunction({ id: bookingId }, document.getElementById("importLodgifyId"), "Importo...");
  if (!result) return;
  if (result.action === "imported_or_updated") {
    alert(`Prenotazione importata: ${result.booking?.name || bookingId} · ${euro(result.booking?.amount || 0)}`);
    input.value = "";
  } else if (result.action === "direct_apartment_matched") {
    const updated = Number(result.direct_match?.updated?.length || 0);
    const candidates = Number(result.direct_match?.candidates || 0);
    alert(`Match diretto Lodgify: ${updated}/${candidates} Black aggiornate.`);
    input.value = "";
  } else if (result.action === "skipped_or_removed") {
    alert(`Prenotazione non importata: stato ${result.reason?.status || "non valido"}, sorgente ${result.reason?.source || "non OTA"}.`);
  } else {
    alert("Risposta Lodgify non valida per import.");
  }
  await loadBookings();
}

async function saveBooking(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const booking = Object.fromEntries(new FormData(form).entries());
  booking.amount = Number(booking.amount);
  booking.deposit = Number(booking.deposit || 0);
  booking.apartment = booking.apartment ? Number(booking.apartment) : null;
  booking.arrival_date = booking.arrival_date || null;
  booking.departure_date = booking.departure_date || null;

  const response = form.dataset.editId
    ? await supabase.from("bookings").update(booking).eq("id", form.dataset.editId)
    : await supabase.from("bookings").insert([booking]);
  if (response.error) {
    alert(`Errore salvataggio: ${response.error.message}`);
    return;
  }

  closeBookingForm();
  await loadBookings();
}

async function deleteBooking(id) {
  if (!confirm("Vuoi eliminare questa prenotazione?")) return;
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) {
    alert(`Errore eliminazione: ${error.message}`);
    return;
  }
  await loadBookings();
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
