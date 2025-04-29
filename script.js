// The maxSlots need to be updated to change the maximum number of sign-ups each time.
// Everytime the eventDate is updated, it creates a new sheet in the same Excel file.
// —— Configuration & Event Details ——
const apiUrl        = 'https://script.google.com/macros/s/AKfycbyLYPNnQbwUg7YPpJJgXG3Th2jFP2ocB_5Gekbe8aYEVwNSFls7cYEihC9jEk1_9trT/exec';
const maxSlots      = 40;
const trainingQuota = 8;
const eventLocation = 'Fort Point Pier, 21 Wormwood St #215, Boston, MA 02210';

// Two sessions’ dates & times:
const sessions = [
  { key: '1', date: '20250502', time: '6:00-8:00pm', title: 'Friday Session' },
  { key: '2', date: '20250504', time: '6:00-8:00pm', title: 'Sunday Session' }
];

// — Helpers for localStorage per session —
function getMySignups(date) {
  const stored = localStorage.getItem(`mySignups_${date}`);
  return stored ? JSON.parse(stored) : [];
}
function saveMySignups(date, list) {
  localStorage.setItem(`mySignups_${date}`, JSON.stringify(list));
}

// — Fetch & display for each session —
async function fetchSignups(session) {
  const { key, date } = session;
  const res = await fetch(`${apiUrl}?action=get&date=${date}`);
  const signups = await res.json();
  updateDisplay(session, signups);
}

// — Sign up for a session —
async function signUpSession(session) {
  const { key, date } = session;
  if (!window[`loaded${key}`]) {
    return alert('Please wait for the list to load.');
  }

  const nameEl   = document.getElementById(`name${key}`);
  const handEl   = document.getElementById(`hand${key}`);
  const trainEl  = document.getElementById(`training${key}`);
  const waiverEl = document.getElementById(`waiverCheck${key}`);

  const name = nameEl.value.trim(),
        hand = handEl.value,
        training = trainEl.checked ? 'Yes' : 'No';

  if (!name || !hand || !waiverEl.checked) {
    return alert('Please fill in name, hand, and confirm waiver.');
  }

  // Prevent duplicates on this device
  let myList = getMySignups(date);
  if (myList.includes(name)) {
    return alert('You have already signed up with this name on this device.');
  }

  // Check training quota
  const currentCount = document
    .querySelectorAll(`#signupList${key} li`)
    .length - 1 + 0 // we’ll recalc in updateDisplay
  // but simpler: we count after fetch below

  // Perform the signup call (including training param!)
  const url =
    `${apiUrl}?action=signup` +
    `&name=${encodeURIComponent(name)}` +
    `&hand=${encodeURIComponent(hand)}` +
    `&training=${encodeURIComponent(training)}` +
    `&date=${date}`;
  const res = await fetch(url);
  const signups = await res.json();

  // Save locally so Remove button appears
  myList.push(name);
  saveMySignups(date, myList);

  updateDisplay(session, signups);
}

// — Remove for a session —
async function removeSession(session, name) {
  const { key, date } = session;
  let myList = getMySignups(date);
  if (!myList.includes(name)) {
    return alert("Cannot remove: you didn't sign up on this device.");
  }

  const res = await fetch(
    `${apiUrl}?action=remove&name=${encodeURIComponent(name)}&date=${date}`
  );
  const signups = await res.json();

  myList = myList.filter(n => n !== name);
  saveMySignups(date, myList);

  updateDisplay(session, signups);
}

// — Render slots & list —
function updateDisplay(session, signups) {
  const { key, date, time } = session;

  // Mark loaded
  window[`loaded${key}`] = true;

  // Date formatting
  const d = new Date(
    parseInt(date.slice(0,4)),
    parseInt(date.slice(4,6)) - 1,
    parseInt(date.slice(6,8))
  );
  document.getElementById(`eventDate${key}`).textContent = d.toLocaleDateString(undefined,{
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });
  document.getElementById(`eventTime${key}`).textContent     = time;
  document.getElementById(`eventLocation${key}`).textContent = eventLocation;

  // Slots
  const remaining = Math.max(0, maxSlots - signups.length);
  document.getElementById(`remainingSlots${key}`).textContent = remaining;

  // Training quota count
  const trainCount = signups.filter(s => s.training==='Yes').length;
  document.getElementById(`trainingSlots${key}`).textContent =
    `1v1 Training Slots Available: ${trainingQuota - trainCount} out of ${trainingQuota}`;

  // Render list
  const listEl = document.getElementById(`signupList${key}`);
  listEl.innerHTML = '';
  const myList = getMySignups(date);

  signups.forEach(({name,hand,training})=>{
    const li = document.createElement('li');
    li.className = 'signup-item';

    let txt = `${name} (${hand})`;
    if (training==='Yes') txt += ' [1v1]';
    const span = document.createElement('span');
    span.textContent = txt;
    li.appendChild(span);

    if (myList.includes(name)) {
      const btn = document.createElement('button');
      btn.className = 'remove-button';
      btn.textContent = 'Remove';
      btn.onclick = ()=> removeSession(session, name);
      li.appendChild(btn);
    }
    listEl.appendChild(li);
  });

  // Reset form fields & disable button if full
  document.getElementById(`signUpBtn${key}`).disabled = (signups.length >= maxSlots);
  ['name','hand','training','waiverCheck'].forEach(id=>{
    const el = document.getElementById(id+key);
    if (!el) return;
    if (el.type==='checkbox') el.checked = false;
    else el.value = '';
  });

  document.getElementById(`loadingMsg${key}`)?.remove();
}

// — Form validation per session —
function validateInputs(key) {
  const name  = document.getElementById(`name${key}`).value.trim();
  const hand  = document.getElementById(`hand${key}`).value;
  const waiver= document.getElementById(`waiverCheck${key}`).checked;
  const btn   = document.getElementById(`signUpBtn${key}`);
  const ok    = name!=='' && hand!=='' && waiver;
  btn.disabled = !ok;
  btn.style.backgroundColor = ok ? '#4CAF50' : '#ccc';
}

// — Wire up on load —
window.onload = () => {
  sessions.forEach(s => {
    // fetch initial list
    fetchSignups(s);
    // hook up sign-up click
    document.getElementById(`signUpBtn${s.key}`)
      .addEventListener('click', ()=> signUpSession(s));
    // hook up validation
    ['name','hand','waiverCheck'].forEach(id=>{
      const el = document.getElementById(id+s.key);
      const evt= id==='hand'?'change':'input';
      el.addEventListener(evt, ()=> validateInputs(s.key));
      if(id==='waiverCheck'){
        el.addEventListener('change', ()=> validateInputs(s.key));
      }
    });
  });
};
