"use strict";
(function () { const firebaseConfig = { apiKey: "AIzaSyA5-6nRFImuPDe-KKZV9d2zRpOICB_q9M", authDomain: "kulzzy-radio-app.firebaseapp.com", databaseURL: "https://kulzzy-radio-app-default-rtdb.europe-west1.firebasedatabase.app", projectId: "kulzzy-radio-app", storageBucket: "kulzzy-radio-app.firebasestorage.app", messagingSenderId: "507050318850", appId: "1:507050318850:web:f3ff3bd88e777ef656db1b", measurementId: "G-WMZSVT4L5R" };
const ADMIN_UID = "MaWXUVji3nTTRDav5ofv93hxlX83"; const PATH = "audiovisualBookings";
const loginCard = document.getElementById("loginCard"); const dashboard = document.getElementById("dashboard"); const loginForm = document.getElementById("loginForm"); const loginBtn = document.getElementById("loginBtn"); const emailInput = document.getElementById("adminEmail"); const passwordInput = document.getElementById("adminPassword"); const message = document.getElementById("message"); const rows = document.getElementById("bookingRows"); const refreshBtn = document.getElementById("refreshBtn"); const logoutBtn = document.getElementById("logoutBtn");
// Show login errors even while the dashboard is hidden. const loginMessage = document.createElement("p"); loginMessage.id = "loginMessage"; loginMessage.setAttribute("role", "alert"); loginMessage.style.cssText = "white-space:pre-wrap;line-height:1.6;overflow-wrap:anywhere;color:#ff9292;"; loginForm.appendChild(loginMessage);
let auth; let db; let refreshTimer = null; let loading = false;
function showMessage(text, isError = false) { const color = isError ? "#ff9292" : "#6ee7a0";
if (!dashboard || dashboard.classList.contains("hidden")) {
  loginMessage.textContent = text;
  loginMessage.style.color = color;
} else {
  message.textContent = text;
  message.style.color = color;
}
}
function setLoggedIn(value) { loginCard.classList.toggle("hidden", value); dashboard.classList.toggle("hidden", !value); }
function stopAutoRefresh() { if (refreshTimer) clearInterval(refreshTimer); refreshTimer = null; }
function startAutoRefresh() { stopAutoRefresh(); refreshTimer = setInterval(() => { if (auth.currentUser && auth.currentUser.uid === ADMIN_UID) { loadBookings(); } }, 30000); }
function addCell(row, value) { const cell = document.createElement("td"); cell.textContent = value === undefined || value === null || value === "" ? "—" : String(value); row.appendChild(cell); return cell; }
function makeLink(url, label) { const link = document.createElement("a"); link.href = url; link.textContent = label; link.target = "_blank"; link.rel = "noopener noreferrer"; return link; }
function formatDate(value) { if (value === undefined || value === null || value === "") return "—";
const date = typeof value === "number"
  ? new Date(value)
  : new Date(value);

return Number.isNaN(date.getTime())
  ? String(value)
  : date.toLocaleString("en-NG");
}
function getPhotos(booking) { if (booking.photos && !Array.isArray(booking.photos)) { return [booking.photos.photo1, booking.photos.photo2].filter(Boolean); }
if (Array.isArray(booking.photos)) return booking.photos;
if (Array.isArray(booking.images)) return booking.images;

return [];
}
function getPhotoUrl(photo) { if (typeof photo === "string") return photo; if (!photo || typeof photo !== "object") return "";
return photo.signedUrl ||
  photo.signedURL ||
  photo.url ||
  photo.downloadUrl ||
  "";
}
function addPhotos(cell, booking) { cell.className = "photo-links"; const photos = getPhotos(booking);
if (!photos.length) {
  cell.textContent = "No pictures found";
  return;
}

photos.forEach((photo, index) => {
  const url = getPhotoUrl(photo);

  if (!url) return;

  if (/^(https?:\/\/|data:image\/)/i.test(url)) {
    const img = document.createElement("img");
    img.alt = "Celebration picture " + (index + 1);
    img.style.cssText =
      "display:block;width:90px;max-height:100px;object-fit:contain;margin:5px 0;";
    img.src = url;
    img.onerror = () => {
      img.alt = "Picture preview unavailable";
      img.style.display = "none";
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
function renderBookings(bookings) { rows.replaceChildren();
if (!bookings.length) {
  const row = document.createElement("tr");
  const cell = addCell(row, "No bookings found.");
  cell.colSpan = 10;
  rows.appendChild(row);
  return;
}

bookings.forEach(booking => {
  const row = document.createElement("tr");

  const dateCell = document.createElement("td");
  dateCell.textContent =
    "Submitted: " + formatDate(booking.createdAt) +
    "\nCelebration: " + (booking.celebrationDate || "—");
  dateCell.style.whiteSpace = "pre-line";
  row.appendChild(dateCell);

  addCell(row, booking.bookingId || booking._key);
  addCell(row, booking.customerName);

  const phoneCell = document.createElement("td");
  const phone = String(booking.whatsapp || "");

  if (phone) {
    phoneCell.appendChild(
      makeLink("https://wa.me/" + phone.replace(/[^\d]/g, ""), phone)
    );
  } else {
    phoneCell.textContent = "—";
  }
  row.appendChild(phoneCell);

  addCell(row, booking.celebrantName);
  addCell(row, booking.relationship);
  addCell(row, booking.wish || booking.message || "—");

  const photoCell = document.createElement("td");
  addPhotos(photoCell, booking);
  row.appendChild(photoCell);

  const amount = Number(booking.amountNgn ?? 10000);
  addCell(
    row,
    "₦" + (Number.isFinite(amount) ? amount : 10000).toLocaleString("en-NG")
  );

  const statusCell = document.createElement("td");
  const status = String(booking.paymentStatus || "pending").toLowerCase();
  const statusText = document.createElement("strong");

  statusText.textContent = status.toUpperCase();
  statusText.style.color = status === "paid" ? "#6ee7a0" : "#ffcf70";
  statusCell.appendChild(statusText);

  if (status !== "paid") {
    const paidButton = document.createElement("button");
    paidButton.type = "button";
    paidButton.textContent = "MARK AS PAID";
    paidButton.style.cssText =
      "display:block;margin-top:8px;padding:9px;font-size:12px;";

    paidButton.addEventListener("click", async () => {
      if (!window.confirm(
        "Have you independently confirmed receipt of ₦10,000 for this booking?"
      )) return;

      paidButton.disabled = true;

      try {
        await db.ref(
          PATH + "/" + booking._key + "/paymentStatus"
        ).set("paid");

        showMessage("Payment status updated to PAID.");
        await loadBookings();
      } catch (error) {
        showMessage(
          "Unable to update payment status: " + error.message,
          true
        );
        paidButton.disabled = false;
      }
    });

    statusCell.appendChild(paidButton);
  }

  row.appendChild(statusCell);
  rows.appendChild(row);
});
}
async function loadBookings() { if (loading) return;
if (!auth.currentUser || auth.currentUser.uid !== ADMIN_UID) {
  setLoggedIn(false);
  return;
}

loading = true;
refreshBtn.disabled = true;
showMessage("Loading bookings from Firebase...");

try {
  const snapshot = await db.ref(PATH).once("value");
  const bookings = [];

  snapshot.forEach(child => {
    const value = child.val();
    if (value && typeof value === "object") {
      bookings.push({ ...value, _key: child.key });
    }
  });

  bookings.sort((a, b) =>
    (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
  );

  renderBookings(bookings);
  showMessage("Bookings loaded: " + bookings.length +
    ". Payment must be verified independently.");
} catch (error) {
  showMessage(
    "Firebase could not load bookings.\n" +
    error.message +
    "\nCheck the published database rules.",
    true
  );
} finally {
  loading = false;
  refreshBtn.disabled = false;
}
}
async function logout() { stopAutoRefresh();
try {
  await auth.signOut();
} catch (_) {}

rows.replaceChildren();
setLoggedIn(false);
loginMessage.textContent = "You have been logged out.";
loginMessage.style.color = "#6ee7a0";
}
async function init() { if (!window.firebase) { showMessage( "Firebase SDK did not load. Check your internet connection and the Firebase script tags in admin.html.", true ); return; }
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
    showMessage("Connecting to Firebase Authentication...");

    try {
      const result = await auth.signInWithEmailAndPassword(email, password);

      if (!result.user || result.user.uid !== ADMIN_UID) {
        await auth.signOut();
        throw new Error(
          "The signed-in account UID does not match the authorized administrator UID."
        );
      }

      passwordInput.value = "";
      loginMessage.textContent = "";
      setLoggedIn(true);

      await loadBookings();
      startAutoRefresh();
    } catch (error) {
      const friendlyErrors = {
        "auth/invalid-credential":
          "Email or password was not accepted. Check the Firebase account credentials.",
        "auth/user-not-found":
          "No Firebase user was found for this email.",
        "auth/wrong-password":
          "The password was not accepted.",
        "auth/too-many-requests":
          "Too many failed attempts. Wait before trying again.",
        "auth/operation-not-allowed":
          "Email/Password sign-in is not enabled in Firebase Authentication.",
        "auth/network-request-failed":
          "Network request failed. Check your internet connection."
      };

      const detail = friendlyErrors[error.code] ||
        error.message ||
        "Unknown error.";

      showMessage(
        "SIGN-IN FAILED\n" +
        (error.code ? error.code + "\n" : "") +
        detail,
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
init(); })();
