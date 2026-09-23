/*
  ADMIN FRONTEND
  The backend must protect this endpoint with real authentication.
*/
const API_BASE_URL = "PASTE_YOUR_BACKEND_URL_HERE";
const adminCount = document.getElementById("adminCount");
const rows = document.getElementById("bookingRows");
const refreshButton = document.getElementById("refreshButton");
const adminMessage = document.getElementById("adminMessage");

function ready(){return API_BASE_URL && !API_BASE_URL.includes("PASTE_YOUR_BACKEND_URL_HERE");}
function msg(t){adminMessage.textContent=t;adminMessage.classList.remove("hidden");}

async function loadBookings(){
  if(!ready()){msg("Connect the secure backend URL in js/admin.js before using the admin panel.");return;}
  refreshButton.disabled=true;
  try{
    const res=await fetch(`${API_BASE_URL}/api/admin/celebrations/today`,{
      cache:"no-store",
      credentials:"include"
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.message||"Unable to load bookings.");
    const list=Array.isArray(data.bookings)?data.bookings:[];
    adminCount.textContent=list.length.toLocaleString();
    rows.innerHTML="";
    if(!list.length){
      rows.innerHTML='<tr><td colspan="9" class="empty">No paid bookings today.</td></tr>';
      return;
    }
    for(const b of list){
      const tr=document.createElement("tr");
      const cells=[
        b.bookingNumber,b.name,b.celebrationType,b.celebrating,
        Number(b.wishes||0).toLocaleString(),b.date,b.onAirTime,
        `₦${Number(b.amount||3000).toLocaleString()}`,b.reference
      ];
      for(const value of cells){
        const td=document.createElement("td");
        td.textContent=value ?? "—";
        tr.appendChild(td);
      }
      rows.appendChild(tr);
    }
    adminMessage.classList.add("hidden");
  }catch(e){
    msg(e.message||"Unable to load bookings.");
  }finally{
    refreshButton.disabled=false;
  }
}
refreshButton.addEventListener("click",loadBookings);
loadBookings();
setInterval(loadBookings,10000);
