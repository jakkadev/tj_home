/* Thale & Jacob – bryllupsside. Liten, avhengighetsfri JS. */

/* ====== INNSTILLINGER (fyll ut) ====== */
const CONFIG = {
  // Bryllupsdato (lokal tid). Brukes til nedtelling.
  weddingDate: "2027-06-05T00:00:00",
  // RSVP: URL til Google Apps Script-webappen (se oppsett-rsvp.md).
  // La stå tom så åpnes e-postprogrammet i stedet (reserveløsning).
  rsvpEndpoint: "https://script.google.com/macros/s/AKfycbx9UZGzK5DOHAXvlUnld2JbE0YxRtHaCOcF3yPZM6kwKmvcZNsUX36z5ec6UGIRfWWUcg/exec",
  // E-post som mottar svar hvis RSVP-adressen over er tom (reserveløsning).
  contactEmail: "EPOST@EKSEMPEL.NO",
  // Svarfrist som vises på RSVP-siden.
  rsvpDeadline: "[dato for svarfrist]"
};

/* ====== Meny (dropdown på mobil) ====== */
(function () {
  const btn = document.querySelector(".menu-btn");
  const nav = document.getElementById("site-nav");
  if (!btn || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.querySelector(".menu-label").textContent = open ? "Lukk" : "Meny";
  };
  btn.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });
})();

/* ====== Nedtelling ====== */
(function () {
  const el = document.getElementById("countdown");
  if (!el) return;
  const target = new Date(CONFIG.weddingDate);
  const days = Math.ceil((target - new Date()) / 86400000);
  if (days > 1) el.textContent = days + " dager igjen";
  else if (days === 1) el.textContent = "Bare 1 dag igjen";
  else if (days === 0) el.textContent = "Det er i dag!";
  else el.hidden = true;
})();

/* ====== RSVP ====== */
(function () {
  const form = document.getElementById("rsvp-form");
  if (!form) return;

  const LABELS = {
    navn: "Navn", epost: "E-post", kommer: "Kommer", antall: "Antall personer",
    andre_gjester: "Øvrige gjester", ankomst: "Ankomst", fredagsmiddag: "Middag fredag", overnatting: "Overnatting",
    allergier: "Allergier/mat", sangonske: "Sangønske", kommentar: "Kommentar"
  };

  const deadline = document.getElementById("rsvp-deadline");
  if (deadline) deadline.textContent = CONFIG.rsvpDeadline;

  const attendingFields = document.getElementById("attending-fields");
  const fridayDinner = document.getElementById("fredag-middag");
  const msg = document.getElementById("form-msg");

  const syncAttending = () => {
    const v = form.querySelector('input[name="kommer"]:checked');
    attendingFields.hidden = !(v && v.value === "ja");
    const a = form.querySelector('input[name="ankomst"]:checked');
    fridayDinner.hidden = !(a && a.value.startsWith("Fredag"));
  };
  form.addEventListener("change", syncAttending);
  syncAttending();

  const show = (text, ok) => {
    msg.textContent = text;
    msg.classList.toggle("error", ok === false);
    msg.classList.add("show");
    msg.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const missing = (data) => {
    if (!data.navn || !data.navn.trim()) return "Skriv inn navnet ditt.";
    if (!data.epost || !/^\S+@\S+\.\S+$/.test(data.epost)) return "Skriv inn en gyldig e-postadresse.";
    if (!data.kommer) return "Si fra om du kommer eller ikke.";
    if (data.kommer === "ja") {
      if (!data.ankomst) return "Velg om du kommer fredag eller lørdag.";
      if (data.ankomst.startsWith("Fredag") && !data.fredagsmiddag) return "Si fra om du vil være med på middag fredag.";
      if (!data.overnatting) return "Velg om du vil bo på hotellet eller ordner overnatting selv.";
    }
    return "";
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.querySelector(".hp input").value) return; // spam-felle
    const data = Object.fromEntries(new FormData(form).entries());
    delete data.website;
    if (data.kommer !== "ja") {
      ["antall", "andre_gjester", "ankomst", "overnatting", "allergier", "sangonske"].forEach((k) => delete data[k]);
    }

    if (!data.ankomst || !data.ankomst.startsWith("Fredag")) delete data.fredagsmiddag;

    const problem = missing(data);
    if (problem) { show(problem, false); return; }

    if (CONFIG.rsvpEndpoint) {
      try {
        // Google Apps Script svarer ikke med CORS-headere, så vi sender som
        // «text/plain» med no-cors. Vi kan da ikke lese svaret, bare se at
        // forespørselen gikk gjennom.
        await fetch(CONFIG.rsvpEndpoint, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(data)
        });
        form.reset(); syncAttending();
        show("Takk for svaret! Vi har mottatt det.", true);
      } catch (err) {
        show("Noe gikk galt ved innsending. Prøv igjen, eller send oss en melding direkte.", false);
      }
      return;
    }

    // Reserveløsning: åpne e-post med ferdig utfylt tekst
    const lines = Object.entries(data).map(([k, v]) => (LABELS[k] || k) + ": " + v);
    window.location.href = "mailto:" + CONFIG.contactEmail +
      "?subject=" + encodeURIComponent("RSVP – " + data.navn) +
      "&body=" + encodeURIComponent(lines.join("\n"));
    show("E-postprogrammet ditt åpnes med svaret ferdig utfylt. Trykk send der for å fullføre.", true);
  });
})();
