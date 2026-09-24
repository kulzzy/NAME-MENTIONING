/*
  GITHUB PAGES FRONTEND

  IMPORTANT:
  GitHub Pages cannot securely verify payments or store live bookings.
  Put your real KULZZY CLOUD CORE backend URL below.
  Never put a secret Flutterwave key in this file.
*/
const API_BASE_URL = "https://kulzzy-cloud-core-jzh19i.v2.appdeploy.ai";

const form = document.getElementById("bookingForm");
const message = document.getElementById("message");
const bookedCount = document.getElementById("bookedCount");
const payButton = document.getElementById("payButton");
const dateInput = document.getElementById("date");
const success = document.getElementById("success");
const newBooking = document.getElementById("newBooking");

function lagosToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos"
  }).format(new Date());
}

function showMessage(text) {
  message.textContent = text;
  message.classList.remove("hidden");
}

function clearMessage() {
  message.textContent = "";
  message.classList.add("hidden");
}

function apiReady() {
  return (
    API_BASE_URL &&
    !API_BASE_URL.includes("PASTE_YOUR_BACKEND_URL_HERE")
  );
}

async function getTodayCount() {
  if (!apiReady()) return;

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/celebrations/today`,
      {
        cache: "no-store"
      }
    );

    if (!res.ok) throw new Error();

    const data = await res.json();

    bookedCount.textContent = Number(
      data.bookedCount || 0
    ).toLocaleString();

  } catch (e) {
    // Keep page usable if backend is temporarily unavailable.
  }
}

function setToday() {
  const today = lagosToday();

  dateInput.value = today;
  dateInput.min = today;
  dateInput.max = today;
}

setToday();
getTodayCount();

setInterval(getTodayCount, 15000);


/*
  PREVENT DATE CHANGES

  The date is automatically today's Lagos date.
*/
dateInput.addEventListener("change", () => {
  const today = lagosToday();

  if (dateInput.value !== today) {
    dateInput.value = today;

    showMessage(
      "Celebration bookings are accepted for today only."
    );
  }
});


/*
  CREATE PAYMENT
*/
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  clearMessage();

  const today = lagosToday();

  const data = {
    name: document.getElementById("name").value.trim(),

    celebrationType:
      document.getElementById("celebrationType").value,

    celebrating:
      document.getElementById("celebrating").value,

    date: dateInput.value,

    amount: 3000
  };


  /*
    VALIDATION
  */

  if (!data.name) {
    return showMessage(
      "Please enter the name to mention on-air."
    );
  }

  if (!data.celebrationType) {
    return showMessage(
      "Please select a celebration type."
    );
  }

  if (!data.celebrating) {
    return showMessage(
      "Please select who you are celebrating."
    );
  }

  if (data.date !== today) {
    return showMessage(
      "Celebration bookings are accepted for today only."
    );
  }


  /*
    CHECK BACKEND CONNECTION
  */

  if (!apiReady()) {
    return showMessage(
      "The secure payment server has not been connected yet."
    );
  }


  /*
    START PAYMENT
  */

  payButton.disabled = true;
  payButton.textContent = "PREPARING PAYMENT...";

  try {

    const res = await fetch(
      `${API_BASE_URL}/api/celebrations/create`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(data)
      }
    );


    const result = await res.json();


    if (!res.ok) {
      throw new Error(
        result.message ||
        "Unable to start payment."
      );
    }


    if (!result.paymentLink) {
      throw new Error(
        "Payment link was not returned by the server."
      );
    }


    /*
      SEND CUSTOMER TO FLUTTERWAVE
    */

    window.location.href = result.paymentLink;


  } catch (err) {

    showMessage(
      err.message ||
      "Unable to start payment. Please try again."
    );

    payButton.disabled = false;

    payButton.textContent =
      "MAKE MY PAYMENT — ₦3,000";
  }
});


/*
  BOOK ANOTHER CELEBRATION
*/

newBooking.addEventListener("click", () => {

  success.classList.add("hidden");

  form.reset();

  setToday();

  clearMessage();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

});


/*
  VERIFY RETURNED PAYMENT
*/

async function verifyReturnedPayment() {

  const params = new URLSearchParams(
    location.search
  );

  const ref =
    params.get("tx_ref") ||
    params.get("transaction_id");

  const status =
    params.get("status");


  /*
    No payment return information.
  */

  if (!ref || !status) {
    return;
  }


  /*
    Backend must be connected.
  */

  if (!apiReady()) {

    showMessage(
      "Payment return detected, but the secure booking server is not connected yet."
    );

    return;
  }


  payButton.disabled = true;

  try {

    const res = await fetch(
      `${API_BASE_URL}/api/celebrations/verify?reference=${encodeURIComponent(ref)}`,
      {
        cache: "no-store"
      }
    );


    const result = await res.json();


    if (!res.ok || !result.paid) {

      throw new Error(
        result.message ||
        "Payment could not be verified."
      );

    }


    /*
      PAYMENT VERIFIED
    */

    document.getElementById(
      "resultNumber"
    ).textContent =
      result.bookingNumber || "—";


    document.getElementById(
      "resultTime"
    ).textContent =
      result.onAirTime || "—";


    form.classList.add("hidden");

    success.classList.remove("hidden");


    bookedCount.textContent =
      Number(
        result.bookedCount || 0
      ).toLocaleString();


    /*
      Remove payment parameters
      from browser address bar.
    */

    history.replaceState(
      {},
      document.title,
      location.pathname
    );


  } catch (err) {

    showMessage(
      err.message ||
      "Payment verification failed."
    );

  } finally {

    payButton.disabled = false;

  }
}


verifyReturnedPayment();
