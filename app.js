import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://prpvhnwedpnnwpdvrttz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBycHZobndlZHBubndwZHZydHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjAwMjcsImV4cCI6MjA5Nzk5NjAyN30.jnrGO7j0ptDfnKScitE3vU79SM6tvMevtfM6_Tv7iBE";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_BLACK = 40000;
const TARGET_WHITE = 28000;
const TARGET_TOTAL = 70000;

let bookingSearchQuery = "";

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

function setProgress(id, value) {
  const element = document.getElementById(id);
  if (element) element.style.setProperty("--progress", `${value}%`);
}

function euro(value) {
  const formatted = Number(value || 0).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  });
  return `${formatted} €`;
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
  const lastSync = lodgify.map(item => item.last_synced_at).filter(Boolean).sort().at(-1);
  return { total: lodgify.length, airbnb: airbnb.length, booking: booking.length, lastSync };
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

function renderApp() {
  mountView("appTemplate");
  document.getElementById("openForm").addEventListener("click", () => openBookingForm());
  document.getElementById("syncLodgify").addEventListener("click", syncLodgify);
  document.getElementById("importLodgifyId").addEventListener("click", importLodgifyById);
  document.getElementById("bookingForm").addEventListener("submit", saveBooking);
  document.getElementById("cancelForm").addEventListener("click", closeBookingForm);
  document.getElementById("cancelFormTop").addEventListener("click", closeBookingForm);
  document.getElementById("bookingSearch").addEventListener("input", event => {
    bookingSearchQuery = String(event.target.value || "").trim().toLowerCase();
    loadBookings();
  });
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
  renderDashboard(bookings);
  renderMonthlyNightsChart(bookings);
  renderSyncSummary(bookings);
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
  const xPositions = showOctober ? [86, 246, 406, 566, 726] : [100, 310, 520, 730];
  const chartTop = 34;
  const chartBottom = 246;
  const chartHeight = chartBottom - chartTop;
  const yForValue = value => chartBottom - (value / chartMaximum) * chartHeight;
  const pointsFor = values => values.map((value, index) => `${xPositions[index]},${yForValue(value)}`).join(" ");

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
    const month = document.getElementById(`nightMonth${index}`);
    const isVisible = index < xPositions.length;
    dot.classList.toggle("is-hidden", !isVisible);
    label.classList.toggle("is-hidden", !isVisible);
    month.classList.toggle("is-hidden", !isVisible);
    if (!isVisible) return;

    dot.setAttribute("cx", xPositions[index]);
    dot.setAttribute("cy", yForValue(value));
    label.setAttribute("x", xPositions[index]);
    label.setAttribute("y", Math.max(yForValue(value) - 15, 18));
    month.setAttribute("x", xPositions[index]);
    label.textContent = value;
  });
}

function renderSyncSummary(bookings) {
  const stats = getSyncStats(bookings);
  const summary = document.getElementById("syncSummary");
  summary.hidden = false;
  setText("lastSync", `Ultima sync: ${formatDateTimeIT(stats.lastSync)}`);
  setText("bookingSyncCount", `Booking ${stats.booking}`);
  setText("airbnbSyncCount", `Airbnb ${stats.airbnb}`);
  setText("otaSyncCount", `OTA ${stats.total}`);
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

  setText("blackSummaryCollected", euro(black.collected));
  setText("blackSummaryOverall", euro(black.overall));
  setText("whiteSummaryCollected", euro(white.collected));
  setText("whiteSummaryOverall", euro(white.overall));
  setText("totalOverall", euro(totalOverall));
  setText("blackShare", percent(blackShare));
  setText("whiteShare", percent(whiteShare));
  setProgress("blackShareBar", blackShare);
  setProgress("whiteShareBar", whiteShare);
  setText("totalCollected", euro(totalCollected));
  setText("totalTarget", euro(TARGET_TOTAL));
  setProgress("totalProgressBar", totalProgress);
  setText("totalProgressCurrent", euro(totalOverall));
  setText("totalProgressTarget", euro(TARGET_TOTAL));
  setText("totalProgressPercent", percent(totalProgress));
  setText("totalResidual", euro(totalResidual));
}

function createBookingCard(booking) {
  const card = cloneTemplate("bookingCardTemplate");
  const source = getSourcePresentation(booking.source);
  const isPaid = booking.status === "Saldato";
  const nights = getNights(booking.arrival_date, booking.departure_date) || getStoredNights(booking);

  if (isPaid) card.classList.add("is-paid");
  card.querySelector(".se-source-icon").classList.add(source.className);
  card.querySelector(".se-source-icon").textContent = source.icon;
  card.querySelector(".se-booking-name").textContent = booking.name || "-";
  card.querySelector(".se-booking-source-text").textContent = source.label;
  card.querySelector(".se-booking-details").textContent = ` · App. ${booking.apartment || "-"} · ${booking.account_type || "-"}${booking.guest_count ? ` · ${booking.guest_count} ospiti` : ""}`;
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
  const filtered = bookingSearchQuery
    ? sorted.filter(booking => [booking.name, booking.source, booking.account_type, booking.status, booking.apartment ? `app ${booking.apartment}` : "", booking.arrival_date, booking.departure_date, booking.notes].filter(Boolean).join(" ").toLowerCase().includes(bookingSearchQuery))
    : sorted;
  const container = document.getElementById("bookingList");

  if (!filtered.length) {
    container.replaceChildren(cloneTemplate("emptyStateTemplate"));
    return;
  }

  const area = cloneTemplate("bookingAreaTemplate");
  const paid = filtered.filter(booking => booking.status === "Saldato");
  const unpaid = filtered.filter(booking => booking.status !== "Saldato");
  area.querySelector(".se-booking-list-count").textContent = `${filtered.length} prenotazioni`;

  if (paid.length) {
    const section = area.querySelector(".se-paid-section");
    section.hidden = false;
    section.querySelector(".se-booking-section-count").textContent = `${paid.length} prenotazioni`;
    section.querySelector(".se-swipe-hint").hidden = paid.length < 2;
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
  button.disabled = true;
  button.textContent = loadingText;
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
      alert(`Errore Lodgify: ${result.error || result.message || result.step || "errore sconosciuto"}`);
      return null;
    }
    return result;
  } catch (error) {
    alert(`Errore Lodgify: ${error.message}`);
    return null;
  } finally {
    button.disabled = false;
    button.textContent = originalText;
    button.classList.remove("is-loading");
  }
}

async function syncLodgify() {
  const result = await callLodgifyFunction({}, document.getElementById("syncLodgify"), "Sincronizzazione...");
  if (!result) return;
  const count = Number(result.imported_or_updated || result.imported || result.updated || 0);
  alert(`Sync completata: ${count} importate/aggiornate · ${Number(result.skipped || 0)} ignorate · ${Number(result.removed || 0)} rimosse.`);
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
