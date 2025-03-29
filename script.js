// The maxSlots need to be updated to change the maximum number of sign-ups each time.
// Everytime the eventDate is updated, it creates a new sheet in the same Excel file.
// --- Configuration and Event Details ---
const apiUrl = 'https://script.google.com/macros/s/AKfycbzGKLQt1DMtwY-iQkKJmNcFRcf2Yon2X4W31Qonw4nOJfAmwf76tmVXhY05z10ngsTp/exec';
const maxSlots = 46;
const eventDate = '20250327';  // This must match the sheet name for the event
const eventTime = '6-7am';
const eventLocation = 'Charles River, Cambridge, MA';

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

// --- Local Storage Helper Functions ---
function getMySignups() {
  const key = `mySignups_${eventDate}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

function saveMySignups(mySignups) {
  const key = `mySignups_${eventDate}`;
  localStorage.setItem(key, JSON.stringify(mySignups));
}

// --- Global State ---
let signupsLoaded = false;

// --- Fetch Signups ---
async function fetchSignups() {
  try {
    const response = await fetch(`${apiUrl}?action=get&date=${eventDate}`);
    const signups = await response.json();
    console.log('Signups data:', signups);
    updateDisplay(signups);
  } catch (error) {
    console.error('Error fetching signups:', error);
  }
}

// --- Add a New Signup ---
async function signUp() {
  if (!signupsLoaded) {
    alert("Please wait for the sign-up list to load.");
    return;
  }
  const name = document.getElementById("name").value.trim();
  const hand = document.getElementById("hand").value;
  if (!name || !hand) {
    alert("Please enter your name and select your dominant hand.");
    return;
  }
  
  // Check device's list for duplicate name
  let mySignups = getMySignups();
  if (mySignups.includes(name)) {
    alert("You have already signed up with this name on this device.");
    return;
  }
  
  try {
    const response = await fetch(`${apiUrl}?action=signup&name=${encodeURIComponent(name)}&hand=${encodeURIComponent(hand)}&date=${eventDate}`);
    const signups = await response.json();
    // Add the name to our device's list
    mySignups.push(name);
    saveMySignups(mySignups);
    updateDisplay(signups);
  } catch (error) {
    console.error('Error signing up:', error);
  }
}

// --- Remove a Signup ---
async function removeSignup(name) {
  let mySignups = getMySignups();
  if (!mySignups.includes(name)) {
    alert("You can't remove this sign-up because it's not associated with this device.");
    return;
  }
  
  try {
    const response = await fetch(`${apiUrl}?action=remove&name=${encodeURIComponent(name)}&date=${eventDate}`);
    const signups = await response.json();
    // Remove the name from our device's list
    mySignups = mySignups.filter(n => n !== name);
    saveMySignups(mySignups);
    updateDisplay(signups);
  } catch (error) {
    console.error('Error removing signup:', error);
  }
}

// --- Update the Display ---
function updateDisplay(signups) {
  signupsLoaded = true;
  const remainingSlots = maxSlots - signups.length;
  document.getElementById("remainingSlots").textContent = remainingSlots;
  const signupList = document.getElementById("signupList");
  signupList.innerHTML = "";
  
  const mySignups = getMySignups();
  
  signups.forEach(({ name, hand }) => {
    const listItem = document.createElement("li");
    listItem.classList.add("signup-item");
    
    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${name} (${hand})`;
    listItem.appendChild(nameSpan);
    
    // Only show Remove button if this device added the name
    if (mySignups.includes(name)) {
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.classList.add("remove-button");
      removeButton.onclick = () => removeSignup(name);
      listItem.appendChild(removeButton);
    }
    
    signupList.appendChild(listItem);
  });
  
  // Disable the sign-up button if there are no available slots
  document.getElementById("signUpBtn").disabled = remainingSlots <= 0;
  document.getElementById("loadingMsg")?.remove();
  document.getElementById("name").value = "";
}

// --- Form Validation for Enabling/Disabling the Sign-Up Button ---
function validateFormInputs() {
  const name = document.getElementById("name").value.trim();
  const hand = document.getElementById("hand").value;
  const signUpBtn = document.getElementById("signUpBtn");
  const isValid = name !== "" && hand !== "";
  signUpBtn.disabled = !isValid;
  signUpBtn.style.backgroundColor = isValid ? "#4CAF50" : "#ccc";
}
document.getElementById("name").addEventListener("input", validateFormInputs);
document.getElementById("hand").addEventListener("change", validateFormInputs);

// --- Initialize on Page Load ---
window.onload = () => {
  fetchSignups();
  validateFormInputs();
};



