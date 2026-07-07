const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
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
  const roomTypeId = item.rooms?.[0]?.room_type_id || null;
  return convertLodgifyApartment(apartmentFromRoom(roomTypeId));
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

function shouldUseForDirectApartmentMatch(item: any) {
  return (
    !normalizeSource(item.source) &&
    hasValidBookedStay(item) &&
    Boolean(getLodgifyApartment(item)) &&
    Boolean(getMatchKey(item.guest?.name || "", item.arrival || null))
  );
}

function buildBooking(item: any) {
  const roomTypeId = item.rooms?.[0]?.room_type_id || null;

  return {
    external_id: String(item.id),
    external_source: item.source,
    synced_from: "Lodgify",
    last_synced_at: new Date().toISOString(),
    name: item.guest?.name || "Ospite Lodgify",
    amount: Number(item.total_amount || 0),
    account_type: "White",
    status: "Da saldare",
    deposit: 0,
    arrival_date: item.arrival || null,
    apartment: apartmentFromRoom(roomTypeId),
    source: normalizeSource(item.source),
    guest_count: item.rooms?.[0]?.people || null,
    notes: `Lodgify sync · ${item.arrival || "-"} → ${item.departure || "-"}`
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

  const response = await fetch(`${supabaseUrl}/rest/v1/bookings?on_conflict=external_id`, {
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
    throw new Error(`Supabase upsert failed ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

async function deleteBookingByExternalId(supabaseUrl: string, serviceKey: string, externalId: string) {
  const response = await fetch(`${supabaseUrl}/rest/v1/bookings?external_id=eq.${externalId}`, {
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
  const response = await fetch(
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
    throw new Error(`Supabase select failed ${response.status}: ${text}`);
  }

  const rows = text ? JSON.parse(text) : [];
  return rows
    .map((row: any) => String(row.external_id || "").trim())
    .filter(Boolean);
}

async function getBlackBookingsForApartmentMatch(supabaseUrl: string, serviceKey: string) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/bookings?select=id,name,arrival_date,apartment&account_type=eq.Black`,
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
    throw new Error(`Supabase black bookings select failed ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

async function updateBookingApartment(supabaseUrl: string, serviceKey: string, id: string, apartment: number) {
  const response = await fetch(`${supabaseUrl}/rest/v1/bookings?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({ apartment })
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Supabase apartment patch failed ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : [];
}

async function applyDirectApartmentMatches(supabaseUrl: string, serviceKey: string, directItems: any[]) {
  const apartmentByKey = new Map<string, number>();

  directItems.filter(shouldUseForDirectApartmentMatch).forEach((item: any) => {
    const key = getMatchKey(item.guest?.name || "", item.arrival || null);
    const apartment = getLodgifyApartment(item);
    if (key && apartment && !apartmentByKey.has(key)) {
      apartmentByKey.set(key, apartment);
    }
  });

  if (!apartmentByKey.size) {
    return { candidates: 0, updated: [], unmatched: [] };
  }

  const blackBookings = await getBlackBookingsForApartmentMatch(supabaseUrl, serviceKey);
  const updated = [];
  const unmatched = [...apartmentByKey.keys()];

  for (const booking of blackBookings) {
    if (Number(booking.apartment || 0)) continue;

    const key = getMatchKey(booking.name || "", booking.arrival_date || null);
    if (!key || !apartmentByKey.has(key)) continue;

    const apartment = apartmentByKey.get(key);
    if (!apartment) continue;

    await updateBookingApartment(supabaseUrl, serviceKey, String(booking.id), apartment);
    updated.push({ id: booking.id, name: booking.name, arrival_date: booking.arrival_date, apartment });

    const unmatchedIndex = unmatched.indexOf(key);
    if (unmatchedIndex >= 0) unmatched.splice(unmatchedIndex, 1);
  }

  return {
    candidates: apartmentByKey.size,
    updated,
    unmatched
  };
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
    const directListItems = listItems.filter(shouldUseForDirectApartmentMatch);
    const listBookings = validListItems.map(buildBooking);

    const existingIds = await getExistingLodgifyExternalIds(supabaseUrl, serviceKey);
    const listIds = new Set(listBookings.map((b: any) => b.external_id));

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

    const allBookings = [...listBookings, ...refreshedBookings];
    const supabaseResult = await upsertBookings(supabaseUrl, serviceKey, allBookings);
    const direct_match = await applyDirectApartmentMatches(
      supabaseUrl,
      serviceKey,
      [...directListItems, ...refreshedDirectItems]
    );

    return jsonResponse({
      success: true,
      action: "sync_completed",
      mode: "list_plus_existing_id_refresh",
      lodgify_list_total: listItems.length,
      imported_or_updated: supabaseResult.length || allBookings.length,
      imported: supabaseResult.length || allBookings.length,
      skipped: listItems.length - validListItems.length - directListItems.length,
      direct_match,
      refreshed_by_id: refreshedBookings.length,
      removed: removedIds.length,
      removed_ids: removedIds,
      refresh_errors: refreshErrors,
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
