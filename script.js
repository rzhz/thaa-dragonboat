// The maxSlots need to be updated to change the maximum number of sign-ups each time.
// Everytime the eventDate is updated, it creates a new sheet in the same Excel file.
// --- Configuration & Event Details ---
const apiUrl = 'https://script.google.com/macros/s/AKfycbyLYPNnQbwUg7YPpJJgXG3Th2jFP2ocB_5Gekbe8aYEVwNSFls7cYEihC9jEk1_9trT/exec';
const maxSlots = 40;
const eventDate = '20250502';  // Must match the sheet name for the event
const eventTime = '6:00-8:00pm';
const trainingQuota = 8;
const eventLocation = 'Fort Point Pier, 21 Wormwood St #215, Boston, MA 02210 (参考下图dock)';
//const eventLocation = 'MIT E51 (Tang Center), Cambridge, MA (从停车场的角落的门进去更方便被队友看到给你开门）';


// Set event details in the HTML
const eventDateObj = new Date(
  parseInt(eventDate.slice(0, 4)),
  parseInt(eventDate.slice(4, 6)) - 1,
  parseInt(eventDate.slice(6, 8))
);
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const formattedEventDate = eventDateObj.toLocaleDateString(undefined, options);
document.getElementById('eventDate').textContent = formattedEventDate;
document.getElementById('eventTime').textContent = eventTime;
document.getElementById('eventLocation').textContent = eventLocation;

// --- Helpers for localStorage per session ---
function getMySignups(sessionDate) {
  const key = `mySignups_${sessionDate}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}
function saveMySignups(sessionDate, list) {
  localStorage.setItem(`mySignups_${sessionDate}`, JSON.stringify(list));
}

// --- Fetch & Display for one session ---
async function fetchSession(session) {
  const { key, date } = session;
  const res = await fetch(`${apiUrl}?action=get&date=${date}`);
  const signups = await res.json();
  updateSessionDisplay(session, signups);
}

async function signUpSession(session) {
  const { key, date } = session;
  // load state
  const loadedFlag = window[`signupsLoaded${key}`];
  if (!loadedFlag) return alert('Wait for list to load.');

  const nameEl = document.getElementById(`name${key}`);
  const handEl = document.getElementById(`hand${key}`);
  const trainEl = document.getElementById(`training${key}`);
  const waiverEl = document.getElementById(`waiverCheck${key}`);

  const name = nameEl.value.trim(),
        hand = handEl.value,
        training = trainEl.checked ? 'Yes' : 'No';

  if (!name || !hand || !waiverEl.checked) 
    return alert('Complete name, hand & waiver.');

  const myList = getMySignups(date);
  if (myList.includes(name)) 
    return alert('Already signed up from this device.');

  // check training quota
  const currentCount = Array.from(
    document.querySelectorAll(`#signupList${key} li`)
  ).filter(li=>li.textContent.includes('[1v1]')).length;
  if (training==='Yes' && currentCount >= trainingQuota)
    return alert('1v1 quota reached.');

  // send to server
  const url = `${apiUrl}?action=signup` +
              `&name=${encodeURIComponent(name)}` +
              `&hand=${encodeURIComponent(hand)}` +
              `&training=${encodeURIComponent(training)}` +
              `&date=${date}`;
  const res = await fetch(url);
  const signups = await res.json();

  myList.push(name);
  saveMySignups(date, myList);
  updateSessionDisplay(session, signups);
}

async function removeSessionSignup(session, name) {
  const { key, date } = session;
  const myList = getMySignups(date);
  if (!myList.includes(name))
    return alert("Can't remove—didn't sign up from this device.");

  const res = await fetch(`${apiUrl}?action=remove&name=${encodeURIComponent(name)}&date=${date}`);
  const signups = await res.json();
  const newList = myList.filter(n=>n!==name);
  saveMySignups(date,newList);
  updateSessionDisplay(session, signups);
}

// --- Render the list & slots for one session ---
function updateSessionDisplay(session, signups) {
  const { key, date, time } = session;
  // mark loaded
  window[`signupsLoaded${key}`] = true;

  // place date/time/location
  const dateObj = new Date(
    parseInt(date.slice(0,4)),
    parseInt(date.slice(4,6))-1,
    parseInt(date.slice(6,8))
  );
  document.getElementById(`eventDate${key}`).textContent =
    dateObj.toLocaleDateString(undefined,{ weekday:'long', year:'numeric', month:'long', day:'numeric' });
  document.getElementById(`eventTime${key}`).textContent = time;
  document.getElementById(`eventLocation${key}`).textContent = eventLocation;

  // slots
  document.getElementById(`remainingSlots${key}`).textContent =
    Math.max(0, maxSlots - signups.length);

  // training slots
  const trainCount = signups.filter(s=>s.training==='Yes').length;
  document.getElementById(`trainingSlots${key}`).textContent =
    `1v1 Training Available: ${trainingQuota - trainCount} / ${trainingQuota}`;

  // render list
  const listEl = document.getElementById(`signupList${key}`);
  listEl.innerHTML = '';
  const myList = getMySignups(date);

  signups.forEach(({name,hand,training})=>{
    const li = document.createElement('li');
    li.className = 'signup-item';
    let txt = `${name} (${hand})`;
    if (training==='Yes') txt += ' [1v1]';
    const span = document.createElement('span'); span.textContent = txt;
    li.appendChild(span);
    if (myList.includes(name)) {
      const btn = document.createElement('button');
      btn.className = 'remove-button';
      btn.textContent = 'Remove';
      btn.onclick = ()=> removeSessionSignup(session,name);
      li.appendChild(btn);
    }
    listEl.appendChild(li);
  });

  // clear inputs & disable if needed
  document.getElementById(`signUpBtn${key}`).disabled = signups.length >= maxSlots;
  ['name','hand','training','waiverCheck'].forEach(id=>{
    const el = document.getElementById(id+key);
    if (el) {
      if (el.type==='checkbox'||el.tagName==='SELECT') el.checked=false, el.value='';
      else el.value='';
    }
  });
}

// --- Form Validation per session ---
function validateInputs(key) {
  const name = document.getElementById(`name${key}`).value.trim();
  const hand = document.getElementById(`hand${key}`).value;
  const waiver = document.getElementById(`waiverCheck${key}`).checked;
  const btn = document.getElementById(`signUpBtn${key}`);
  const ok = name!=='' && hand!=='' && waiver;
  btn.disabled = !ok;
  btn.style.backgroundColor = ok? '#4CAF50':'#ccc';
}

// --- Hook everything up on load ---
window.onload = () => {
  sessions.forEach(s => {
    // fetch & render
    fetchSession(s);
    // attach signup click
    document.getElementById(`signUpBtn${s.key}`).onclick = ()=> signUpSession(s);
    // attach input validators
    ['name','hand','waiverCheck'].forEach(id=>{
      document.getElementById(id+s.key)
        .addEventListener(id==='hand'?'change':'input', ()=> validateInputs(s.key));
      if(id==='waiverCheck'){
        document.getElementById(id+s.key)
          .addEventListener('change', ()=> validateInputs(s.key));
      }
    });
  });
};

