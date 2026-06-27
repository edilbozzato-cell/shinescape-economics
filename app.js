function renderBookings(bookings) {
  document.getElementById("bookingList").innerHTML = bookings.map(b => `
    ${(() => {
      const cardBg = b.status === "Saldato" ? "#143d22" : THEME.colors.cardBackground;
      return "";
    })()}
    <div onclick='editBooking(${JSON.stringify(b)})' style="background:${b.status === 'Saldato' ? '#143d22' : THEME.colors.cardBackground};margin-bottom:10px;padding:14px;border-radius:${THEME.radius.button}px;cursor:pointer;border:${b.status === 'Saldato' ? '1px solid #30d158' : '1px solid transparent'};transition:.2s;">
      <b>${b.name} ${b.status === 'Saldato' ? '✅' : ''}</b><br>
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
