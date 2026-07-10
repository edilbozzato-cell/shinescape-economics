const FUNCTION_VERSION = "direct-import-counts-v9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(payload: unknown, status = 200) {
  const body = payload && typeof payload === "object" && !Array.isArray(payload)
    ? { function_version: FUNCTION_VERSION, ...(payload as Record<string, unknown>) }
    : payload;

  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function compactErrorText(text: string) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 360);
}

async function fetchWithRetry(url: string, options: RequestInit, attempts = 3) {
  let response: Response | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    response = await fetch(url, options);
    if (response.ok || (response.status < 500 && response.status !== 522)) return response;
    if (attempt < attempts) {
      await new Promise(resolve => setTimeout(resolve, 350 * attempt));
    }
  }

  return response as Response;
}

function normalizeSource(source: string) {
  const s = String(source || "").toLowerCase();
  if (s.includes("airbnb")) return "Airbnb";
  if (s.includes("booking")) return "Booking";
  return null;
}

function normalizeMatchText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getMatchDate(value: string | null) {
  const match = String(value || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function getMatchKey(name: string, arrival: string | null) {
  const normalizedName = normalizeMatchText(name);
  const date = getMatchDate(arrival);
  return normalizedName && date ? `${normalizedName}|${date}` : null;
}

function getGuestName(item: any) {
  const combined = [
    item.guest?.first_name,
    item.guest?.last_name
  ].filter(Boolean).join(" ");

  const rawName = (
    item.guest?.name ||
    combined ||
    item.guest_name ||
    item.customer_name ||
    item.name ||
    ""
  );

  return String(rawName)
    .replace(/\s+(?:€\s*)?(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{2})?\s*€?$/g, "")
    .trim();
}

function getArrivalDate(item: any) {
  return (
    item.arrival ||
    item.check_in ||
    item.checkin ||
    item.start_date ||
    item.rooms?.[0]?.arrival ||
    item.rooms?.[0]?.check_in ||
    null
  );
}

function getDepartureDate(item: any) {
  return (
    item.departure ||
    item.check_out ||
    item.checkout ||
    item.end_date ||
    item.rooms?.[0]?.departure ||
    item.rooms?.[0]?.check_out ||
    null
  );
}

function apartmentFromRoom(roomTypeId: number | null) {
  const map: Record<number, number> = {
    876598: 1,
    876599: 2,
    876601: 3,
    876602: 4
  };
  return roomTypeId ? map[roomTypeId] || null : null;
}

function convertLodgifyApartment(apartment: number | null) {
  const map: Record<number, number> = {
    1: 3,
    2: 2,
    3: 4,
    4: 7
  };
  return apartment ? map[apartment] || apartment : null;
}

function getLodgifyApartment(item: any) {
  const roomTypeId = item.rooms?.[0]?.room_type_id || item.room_type_id || item.roomTypeId || item.room?.room_type_id || null;
  return convertLodgifyApartment(apartmentFromRoom(roomTypeId));
}

function getLodgifyItemId(item: any) {
  return String(item.id || item.booking_id || item.reservation_id || "").trim();
}

function getBookingId(payload: any) {
  return String(
    payload?.id ||
    payload?.booking_id ||
    payload?.reservation_id ||
    payload?.booking?.id ||
    payload?.reservation?.id ||
    payload?.data?.id ||
    ""
  ).trim();
}

function hasValidBookedStay(item: any) {
  return (
    item.status === "Booked" &&
    item.is_deleted !== true &&
    item.is_unavailable !== true
  );
}

function shouldImport(item: any) {
  const source = normalizeSource(item.source);
  const amount = Number(item.total_amount || 0);

  return (
    Boolean(source) &&
    hasValidBookedStay(item) &&
    amount > 0
  );
}

function getBookingAmount(item: any) {
  const explicitAmount = Number(
    item.total_amount ||
    item.total_price ||
    item.price_total ||
    item.amount_total ||
    item.reservation_total ||
    item.total ||
    item.amount ||
    item.price ||
    item.quote?.total_amount ||
    item.quote?.total_price ||
    item.rooms?.[0]?.total_amount ||
    item.rooms?.[0]?.total_price ||
    0
  );
  if (explicitAmount > 0) return explicitAmount;

  const match = String(item.guest?.name || item.name || "").match(/(?:€\s*)?(\d{1,3}(?:[.,]\d{3})*|\d+)(?:[.,](\d{2}))?\s*€?$/);
  if (!match) return 0;

  const integerPart = match[1].replace(/\./g, "").replace(/,/g, "");
  const decimalPart = match[2] || "";
  return Number(`${integerPart}${decimalPart ? `.${decimalPart}` : ""}`) || 0;
}

function getDirectImportReadiness(directItems: any[]) {
  const candidates = directItems.filter(shouldUseForDirectApartmentMatch).map((item: any) => ({
    name: getGuestName(item),
    arrival_date: getArrivalDate(item),
    departure_date: getDepartureDate(item),
    apartment: getLodgifyApartment(item),
    amount: getBookingAmount(item),
    source: "Diretta"
  }));

  return {
    total: candidates.length,
    ready: candidates.filter(item => item.name && item.arrival_date && item.departure_date && item.apartment && item.amount > 0).length,
    missing_amount: candidates.filter(item => !item.amount).length,
    missing_departure: candidates.filter(item => !item.departure_date).length,
    examples: candidates.slice(0, 5)
  };
}

function shouldUseForDirectApartmentMatch(item: any) {
  return (
    !normalizeSource(item.source) &&
    hasValidBookedStay(item) &&
    Boolean(getLodgifyApartment(item)) &&
    Boolean(getMatchKey(getGuestName(item), getArrivalDate(item)))
  );
}

function shouldImportDirect(item: any) {
  return (
    shouldUseForDirectApartmentMatch(item) &&
    Boolean(getDepartureDate(item)) &&
    getBookingAmount(item) > 0
  );
}

function buildBooking(item: any) {
  const roomTypeId = item.rooms?.[0]?.room_type_id || null;

  return {
    external_id: String(item.id),
    external_source: item.source,
    synced_from: "Lodgify",
    last_synced_at: new Date().toISOString(),
    name: getGuestName(item) || "Ospite Lodgify",
    amount: getBookingAmount(item),
    account_type: "White",
    status: "Da saldare",
    deposit: 0,
    arrival_date: getArrivalDate(item),
    apartment: apartmentFromRoom(roomTypeId),
    source: normalizeSource(item.source),
    guest_count: item.rooms?.[0]?.people || null,
    departure_date: getDepartureDate(item),
    notes: `Lodgify sync · ${getArrivalDate(item) || "-"} → ${getDepartureDate(item) || "-"}`
  };
}

function buildDirectBooking(item: any) {
  return {
    external_id: String(item.id),
    external_source: item.source || "Diretta",
    synced_from: "Lodgify",
    last_synced_at: new Date().toISOString(),
    name: getGuestName(item) || "Ospite Lodgify",
    amount: getBookingAmount(item),
    account_type: "Black",
    status: "Da saldare",
    deposit: 0,
    arrival_date: getArrivalDate(item),
    departure_date: getDepartureDate(item),
    apartment: getLodgifyApartment(item),
    source: "Diretto",
    guest_count: item.rooms?.[0]?.people || null,
    notes: `Lodgify direct sync · ${getArrivalDate(item) || "-"} → ${getDepartureDate(item) || "-"}`
  };
}

async function fetchLodgifyBookingById(lodgifyKey: string, id: string) {
  const response = await fetch(`https://api.lodgify.com/v2/reservations/bookings/${id}`, {
    method: "GET",
    headers: {
      "X-ApiKey": lodgifyKey,
      "Accept": "application/json"
    }
  });

  const text = await response.text();

  if (!response.ok) {
    return { ok: false, status: response.status, body: text, item: null };
  }

  return { ok: true, status: response.status, body: text, item: JSON.parse(text) };
}

async function upsertBookings(supabaseUrl: string, serviceKey: string, bookings: any[]) {
  if (!bookings.length) return [];

  const response = await fetchWithRetry(`${supabaseUrl}/rest/v1/bookings?on_conflict=external_id`, {
    method: "POST",
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(bookings)
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase upsert failed ${response.status}: ${compactErrorText(text)}`);
  }

  return text ? JSON.parse(text) : [];
}

async function deleteBookingByExternalId(supabaseUrl: string, serviceKey: string, externalId: string) {
  const response = await fetchWithRetry(`${supabaseUrl}/rest/v1/bookings?external_id=eq.${externalId}`, {
    method: "DELETE",
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json"
    }
  });

  return response.ok;
}

async function getExistingLodgifyExternalIds(supabaseUrl: string, serviceKey: string) {
  const response = await fetchWithRetry(
    `${supabaseUrl}/rest/v1/bookings?select=external_id&synced_from=eq.Lodgify&external_id=not.is.null`,
    {
      method: "GET",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase select failed ${response.status}: ${compactErrorText(text)}`);
  }

  const rows = text ? JSON.parse(text) : [];
  return rows
    .map((row: any) => String(row.external_id || "").trim())
    .filter(Boolean);
}

async function getBlackBookingsForApartmentMatch(supabaseUrl: string, serviceKey: string) {
  const response = await fetchWithRetry(
    `${supabaseUrl}/rest/v1/bookings?select=id,name,arrival_date,apartment&account_type=eq.Black&apartment=is.null`,
    {
      method: "GET",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json"
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase black bookings select failed ${response.status}: ${compactErrorText(text)}`);
  }

  return text ? JSON.parse(text) : [];
}

async function getDashboardDirectStats(supabaseUrl: string, serviceKey: string) {
  const response = await fetchWithRetry(
    `${supabaseUrl}/rest/v1/bookings?select=id,name,source,account_type,arrival_date,amount,apartment&account_type=eq.Black&order=arrival_date.asc`,
    {
      method: "GET",
      headers: {
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`
      }
    }
  );
  const text = await response.text();

  if (!response.ok) {
    return {
      total: null,
      error: `Supabase dashboard direct count failed ${response.status}: ${compactErrorText(text)}`
    };
  }

  const rows = text ? JSON.parse(text) : [];
  return {
    total: rows.length,
    with_apartment: rows.filter((booking: any) => Number(booking.apartment || 0) > 0).length,
    missing_apartment: rows.filter((booking: any) => !Number(booking.apartment || 0)).length,
    examples: rows.slice(0, 5).map((booking: any) => ({
      name: booking.name,
      arrival_date: booking.arrival_date,
      amount: Number(booking.amount || 0),
      apartment: booking.apartment || null,
      source: booking.source || null
    }))
  };
}

async function updateBookingApartment(supabaseUrl: string, serviceKey: string, id: string, apartment: number) {
  const response = await fetchWithRetry(`${supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({ apartment })
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase apartment patch failed ${response.status}: ${compactErrorText(text)}`);
  }

  return true;
}

async function applyDirectApartmentMatches(supabaseUrl: string, serviceKey: string, directItems: any[]) {
  const apartmentByKey = new Map<string, number>();
  const directCandidates: any[] = [];

  directItems.filter(shouldUseForDirectApartmentMatch).forEach((item: any) => {
    const key = getMatchKey(getGuestName(item), getArrivalDate(item));
    const apartment = getLodgifyApartment(item);
    if (key && apartment && !apartmentByKey.has(key)) {
      apartmentByKey.set(key, apartment);
      directCandidates.push({
        key,
        name: getGuestName(item),
        arrival_date: getArrivalDate(item),
        departure_date: getDepartureDate(item),
        amount: getBookingAmount(item),
        apartment,
        source: "Diretta"
      });
    }
  });

  if (!apartmentByKey.size) {
    return { candidates: 0, updated: [], unmatched: [], direct_candidates: [], black_missing_apartment: [] };
  }

  let blackBookings = [];
  let blackSelectError = null;

  try {
    blackBookings = await getBlackBookingsForApartmentMatch(supabaseUrl, serviceKey);
  } catch (error) {
    blackSelectError = String(error);
  }

  if (blackSelectError) {
    return {
      candidates: apartmentByKey.size,
      updated: [],
      update_errors: [],
      unmatched: [...apartmentByKey.keys()],
      direct_candidates: directCandidates,
      black_missing_apartment: [],
      select_error: blackSelectError
    };
  }

  const updated = [];
  const updateErrors = [];
  const unmatched = [...apartmentByKey.keys()];
  const blackMissingApartment = blackBookings
    .filter((booking: any) => !Number(booking.apartment || 0))
    .map((booking: any) => ({
      key: getMatchKey(booking.name || "", booking.arrival_date || null),
      name: booking.name,
      arrival_date: booking.arrival_date
    }))
    .filter((booking: any) => booking.key);

  for (const booking of blackBookings) {
    if (Number(booking.apartment || 0)) continue;

    const key = getMatchKey(booking.name || "", booking.arrival_date || null);
    if (!key || !apartmentByKey.has(key)) continue;

    const apartment = apartmentByKey.get(key);
    if (!apartment) continue;

    try {
      await updateBookingApartment(supabaseUrl, serviceKey, String(booking.id), apartment);
      updated.push({ id: booking.id, name: booking.name, arrival_date: booking.arrival_date, apartment });
    } catch (error) {
      updateErrors.push({
        id: booking.id,
        name: booking.name,
        arrival_date: booking.arrival_date,
        apartment,
        error: String(error).slice(0, 400)
      });
      continue;
    }

    const unmatchedIndex = unmatched.indexOf(key);
    if (unmatchedIndex >= 0) unmatched.splice(unmatchedIndex, 1);
  }

  return {
    candidates: apartmentByKey.size,
    updated,
    update_errors: updateErrors,
    unmatched,
    direct_candidates: directCandidates,
    black_missing_apartment: blackMissingApartment
  };
}

async function fetchDetailedDirectItems(lodgifyKey: string, items: any[]) {
  const detailedItems = [];
  const errors = [];

  for (const item of items) {
    const id = getLodgifyItemId(item);
    if (!id) continue;

    const result = await fetchLodgifyBookingById(lodgifyKey, id);
    if (result.ok) {
      detailedItems.push(result.item);
    } else {
      errors.push({ id, status: result.status });
    }
  }

  return { detailedItems, errors };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const lodgifyKey = Deno.env.get("LODGIFY_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SHINESCAPE_SERVICE_KEY");

    if (!lodgifyKey || !supabaseUrl || !serviceKey) {
      return jsonResponse({
        success: false,
        error: "Missing secrets",
        hasLodgifyKey: Boolean(lodgifyKey),
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceKey: Boolean(serviceKey)
      }, 500);
    }

    let payload: any = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    const bookingId = getBookingId(payload);

    if (bookingId) {
      const result = await fetchLodgifyBookingById(lodgifyKey, bookingId);

      if (!result.ok) {
        return jsonResponse({
          success: false,
          step: "lodgify_fetch_by_id",
          bookingId,
          status: result.status,
          body: result.body
        }, 500);
      }

      const item = result.item;

      if (shouldUseForDirectApartmentMatch(item)) {
        const direct_match = await applyDirectApartmentMatches(supabaseUrl, serviceKey, [item]);

        return jsonResponse({
          success: true,
          action: "direct_apartment_matched",
          bookingId,
          direct_match
        });
      }

      if (!shouldImport(item)) {
        const removed = await deleteBookingByExternalId(supabaseUrl, serviceKey, bookingId);

        return jsonResponse({
          success: true,
          action: "skipped_or_removed",
          bookingId,
          removed_from_supabase: removed,
          reason: {
            source: normalizeSource(item.source),
            status: item.status,
            is_deleted: item.is_deleted,
            is_unavailable: item.is_unavailable,
            amount: Number(item.total_amount || 0)
          }
        });
      }

      const booking = buildBooking(item);
      const supabase = await upsertBookings(supabaseUrl, serviceKey, [booking]);

      return jsonResponse({
        success: true,
        action: "imported_or_updated",
        bookingId,
        booking,
        supabase
      });
    }

    const listResponse = await fetch("https://api.lodgify.com/v2/reservations/bookings", {
      method: "GET",
      headers: {
        "X-ApiKey": lodgifyKey,
        "Accept": "application/json"
      }
    });

    const listText = await listResponse.text();

    if (!listResponse.ok) {
      return jsonResponse({
        success: false,
        step: "lodgify_list",
        status: listResponse.status,
        body: listText
      }, 500);
    }

    const listData = JSON.parse(listText);
    const listItems = Array.isArray(listData.items) ? listData.items : [];

    const validListItems = listItems.filter(shouldImport);
    const directListCandidates = listItems.filter((item: any) => !normalizeSource(item.source) && hasValidBookedStay(item));
    const directDetails = await fetchDetailedDirectItems(lodgifyKey, directListCandidates);
    const directListItems = directDetails.detailedItems.filter(shouldUseForDirectApartmentMatch);
    const shouldImportDirectBookings = payload?.import_direct === true;
    const directBookings = shouldImportDirectBookings
      ? directListItems.filter(shouldImportDirect).map(buildDirectBooking)
      : [];
    const listBookings = validListItems.map(buildBooking);

    const existingIds = await getExistingLodgifyExternalIds(supabaseUrl, serviceKey);
    const listIds = new Set([...listBookings, ...directBookings].map((b: any) => b.external_id));

    const idsToRefresh = existingIds.filter(id => !listIds.has(id));

    const refreshedBookings = [];
    const removedIds = [];
    const refreshErrors = [];
    const refreshedDirectItems = [];

    for (const id of idsToRefresh) {
      const result = await fetchLodgifyBookingById(lodgifyKey, id);

      if (!result.ok) {
        refreshErrors.push({ id, status: result.status });
        continue;
      }

      if (shouldUseForDirectApartmentMatch(result.item)) {
        refreshedDirectItems.push(result.item);
      } else if (shouldImport(result.item)) {
        refreshedBookings.push(buildBooking(result.item));
      } else {
        const removed = await deleteBookingByExternalId(supabaseUrl, serviceKey, id);
        if (removed) removedIds.push(id);
      }
    }

    const allBookings = [...listBookings, ...directBookings, ...refreshedBookings];
    const supabaseResult = await upsertBookings(supabaseUrl, serviceKey, allBookings);
    const direct_match = await applyDirectApartmentMatches(
      supabaseUrl,
      serviceKey,
      [...directListItems, ...refreshedDirectItems]
    );
    const direct_readiness = getDirectImportReadiness([...directListItems, ...refreshedDirectItems]);
    const dashboard_direct = await getDashboardDirectStats(supabaseUrl, serviceKey);

    return jsonResponse({
      success: true,
      action: "sync_completed",
      mode: "list_plus_existing_id_refresh",
      lodgify_list_total: listItems.length,
      imported_or_updated: supabaseResult.length || allBookings.length,
      imported: supabaseResult.length || allBookings.length,
      skipped: listItems.length - validListItems.length - directListItems.length,
      direct_match,
      direct_readiness,
      dashboard_direct,
      direct_import_enabled: shouldImportDirectBookings,
      direct_imported: directBookings.length,
      refreshed_by_id: refreshedBookings.length,
      removed: removedIds.length,
      removed_ids: removedIds,
      refresh_errors: [...refreshErrors, ...directDetails.errors],
      imported_ids: allBookings.map((b: any) => b.external_id)
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      step: "unexpected",
      error: String(error)
    }, 500);
  }
});
