// The maxSlots need to be updated to change the maximum number of sign-ups each time.
// Everytime the eventDate is updated, it creates a new sheet in the same Excel file.
// --- Configuration and Global Variables ---
const apiUrl = 'https://script.google.com/macros/s/AKfycbzGKLQt1DMtwY-iQkKJmNcFRcf2Yon2X4W31Qonw4nOJfAmwf76tmVXhY05z10ngsTp/exec';
const maxSlots = 46;
const eventDate = '20250327';
const eventTime = '6-7am';
const eventLocation = 'Charles River, Cambridge, MA';

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

let signupsLoaded = false;

// Fetch signups
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

// Add a new signup
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
    const userId = Date.now() + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(`currentUserId_${eventDate}`, userId);
    localStorage.setItem(`currentUserName_${eventDate}`, name);

    try {
        const response = await fetch(`${apiUrl}?action=signup&name=${encodeURIComponent(name)}&hand=${encodeURIComponent(hand)}&userId=${userId}&date=${eventDate}`);
        const signups = await response.json();
        updateDisplay(signups);
    } catch (error) {
        console.error('Error signing up:', error);
    }
}

// Remove a signup using both name and userId
async function removeSignup(name) {
    const userId = localStorage.getItem(`currentUserId_${eventDate}`);
    const currentUserName = localStorage.getItem(`currentUserName_${eventDate}`);
    if (!userId || name !== currentUserName) {
        alert("You can't remove this sign-up as it's not associated with this device.");
        return;
    }
    try {
        const response = await fetch(`${apiUrl}?action=remove&name=${encodeURIComponent(name)}&userId=${userId}&date=${eventDate}`);
        const signups = await response.json();
        updateDisplay(signups);
    } catch (error) {
        console.error('Error removing signup:', error);
    }
}

// Update display
function updateDisplay(signups) {
    signupsLoaded = true;
    const remainingSlots = maxSlots - signups.length;
    document.getElementById("remainingSlots").textContent = remainingSlots;
    const signupList = document.getElementById("signupList");
    signupList.innerHTML = "";

    const currentUserName = localStorage.getItem(`currentUserName_${eventDate}`);

    signups.forEach(({ name, hand }) => {
        const listItem = document.createElement("li");
        listItem.classList.add("signup-item");
        const nameSpan = document.createElement("span");
        nameSpan.textContent = `${name} (${hand})`;
        listItem.appendChild(nameSpan);

        if (name === currentUserName) {
            const removeButton = document.createElement("button");
            removeButton.textContent = "Remove";
            removeButton.classList.add("remove-button");
            removeButton.onclick = () => removeSignup(name);
            listItem.appendChild(removeButton);
        }
        signupList.appendChild(listItem);
    });

    document.getElementById("signUpBtn").disabled = remainingSlots <= 0;
    document.getElementById("loadingMsg")?.remove();
    document.getElementById("name").value = "";
}

// Form validation (for button enable/disable)
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

window.onload = () => {
    fetchSignups();
    validateFormInputs();
};


