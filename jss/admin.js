"use strict";

const API_BASE =
  "https://kulzzy-backend-core-rywavs.v2.appdeploy.ai";

const TOKEN_KEY = "kulzzyCelebrationAdminToken";

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const passwordInput = document.getElementById("adminPassword");
const message = document.getElementById("message");
const rows = document.getElementById("bookingRows");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

let refreshTimer = null;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#ff9292" : "#6ee7a0";
}

function setLoggedIn(value) {
  loginCard.classList.toggle("hidden", value);
  dashboard.classList.toggle("hidden", !value);
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

async function apiRequest(path, options = {}) {
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {}
  );

  const token = getToken();

  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const response = await fetch(API_BASE + path, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem(TOKEN_KEY);
      stopAutoRefresh();
      setLoggedIn(false);
    }

    throw new Error(
      data.error || data.message || ("Server error: " + response.status)
    );
  }

  return data;
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent =
    value === undefined || value === null || value === ""
      ? "—"
      : String(value);
  row.appendChild(cell);
  return cell;
}

function makeLink(url, label) {
  const link = document.createElement("a");
  link.href = url;
  link.textContent = label;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function getBookingList(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.bookings)) return result.bookings;
  if (Array.isArray(result.items)) return result.items;
  if (result.data && Array.isArray(result.data.bookings)) {
    return result.data.bookings;
  }
  return [];
}

function getPhotoList(booking) {
  if (Array.isArray(booking.photos)) return booking.photos;
  if (Array.isArray(booking.images)) return booking.images;
  return [];
}

function getPhotoUrl(photo) {
  if (typeof photo === "string") return photo;
  if (!photo || typeof photo !== "object") return "";

  return photo.signedUrl ||
    photo.signedURL ||
    photo.url ||
    photo.downloadUrl ||
    "";
}

function renderBookings(bookings) {
  rows.replaceChildren();

  if (!bookings.length) {
    const row = document.createElement("tr");
    const cell = addCell(row, "No bookings found.");
    cell.colSpan = 10;
    rows.appendChild(row);
    return;
  }

  bookings.forEach(booking => {
    const row = document.createElement("tr");

    addCell(
      row,
      booking.createdAt || booking.created_at || booking.date || "—"
    );

    addCell(
      row,
      booking.bookingId || booking.id || booking.reference || "—"
    );

    addCell(
      row,
      booking.customerName || booking.customer_name || booking.name || "—"
    );

    const whatsappCell = document.createElement("td");
    const phone = booking.whatsapp || booking.whatsappNumber || "";
    if (phone) {
      const waLink = makeLink(
        "https://wa.me/" + phone.replace(/[^\d]/g, ""),
        phone
      );
      whatsappCell.appendChild(waLink);
    } else {
      whatsappCell.textContent = "—";
    }
    row.appendChild(whatsappCell);

    addCell(
      row,
      booking.celebrantName || booking.celebrant || "—"
    );

    addCell(row, booking.relationship || "—");
    addCell(row, booking.wish || booking.message || "—");

    const photoCell = document.createElement("td");
    photoCell.className = "photo-links";

    const photos = getPhotoList(booking);

    if (photos.length) {
      photos.forEach((photo, index) => {
        const url = getPhotoUrl(photo);

        if (url) {
          photoCell.appendChild(
            makeLink(url, "Picture " + (index + 1))
          );
        } else {
          const span = document.createElement("span");
          span.textContent = "Picture " + (index + 1) +
            " (URL unavailable) ";
          photoCell.appendChild(span);
        }
      });
    } else {
      photoCell.textContent = "No photo links returned";
    }

    row.appendChild(photoCell);

    const amount =
      booking.amount !== undefined ? booking.amount :
      booking.amountNgn !== undefined ? booking.amountNgn : 5000;

    addCell(row, "₦" + Number(amount).toLocaleString("en-NG"));

    // Do not infer that a booking is paid just because it was submitted.
    addCell(
      row,
      booking.paymentStatus ||
      booking.payment_status ||
      "UNVERIFIED — CHECK PAYMENT"
    );

    rows.appendChild(row);
  });
}

async function loadBookings() {
  showMessage("Loading bookings...");
  refreshBtn.disabled = true;

  try {
    const result = await apiRequest(
      "/api/celebrations/admin/bookings",
      { method: "GET" }
    );

    const bookings = getBookingList(result);
    renderBookings(bookings);

    showMessage(
      "Bookings loaded: " + bookings.length +
      ". Payment status must be checked independently."
    );
  } catch (error) {
    showMessage(
      "Could not load bookings.\n" + error.message +
      "\nCheck that Backend Core is online and its admin API is configured.",
      true
    );
  } finally {
    refreshBtn.disabled = false;
  }
}

async function login(password) {
  const result = await apiRequest(
    "/api/celebrations/admin/login",
    {
      method: "POST",
      body: JSON.stringify({ password })
    }
  );

  const token =
    result.token ||
    result.accessToken ||
    (result.data && result.data.token);

  if (!token) {
    throw new Error("The server did not return an admin session token.");
  }

  sessionStorage.setItem(TOKEN_KEY, token);
}

loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const password = passwordInput.value;

  if (!password) {
    showMessage("Enter your administrator password.", true);
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "SIGNING IN...";
  showMessage("Checking administrator access...");

  try {
    await login(password);
    passwordInput.value = "";
    setLoggedIn(true);
    await loadBookings();

    stopAutoRefresh();
    refreshTimer = setInterval(() => {
      if (getToken()) loadBookings();
    }, 30000);
  } catch (error) {
    showMessage(
      "Administrator login failed.\n" + error.message,
      true
    );
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "SIGN IN";
  }
});

refreshBtn.addEventListener("click", loadBookings);

logoutBtn.addEventListener("click", async () => {
  const token = getToken();

  stopAutoRefresh();

  try {
    if (token) {
      await apiRequest(
        "/api/celebrations/admin/logout",
        { method: "POST", body: JSON.stringify({}) }
      );
    }
  } catch (_) {
    // Clear the local session even if the server is unavailable.
  }

  sessionStorage.removeItem(TOKEN_KEY);
  rows.replaceChildren();
  setLoggedIn(false);
  showMessage("You have been logged out.");
});

if (getToken()) {
  setLoggedIn(true);
  loadBookings().then(() => {
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
      if (getToken()) loadBookings();
    }, 30000);
  });
} else {
  setLoggedIn(false);
}
