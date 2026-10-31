"use strict";

(function () {
const firebaseConfig = {
apiKey: "AIzaSyA5-6nRFImuPDe-KKZV9d2zRpOICB_q9M",
authDomain: "kulzzy-radio-app.firebaseapp.com",
databaseURL: "https://kulzzy-radio-app-default-rtdb.europe-west1.firebasedatabase.app",
projectId: "kulzzy-radio-app",
storageBucket: "kulzzy-radio-app.firebasestorage.app",
messagingSenderId: "507050318850",
appId: "1:507050318850:web:f3ff3bd88e777ef656db1b",
measurementId: "G-WMZSVT4L5R"
};

const ADMIN_UID = "MaWXUVji3nTTRDav5ofv93hxlX83";
const BOOKINGS_PATH = "audiovisualBookings";

const loginCard = document.getElementById("loginCard");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const emailInput = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const message = document.getElementById("message");
const rows = document.getElementById("bookingRows");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

let auth;
let db;
let refreshTimer = null;
let loading = false;

function showMessage(text, isError = false) {
message.textContent = text;
message.style.color = isError ? "#ff9292" : "#6ee7a0";
}

function setLoggedIn(value) {
loginCard.classList.toggle("hidden", value);
dashboard.classList.toggle("hidden", !value);
}

function stopAutoRefresh() {
if (refreshTimer) {
clearInterval(refreshTimer);
refreshTimer = null;
}
}

function startAutoRefresh() {
stopAutoRefresh();
refreshTimer = setInterval(() => {
if (auth.currentUser && auth.currentUser.uid === ADMIN_UID) {
loadBookings();
}
}, 30000);
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

function formatDate(value) {
if (value === undefined || value === null || value === "") return "—";

let date;

if (typeof value === "number") {
  date = new Date(value);
} else {
  const numeric = Number(value);
  date = new Date(
    typeof value === "string" && value.trim() !== "" &&
    Number.isFinite(numeric) ? numeric : value
  );
}

if (Number.isNaN(date.getTime())) return String(value);

return date.toLocaleString("en-NG", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

}

function getPhotos(booking) {
const result = [];

if (booking.photos && !Array.isArray(booking.photos)) {
  if (booking.photos.photo1) result.push(booking.photos.photo1);
  if (booking.photos.photo2) result.push(booking.photos.photo2);
  return result;
}

if (Array.isArray(booking.photos)) return booking.photos;
if (Array.isArray(booking.images)) return booking.images;

return result;

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

function addPhotoLinks(cell, booking) {
cell.className = "photo-links";
const photos = getPhotos(booking);

if (!photos.length) {
  cell.textContent = "No pictures found";
  return;
}

photos.forEach((photo, index) => {
  const url = getPhotoUrl(photo);

  if (!url) return;

  // Display image previews when the stored value is an image URL or data URL.
  if (/^(https?:\/\/|data:image\/)/i.test(url)) {
    const img = document.createElement("img");
    img.className = "photo-thumb";
    img.src = url;
    img.alt = "Celebration picture " + (index + 1);
    img.loading = "lazy";
    img.onerror = function () {
      img.replaceWith(document.createTextNode(
        "Picture " + (index + 1) + " preview unavailable"
      ));
    };
    cell.appendChild(img);
  }

  cell.appendChild(makeLink(url, "Open picture " + (index + 1)));
  cell.appendChild(document.createElement("br"));
});

if (!cell.hasChildNodes()) {
  cell.textContent = "Picture data unavailable";
}

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

  const datesCell = document.createElement("td");
  datesCell.textContent =
    "Submitted: " + formatDate(booking.createdAt) +
    "\nCelebration: " + (booking.celebrationDate || "—");
  datesCell.style.whiteSpace = "pre-line";
  row.appendChild(datesCell);

  addCell(row, booking.bookingId || booking.id || "—");
  addCell(row, booking.customerName || "—");

  const whatsappCell = document.createElement("td");
  const phone = String(booking.whatsapp || "");
  if (phone) {
    const digits = phone.replace(/[^\d]/g, "");
    whatsappCell.appendChild(
      makeLink("https://wa.me/" + digits, phone)
    );
  } else {
    whatsappCell.textContent = "—";
  }
  row.appendChild(whatsappCell);

  addCell(row, booking.celebrantName || "—");
  addCell(row, booking.relationship || "—");
  addCell(row, booking.wish || booking.message || "—");

  const photoCell = document.createElement("td");
  addPhotoLinks(photoCell, booking);
  row.appendChild(photoCell);

  const amount = Number(
    booking.amountNgn !== undefined ? booking.amountNgn : 10000
  );
  addCell(
    row,
    "₦" + (Number.isFinite(amount) ? amount : 10000).toLocaleString("en-NG")
  );

  const statusCell = document.createElement("td");
  const status = String(booking.paymentStatus || "pending").toLowerCase();
  const statusLabel = document.createElement("div");
  statusLabel.textContent = status.toUpperCase();
  statusLabel.className = status === "paid" ? "paid" : "pending";
  statusCell.appendChild(statusLabel);

  if (status !== "paid") {
    const paidBtn = document.createElement("button");
    paidBtn.type = "button";
    paidBtn.className = "status-button";
    paidBtn.textContent = "MARK AS PAID";

    paidBtn.addEventListener("click", async () => {
      const confirmed = window.confirm(
        "Have you independently confirmed that ₦10,000 was received for booking " +
        (booking.bookingId || "this booking") +
        "?\n\nOnly continue if the payment has actually been received."
      );

      if (!confirmed) return;

      paidBtn.disabled = true;
      try {
        await db.ref(
          BOOKINGS_PATH + "/" + booking._key + "/paymentStatus"
        ).set("paid");

        showMessage("Payment status updated to PAID.");
        await loadBookings();
      } catch (error) {
        showMessage(
          "Could not update payment status: " + error.message +
          "\nCheck that the latest Firebase rules have been published.",
          true
        );
        paidBtn.disabled = false;
      }
    });

    statusCell.appendChild(paidBtn);
  }

  row.appendChild(statusCell);
  rows.appendChild(row);
});

}

async function loadBookings() {
if (loading) return;

if (!auth.currentUser || auth.currentUser.uid !== ADMIN_UID) {
  setLoggedIn(false);
  return;
}

loading = true;
refreshBtn.disabled = true;
showMessage("Loading bookings from Firebase...");

try {
  const snapshot = await db.ref(BOOKINGS_PATH).once("value");
  const bookings = [];

  snapshot.forEach(child => {
    const booking = child.val();
    if (booking && typeof booking === "object") {
      bookings.push({ ...booking, _key: child.key });
    }
  });

  bookings.sort((a, b) => {
    const aTime = Number(a.createdAt) || 0;
    const bTime = Number(b.createdAt) || 0;
    return bTime - aTime;
  });

  renderBookings(bookings);
  showMessage(
    "Bookings loaded: " + bookings.length +
    ". Last refreshed: " + new Date().toLocaleTimeString("en-NG") +
    ". Confirm payment independently before marking it PAID."
  );
} catch (error) {
  showMessage(
    "Could not load bookings from Firebase.\n" + error.message +
    "\nCheck your published Realtime Database rules and administrator account.",
    true
  );
} finally {
  loading = false;
  refreshBtn.disabled = false;
}

}

async function logout() {
stopAutoRefresh();

try {
  await auth.signOut();
} catch (_) {
  // Hide the dashboard even if sign-out encounters an error.
}

rows.replaceChildren();
setLoggedIn(false);
showMessage("You have been logged out.");

}

async function init() {
if (!window.firebase) {
showMessage("Firebase SDK failed to load. Check your internet connection.", true);
return;
}

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  auth = firebase.auth();
  db = firebase.database();

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage("Enter your administrator email and password.", true);
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = "SIGNING IN...";
    showMessage("Checking administrator credentials...");

    try {
      const credential = await auth.signInWithEmailAndPassword(email, password);

      if (!credential.user || credential.user.uid !== ADMIN_UID) {
        await auth.signOut();
        throw new Error(
          "This account is not the authorised Kulzzy Radio administrator."
        );
      }

      passwordInput.value = "";
      setLoggedIn(true);
      await loadBookings();
      startAutoRefresh();
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
  logoutBtn.addEventListener("click", logout);

  auth.onAuthStateChanged(async user => {
    if (user && user.uid === ADMIN_UID) {
      setLoggedIn(true);
      await loadBookings();
      startAutoRefresh();
    } else {
      stopAutoRefresh();
      setLoggedIn(false);
    }
  });
} catch (error) {
  showMessage("Firebase initialization failed: " + error.message, true);
}

}

init();
})();
