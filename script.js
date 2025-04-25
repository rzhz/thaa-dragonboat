// The maxSlots need to be updated to change the maximum number of sign-ups each time.
// Everytime the eventDate is updated, it creates a new sheet in the same Excel file.
// --- Configuration & Event Details ---
const apiUrl = 'https://script.google.com/macros/s/AKfycbyLYPNnQbwUg7YPpJJgXG3Th2jFP2ocB_5Gekbe8aYEVwNSFls7cYEihC9jEk1_9trT/exec';
const maxSlots = 40;
const eventDate = '20250428';  // Must match the sheet name for the event
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

// --- Local Storage Helpers ---
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
let currentTrainingCount = 0; // To track current count of training sign-ups

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

  // Prevent device‐side duplicates
  let mySignups = getMySignups();
  if (mySignups.includes(name)) {
    alert("You have already signed up with this name on this device.");
    return;
  }

  // Check training quota
  const trainingChecked = document.getElementById("training").checked;
  if (trainingChecked && currentTrainingCount >= trainingQuota) {
    alert("The quota for 1v1 training has been reached.");
    return;
  }
  const training = trainingChecked ? "Yes" : "No";

  try {
    // **Include** the training parameter in the request URL
    const response = await fetch(
      `${apiUrl}` +
      `?action=signup` +
      `&name=${encodeURIComponent(name)}` +
      `&hand=${encodeURIComponent(hand)}` +
      `&training=${encodeURIComponent(training)}` +
      `&date=${eventDate}`
    );
    const signups = await response.json();

    // **Always** add this name to the device’s list, so we can show Remove later
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

  // Update the current training count (count rows with training === "Yes")
  currentTrainingCount = signups.filter(item => item.training === "Yes").length;

  // Compute how many training slots remain:
  const trainingRemaining = trainingQuota - currentTrainingCount;

  // Update the trainingSlots element to display the remaining training slots
  document.getElementById("trainingSlots").textContent = `1v1 Training Slots Available: ${trainingRemaining} out of ${trainingQuota}`;

  
  const mySignups = getMySignups();
  
  signups.forEach(({ name, hand, training }) => {
    const listItem = document.createElement("li");
    listItem.classList.add("signup-item");
    
    // Display name, hand, and optionally a label for 1v1 training
    let displayText = `${name} (${hand})`;
    if (training === "Yes") {
      displayText += " [1v1]";
    }
    const nameSpan = document.createElement("span");
    nameSpan.textContent = displayText;
    listItem.appendChild(nameSpan);
    
    // Show the Remove button if this name was added from this device
    if (mySignups.includes(name)) {
      const removeButton = document.createElement("button");
      removeButton.textContent = "Remove";
      removeButton.classList.add("remove-button");
      removeButton.onclick = () => removeSignup(name);
      listItem.appendChild(removeButton);
    }
    
    signupList.appendChild(listItem);
  });
  
  // Disable sign-up button if no slots remain
  document.getElementById("signUpBtn").disabled = remainingSlots <= 0;
  document.getElementById("loadingMsg")?.remove();
  document.getElementById("name").value = "";

}

// --- Form Validation for Enabling/Disabling the Sign-Up Button ---
function validateFormInputs() {
    const name = document.getElementById("name").value.trim();
    const hand = document.getElementById("hand").value;
    const waiverChecked = document.getElementById("waiverCheck").checked;
    const signUpBtn = document.getElementById("signUpBtn");
    
    // All required inputs (name, hand, and waiver checkbox) must be true
    const isValid = name !== "" && hand !== "" && waiverChecked;
    
    signUpBtn.disabled = !isValid;
    signUpBtn.style.backgroundColor = isValid ? "#4CAF50" : "#ccc";
}

document.getElementById("name").addEventListener("input", validateFormInputs);
document.getElementById("hand").addEventListener("change", validateFormInputs);
document.getElementById("waiverCheck").addEventListener("change", validateFormInputs);

// --- Initialize on Page Load ---
window.onload = () => {
  fetchSignups();
  validateFormInputs();
};




