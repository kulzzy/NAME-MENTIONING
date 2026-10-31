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
const PATH = "audiovisualBookings";
const LOGIN_TIMEOUT_MS = 15000;
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
if (
!loginCard || !dashboard || !loginForm || !loginBtn ||
!emailInput || !passwordInput || !message || !rows ||
!refreshBtn || !logoutBtn
) {
console.error("Admin panel HTML is missing required element IDs.");
return;
}
let loginMessage = document.getElementById("loginMessage");
if (!loginMessage) {
loginMessage = document.createElement("p");
loginMessage.id = "loginMessage";
loginMessage.setAttribute("role", "alert");
loginMessage.style.cssText =
"white-space:pre-wrap;line-height:1.6;overflow-wrap:anywhere;color:#ff9292;";
loginForm.appendChild(loginMessage);
}
let auth;
let db;
let refreshTimer = null;
let loading = false;
let loginInProgress = false;
let authListenerReady = false;
function showMessage(text, isError = false) {
const color = isError ? "#ff9292" : "#6ee7a0";
if (dashboard.classList.contains("hidden")) {
  loginMessage.textContent = text;
  loginMessage.style.color = color;
} else {
  message.textContent = text;
  message.style.color = color;
}

}
function setLoggedIn(value) {
loginCard.classList.toggle("hidden", value);
dashboard.classList.toggle("hidden", !value);
}
function stopAutoRefresh() {
if (refreshTimer) clearInterval(refreshTimer);
refreshTimer = null;
}
function startAutoRefresh() {
stopAutoRefresh();
refreshTimer = setInterval(function () {
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
if (value === undefined || value === null || value === "") {
return "—";
}
const date = new Date(value);

return Number.isNaN(date.getTime())
  ? String(value)
  : date.toLocaleString("en-NG");

}
function getPhotos(booking) {
if (booking.photos && !Array.isArray(booking.photos)) {
return [
booking.photos.photo1,
booking.photos.photo2
].filter(Boolean);
}
if (Array.isArray(booking.photos)) return booking.photos;
if (Array.isArray(booking.images)) return booking.images;

return [];

}
function getPhotoUrl(photo) {
if (typeof photo === "string") return photo;
if (!photo || typeof photo !== "object") return "";
return (
  photo.signedUrl ||
  photo.signedURL ||
  photo.url ||
  photo.downloadUrl ||
  ""
);

}
function getFileExtension(url, contentType) {
const type = String(contentType || "").toLowerCase();
if (type.includes("png")) return "png";
if (type.includes("webp")) return "webp";
if (type.includes("gif")) return "gif";
if (type.includes("jpeg") || type.includes("jpg")) return "jpg";

const dataMatch = String(url).match(/^data:image\/([^;,]+)/i);

if (dataMatch) {
  const format = dataMatch[1].toLowerCase();
  if (format === "jpeg") return "jpg";
  if (["png", "webp", "gif"].includes(format)) return format;
}

try {
  const pathname = new URL(url, window.location.href).pathname;
  const match = pathname.match(/\.([a-z0-9]{3,5})$/i);

  if (match && ["jpg", "jpeg", "png", "webp", "gif"].includes(match[1].toLowerCase())) {
    return match[1].toLowerCase() === "jpeg"
      ? "jpg"
      : match[1].toLowerCase();
  }
} catch (_) {}

return "jpg";

}
function triggerDownload(blob, filename) {
const objectUrl = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = objectUrl;
link.download = filename;
link.style.display = "none";

document.body.appendChild(link);
link.click();
link.remove();

setTimeout(function () {
  URL.revokeObjectURL(objectUrl);
}, 60000);

}
async function downloadPhoto(url, index, button) {
if (!url) {
showMessage("This picture does not have a valid image URL.", true);
return;
}
const originalText = button.textContent;
button.disabled = true;
button.textContent = "PREPARING DOWNLOAD...";

try {
  const filename =
    "Kulzzy-Radio-Celebration-Picture-" +
    index +
    "." +
    getFileExtension(url);

  if (/^data:image\//i.test(url)) {
    const response = await fetch(url);
    const blob = await response.blob();

    triggerDownload(
      blob,
      "Kulzzy-Radio-Celebration-Picture-" +
        index +
        "." +
        getFileExtension(url, blob.type)
    );

    showMessage("Picture download started: " + filename);
    return;
  }

  if (!/^https?:\/\//i.test(url)) {
    throw new Error("This picture URL is not supported for downloading.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(function () {
    controller.abort();
  }, 20000);

  let response;

  try {
    response = await fetch(url, {
      mode: "cors",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error("The picture server returned HTTP " + response.status + ".");
  }

  const blob = await response.blob();

  if (!blob.size) {
    throw new Error("The downloaded picture file is empty.");
  }

  triggerDownload(
    blob,
    "Kulzzy-Radio-Celebration-Picture-" +
      index +
      "." +
      getFileExtension(url, blob.type)
  );

  showMessage("Picture download started. Check your Downloads folder.");
} catch (error) {
  console.warn("Direct picture download failed:", error);

  showMessage(
    "The website hosting this picture blocked direct downloading, or the connection failed. " +
    "The picture will open in a new tab so you can use your browser's Save Image or Download option.",
    true
  );

  const fallback = document.createElement("a");
  fallback.href = url;
  fallback.target = "_blank";
  fallback.rel = "noopener noreferrer";
  fallback.click();
} finally {
  button.disabled = false;
  button.textContent = originalText;
}

}
function addPhotos(cell, booking) {
cell.className = "photo-links";
const photos = getPhotos(booking);

if (!photos.length) {
  cell.textContent = "No pictures found";
  return;
}

photos.forEach(function (photo, index) {
  const url = getPhotoUrl(photo);

  if (!url) return;

  const wrapper = document.createElement("div");
  wrapper.style.cssText =
    "margin:8px 0 14px;padding:8px;border:1px solid #d6b84a;border-radius:8px;max-width:180px;";

  if (/^(https?:\/\/|data:image\/)/i.test(url)) {
    const img = document.createElement("img");

    img.alt = "Celebration picture " + (index + 1);
    img.style.cssText =
      "display:block;width:100%;max-width:160px;max-height:160px;object-fit:contain;margin:0 auto 8px;";
    img.src = url;

    img.onerror = function () {
      img.alt = "Picture preview unavailable";
      img.style.display = "none";
    };

    wrapper.appendChild(img);
  }

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "⬇ SAVE PICTURE";
  saveButton.style.cssText =
    "display:block;width:100%;margin:6px 0;padding:10px 8px;background:#ffd700;color:#06122a;border:0;border-radius:6px;font-weight:bold;cursor:pointer;";

  saveButton.addEventListener("click", function () {
    downloadPhoto(url, index + 1, saveButton);
  });

  wrapper.appendChild(saveButton);

  const openLink = makeLink(url, "OPEN PICTURE");
  openLink.style.cssText =
    "display:block;text-align:center;margin-top:8px;overflow-wrap:anywhere;";

  wrapper.appendChild(openLink);
  cell.appendChild(wrapper);
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

bookings.forEach(function (booking) {
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
      makeLink(
        "https://wa.me/" + phone.replace(/[^\d]/g, ""),
        phone
      )
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
    "₦" +
      (Number.isFinite(amount) ? amount : 10000)
        .toLocaleString("en-NG")
  );

  const statusCell = document.createElement("td");
  const status = String(
    booking.paymentStatus || "pending"
  ).toLowerCase();

  const statusText = document.createElement("strong");
  statusText.textContent = status.toUpperCase();
  statusText.style.color =
    status === "paid" ? "#6ee7a0" : "#ffcf70";

  statusCell.appendChild(statusText);

  if (status !== "paid") {
    const paidButton = document.createElement("button");

    paidButton.type = "button";
    paidButton.textContent = "MARK AS PAID";
    paidButton.style.cssText =
      "display:block;margin-top:8px;padding:9px;font-size:12px;";

    paidButton.addEventListener("click", async function () {
      if (!window.confirm(
        "Have you independently confirmed receipt of ₦10,000 for this booking?"
      )) {
        return;
      }

      paidButton.disabled = true;

      try {
        await db.ref(
          PATH + "/" + booking._key + "/paymentStatus"
        ).set("paid");

        showMessage("Payment status updated to PAID.");
        await loadBookings();
      } catch (error) {
        showMessage(
          "Unable to update payment status:\n" +
            friendlyFirebaseError(error),
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
function friendlyFirebaseError(error) {
const code = error && error.code ? error.code : "";
const messages = {
  "auth/invalid-credential":
    "The email or password was not accepted. Check the Firebase account credentials.",
  "auth/invalid-login-credentials":
    "The email or password was not accepted. Check the Firebase account credentials.",
  "auth/user-not-found":
    "No Firebase user was found for this email.",
  "auth/wrong-password":
    "The password was not accepted.",
  "auth/too-many-requests":
    "Too many failed attempts. Wait before trying again.",
  "auth/operation-not-allowed":
    "Email/Password sign-in is not enabled in Firebase Authentication.",
  "auth/network-request-failed":
    "The network request failed. Check your internet connection.",
  "auth/unauthorized-domain":
    "Add kulzzy.github.io under Firebase Authentication → Settings → Authorized domains.",
  "auth/invalid-api-key":
    "Firebase rejected the API key. Check the Firebase configuration.",
  "auth/app-not-authorized":
    "This website is not authorised to use this Firebase project.",
  "PERMISSION_DENIED":
    "Firebase denied access. Check the published Realtime Database rules."
};

if (error && error.code === "LOGIN_TIMEOUT") {
  return (
    "Firebase did not respond within 15 seconds. Check your connection " +
    "and Firebase Authentication settings."
  );
}

if (messages[code]) return messages[code];

return (
  (code ? code + ": " : "") +
  (error && error.message
    ? error.message
    : "An unknown error occurred.")
);

}
function signInWithTimeout(email, password) {
return new Promise(function (resolve, reject) {
let finished = false;
  const timer = setTimeout(function () {
    if (finished) return;

    finished = true;

    const error = new Error(
      "Firebase sign-in timed out after 15 seconds."
    );

    error.code = "LOGIN_TIMEOUT";
    reject(error);
  }, LOGIN_TIMEOUT_MS);

  auth.signInWithEmailAndPassword(email, password)
    .then(function (result) {
      if (finished) return;

      finished = true;
      clearTimeout(timer);
      resolve(result);
    })
    .catch(function (error) {
      if (finished) return;

      finished = true;
      clearTimeout(timer);
      reject(error);
    });
});

}
async function loadBookings() {
if (loading) return;
if (
  !auth.currentUser ||
  auth.currentUser.uid !== ADMIN_UID
) {
  setLoggedIn(false);
  return;
}

loading = true;
refreshBtn.disabled = true;
showMessage("Loading bookings from Firebase...");

try {
  const snapshot = await db.ref(PATH).once("value");
  const bookings = [];

  snapshot.forEach(function (child) {
    const value = child.val();

    if (value && typeof value === "object") {
      bookings.push({
        ...value,
        _key: child.key
      });
    }
  });

  bookings.sort(function (a, b) {
    return (
      (Number(b.createdAt) || 0) -
      (Number(a.createdAt) || 0)
    );
  });

  renderBookings(bookings);

  showMessage(
    "Bookings loaded: " +
      bookings.length +
      ". Verify payments independently."
  );
} catch (error) {
  showMessage(
    "Firebase could not load bookings.\n" +
      friendlyFirebaseError(error) +
      "\nCheck the published database rules.",
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
} catch (error) {
  console.error("Sign-out error:", error);
}

rows.replaceChildren();
setLoggedIn(false);

loginMessage.textContent = "You have been logged out.";
loginMessage.style.color = "#6ee7a0";

}
async function init() {
if (!window.firebase) {
showMessage(
"Firebase SDK did not load. Check your internet connection and Firebase script tags in admin.html.",
true
);
return;
}
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  auth = firebase.auth();
  db = firebase.database();

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (loginInProgress) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage(
        "Enter your administrator email and password.",
        true
      );
      return;
    }

    loginInProgress = true;
    loginBtn.disabled = true;
    loginBtn.textContent = "SIGNING IN...";
    showMessage("Connecting to Firebase Authentication...");

    try {
      const result = await signInWithTimeout(email, password);

      if (!result.user || result.user.uid !== ADMIN_UID) {
        await auth.signOut();

        const error = new Error(
          "The signed-in account UID does not match the authorised administrator UID."
        );

        error.code = "ADMIN_UID_MISMATCH";
        throw error;
      }

      passwordInput.value = "";
      loginMessage.textContent = "";
      setLoggedIn(true);

      await loadBookings();
      startAutoRefresh();
    } catch (error) {
      showMessage(
        "SIGN-IN FAILED\n" + friendlyFirebaseError(error),
        true
      );
    } finally {
      loginInProgress = false;
      loginBtn.disabled = false;
      loginBtn.textContent = "SIGN IN";
    }
  });

  refreshBtn.addEventListener("click", loadBookings);
  logoutBtn.addEventListener("click", logout);

  auth.onAuthStateChanged(async function (user) {
    if (user && user.uid === ADMIN_UID) {
      setLoggedIn(true);
      loginMessage.textContent = "";

      if (!authListenerReady) {
        authListenerReady = true;
        await loadBookings();
        startAutoRefresh();
      }
    } else {
      authListenerReady = false;
      stopAutoRefresh();
      setLoggedIn(false);
    }
  });
} catch (error) {
  showMessage(
    "Firebase initialization failed:\n" +
      friendlyFirebaseError(error),
    true
  );
}

}
init();
})();
