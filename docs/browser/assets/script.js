


const sheetURL = "https://script.google.com/macros/s/AKfycbz7Xov1tRjkjG85YAcCzL-bfCSzIZQeDseIGn2vjLSnfRgz3sou3CYp2md16wSYALne/exec";
let chart; // Global chart instance

// Toast Notification Function
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000); // Hide after 3 seconds
}

function verifyUnlock(callback) {
  const unlockPopup = document.getElementById("unlockPopup");
  const unlockCancel = document.getElementById("unlockCancel");

  //1-2-3
  //4-5-6
  //7-8-9
  const correctPattern = "1-4-7-8-9";
  let inputPattern = [];
  let isMouseDown = false;
  let isTouchActive = false;
  let lastPoint = null;

  // Create canvas for drawing lines
  const gridContainer = unlockPopup.querySelector(".grid-container") || unlockPopup;
  const canvas = document.createElement("canvas");
  canvas.className = "pattern-canvas";
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none"; // Allows clicks to pass through
  canvas.style.zIndex = "1"; // Above buttons but below other UI

  // Insert canvas as first child of the grid container
  gridContainer.insertBefore(canvas, gridContainer.firstChild);

  // Set canvas size to match container
  const resizeCanvas = () => {
    canvas.width = gridContainer.offsetWidth;
    canvas.height = gridContainer.offsetHeight;
    drawLines(); // Redraw lines when resizing
  };

  // Initial sizing
  setTimeout(resizeCanvas, 0);

  // Show the popup and lock scroll
  unlockPopup.style.display = "block";
  document.body.classList.add("lock-scroll");

  // Get fresh references to grid buttons
  const gridButtons = document.querySelectorAll(".grid-button");

  // Create a mapping of button elements to their positions
  const buttonPositions = {};
  gridButtons.forEach(button => {
    const rect = button.getBoundingClientRect();
    const containerRect = gridContainer.getBoundingClientRect();

    // Store center position relative to the canvas
    buttonPositions[button.getAttribute("data-value")] = {
      x: rect.left + rect.width/2 - containerRect.left,
      y: rect.top + rect.height/2 - containerRect.top
    };
  });

  // Function to draw lines between connected points
  function drawLines() {
    if (!canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (inputPattern.length <= 0) return;

    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineCap = "round";

    // Draw lines between all points in the pattern
    for (let i = 0; i < inputPattern.length; i++) {
      const point = buttonPositions[inputPattern[i]];
      if (point) {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
    }

    // If there's an active touch/mouse point, draw a line to the current position
    if (lastPoint && (isMouseDown || isTouchActive)) {
      ctx.lineTo(lastPoint.x, lastPoint.y);
    }

    ctx.stroke();
  }

  // Reset grid state function - properly resets the visual state
  function resetGridState() {
    inputPattern = [];
    gridButtons.forEach(button => {
      button.classList.remove("active");
    });

    // Clear the canvas
    if (canvas.getContext) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  // Reset grid immediately on open
  resetGridState();

  // Add to pattern with duplicate prevention
  function addToPattern(button) {
    if (!button) return;

    const value = button.getAttribute("data-value");
    if (!inputPattern.includes(value)) {
      inputPattern.push(value);
      button.classList.add("active");

      // Optional: Add vibration feedback on mobile (if supported)
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }
  }

  // Check pattern and handle success/failure
  function checkPattern() {
    isMouseDown = false;
    isTouchActive = false;
    lastPoint = null;

    const enteredPattern = inputPattern.join("-");
    if (enteredPattern === correctPattern) {
      cleanup();
      // Call the callback after cleanup to prevent potential issues
      setTimeout(() => callback(), 100);
    } else {
      showToast("Muster falsch, versuche es erneut.");
      resetGridState();
    }
  }

  // Cleanup function - hides popup and removes class
  function cleanup() {
    resetGridState();
    unlockPopup.style.display = "none";
    document.body.classList.remove("lock-scroll");

    // Remove canvas
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }

    // Remove all event listeners
    gridButtons.forEach(button => {
      button.removeEventListener("mousedown", handleMouseDown);
      button.removeEventListener("mouseover", handleMouseOver);
      button.removeEventListener("mouseup", handleMouseUp);
      button.removeEventListener("touchstart", handleTouchStart);
      button.removeEventListener("touchmove", handleTouchMove);
      button.removeEventListener("touchend", handleTouchEnd);
    });

    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("mousemove", handleMouseMove);
    unlockCancel.removeEventListener("click", handleCancel);
  }

  // Event handler functions
  function handleMouseDown(e) {
    isMouseDown = true;
    const rect = gridContainer.getBoundingClientRect();
    lastPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    addToPattern(e.currentTarget);
  }

  function handleMouseOver(e) {
    if (isMouseDown) {
      addToPattern(e.currentTarget);
    }
  }

  function handleMouseMove(e) {
    if (!isMouseDown) return;

    const rect = gridContainer.getBoundingClientRect();
    lastPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    drawLines();
  }

  function handleMouseUp() {
    if (isMouseDown) {
      checkPattern();
    }
  }

  function handleTouchStart(e) {
    // Prevent default to stop screen movement
    e.preventDefault();
    isTouchActive = true;

    const touch = e.touches[0];
    const rect = gridContainer.getBoundingClientRect();
    lastPoint = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    addToPattern(e.currentTarget);
  }

  function handleTouchMove(e) {
    if (!isTouchActive) return;

    // Prevent default to stop screen movement
    e.preventDefault();

    const touch = e.touches[0];
    const rect = gridContainer.getBoundingClientRect();
    lastPoint = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };

    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    if (target && target.classList.contains("grid-button")) {
      addToPattern(target);
    }

    drawLines();
  }

  function handleTouchEnd(e) {
    // Prevent default to stop screen movement
    e.preventDefault();
    if (isTouchActive) {
      checkPattern();
    }
  }

  function handleCancel() {
    cleanup();
  }

  // Add event listeners
  gridButtons.forEach(button => {
    button.addEventListener("mousedown", handleMouseDown);
    button.addEventListener("mouseover", handleMouseOver);
    button.addEventListener("touchstart", handleTouchStart, { passive: false });
    button.addEventListener("touchmove", handleTouchMove, { passive: false });
    button.addEventListener("touchend", handleTouchEnd, { passive: false });
  });

  // Add document-level mouse event listeners
  document.addEventListener("mouseup", handleMouseUp);
  document.addEventListener("mousemove", handleMouseMove);

  // Cancel unlocking
  unlockCancel.addEventListener("click", handleCancel);

  // Handle window resize
  window.addEventListener("resize", resizeCanvas);
}

// Submit Data Function using lockscreen
async function submitData() {
  let name = document.getElementById("name").value.replace(/\s$/, '');
  const hohenmeter = document.getElementById("hohenmeter").value;

  if (!name || !hohenmeter) {
    showToast("Bitte beide Felder ausfüllen! ⚠️");
    return;
  }

  verifyUnlock(async () => {
    await fetch(`${sheetURL}?action=add&name=${encodeURIComponent(name)}&hohenmeter=${encodeURIComponent(hohenmeter)}`);
    loadData();
    showToast("✅ Eintrag hinzugefügt!");
  });
}

async function deleteData(name, hohenmeter) {
  verifyUnlock(async () => {
    showToast("🗑️ Eintrag gelöscht!");
    await fetch(`${sheetURL}?action=delete&name=${encodeURIComponent(name)}&hohenmeter=${encodeURIComponent(hohenmeter)}`);
    loadData();
  });
}

// Validate Höhenmeter Input
function validateHohenmeter() {
  const hmInput = document.getElementById("hohenmeter");
  const value = Number(hmInput.value);
  const name = document.getElementById("name").value.split(" ")[0];

  if (value > 1200) {
    showToast("Sei ehrlich 🤥😏😳");

  } else if (value > 350 && value < 1200) {
    showToast("Boaah 😨");

  } else if (value > 100 && value < 349) {
    showToast("Stark " + name + " 💪");
  }
}

// Format Date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

// Load Data from Google Sheet
async function loadData() {
  const loader = document.getElementById("loading");
  loader.style.display = "block"; // Show loader

  try {
    const response = await fetch(`${sheetURL}?action=get`);
    const data = await response.json();

    loader.style.display = "none"; // Hide loader after data loads

    const mainData = data.main.reverse();
    const rankingData = data.ranking.sort((a, b) => b[1] - a[1]);

    document.getElementById("dataTable").innerHTML = "<tr><th>Name</th><th>HM</th><th>Datum</th><th>Löschen</th></tr>";
    let total = 0;

    mainData.forEach((row, index) => {
      total += parseInt(row[1]);
      document.getElementById("dataTable").innerHTML += `<tr>
        <td>${row[0]}</td>
        <td>${row[1]}</td>
        <td>${formatDate(row[2])}</td>
        <td>${index === 0 ? `<button onclick="deleteData('${row[0]}', '${row[1]}')">❌</button>` : ""}</td>
      </tr>`;
    });

    updateProgress(total);
    drawChart(total);
    updateRanking(rankingData);
    checkGoals(total);

  } catch (error) {
    loader.style.display = "none"; // Hide loader if there's an error
    console.error("Error loading data:", error);
    showToast("❌ Fehler beim Laden der Daten!");
  }
}

// Update Ranking Table
async function updateRanking(rankingData) {
  const rankingTable = document.getElementById("rankingTable");
  rankingTable.innerHTML = "<tr><th>Platz</th><th>Name</th><th>HM</th></tr>";

  rankingData.forEach((row, index) => {
    let rankEmoji;
    let rankText;

    if (index === 0) {
      if (row[0].toLowerCase() === "max") {
        rankText = "Max";
      } else {
        rankText = 1;
      }
      rankEmoji = "🏆";
    } else if (index === 1) {
      rankEmoji = "🥈";
      rankText = index + 1;
    } else if (index === 2) {
      rankEmoji = "🥉";
      rankText = index + 1;
    } else {
      rankEmoji = "🏅";
      rankText = index + 1;
    }

    rankingTable.innerHTML += `
      <tr><td>${rankText} ${rankEmoji}</td><td>${row[0]}</td><td>${row[1]}</td></tr>
    `;
  });
}

// Update Progress Bar
function updateProgress(total) {
  const percentage = (total / 100000) * 100;
  document.getElementById("progressBar").style.width = percentage + "%";
  document.getElementById("progressBar").textContent = Math.round(percentage) + "%";
  document.getElementById("totalHM").textContent = total;
}

// Draw Chart
function drawChart(total) {
  const ctx = document.getElementById("myChart").getContext("2d");
  if (chart) {
    chart.destroy();
  }

  const mountainData = [
    {x: 0, y: 0},
    {x: 10000, y: 10000},
    {x: 12500, y: 8000},

    {x: 25000, y: 25000},
    {x: 29000, y: 20000},

    {x: 50000, y: 50000},
    {x: 55000, y: 45000},

    {x: 75000, y: 75000},
    {x: 82000, y: 69000},

    {x: 100000, y: 100000},
    {x: 103000, y: 93000},

    {x: 110000, y: 70000},


  ];

  const progressData = [{x: 0, y: 0}];

  for (let i = 0; i < mountainData.length - 1; i++) {
    const start = mountainData[i];
    const end = mountainData[i + 1];

    if (total >= end.y) {
      progressData.push({x: end.x, y: end.y});
    } else if (total > start.y) {
      const ratio = (total - start.y) / (end.y - start.y);
      progressData.push({x: start.x + ratio * (end.x - start.x), y: total});
      break;
    } else {
      break;
    }
  }

  chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Fortschritt",
          data: progressData,
          borderColor: "green",
          backgroundColor: "rgba(0,128,0,0.4)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointBackgroundColor: "green",
          z: 2
        },
        {
          label: "Ziele",
          data: mountainData,
          borderColor: "saddlebrown",
          backgroundColor: "rgba(139, 69, 19, 0.6)",
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointBackgroundColor: "saddlebrown",
          z: 2
        }
      ]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { type: "linear", min: 0, max: 110000},
        y: { min: 0, max: 120000, display: false }
      }
    }
  });
}

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Remove time for accurate comparison

// Fetch and display events from the server
async function fetchEvents() {
  const response = await fetch(`${sheetURL}?action=getEvents`);
  const events = await response.json();

  const eventListContainer = document.getElementById('eventsList'); // Use eventsList, not eventList
  eventListContainer.innerHTML = ''; // Clear the event list before adding new items

    events.forEach(event => {
      const li = document.createElement("li");

      const [year, month, day] = event.date.split("-").map(Number);
      const eventDate = new Date(year, month - 1, day + 1); // Create date without time
      const formattedDate = eventDate.toLocaleDateString("de-DE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
      li.innerHTML = `
        <div class="event-left">
          <strong>${event.name}</strong><br>
          <small>${event.dist}</small><br>
          <small>📅 ${formattedDate}</small>
        </div>
        <div class="event-right">
        </div>
          <span class="days-left">🕒 ${event.daysLeft} Tage</span>
        
      `;

      li.style.cursor = "pointer"; // Make the event clickable
      li.addEventListener('click', () => openEventModal(event)); // Handle event click

// Add 'event-row' class to the list item (li)
      li.classList.add('event-row'); // This adds the CSS class to the li element
    eventListContainer.appendChild(li); // Append each event as its own list item
  });
}

// Call the fetchEvents function when the page loads
window.onload = fetchEvents;

// Function to open the event modal
async function openEventModal(event) {
  const loader = document.getElementById("loading");
  const participantList = document.getElementById('participantList');
  const modal = document.getElementById('eventModal');

  // Show loader while fetching participants
  loader.style.display = "block";

  // Reset participant list to avoid showing stale data
  participantList.innerHTML = '';

  // Initially hide modal (it will be shown later after data is fetched)
  modal.style.display = 'none';

  try {
    // Fetch participants for the clicked event
    const response = await fetch(`${sheetURL}?action=getParticipants&eventName=${event.name}`);
    const data = await response.json();

    // Populate participant list with the new data
    participantList.innerHTML = ''; // Clear the list first
    data.participants.forEach(participant => {
      const li = document.createElement('li');
      li.textContent = participant;
      participantList.appendChild(li);
    });

// If the list is still empty, show the cricket emoji
    if (participantList.children.length === 0) {
      const li = document.createElement('li');
      li.textContent = '🦗';
      participantList.appendChild(li);
    }

    // Add event listener for the "+" button to show the participant form
    const addParticipantBtn = document.getElementById('addParticipantBtn');
    if (!addParticipantBtn.hasListener) {
      addParticipantBtn.addEventListener('click', () => {
        document.getElementById('addParticipantForm').style.display = 'block';
      });
      addParticipantBtn.hasListener = true;
    }

    // Fix: Remove any existing event listener to avoid duplicate submissions
    const submitParticipant = document.getElementById('submitParticipant');
    submitParticipant.replaceWith(submitParticipant.cloneNode(true)); // Detach old listener
    const newSubmitParticipant = document.getElementById('submitParticipant');

    // Add new event listener for form submission with the correct event context
    newSubmitParticipant.addEventListener('click', async () => {
      const participantName = document.getElementById('participantName').value;

      if (participantName) {
        // Disable the submit button to prevent multiple clicks
        newSubmitParticipant.disabled = true;
        loader.style.display = "block";

        try {
          // Use the current event name dynamically
          await fetch(`${sheetURL}?action=addParticipant&eventName=${event.name}&participantName=${participantName}`);

          // Add participant to the list
          const li = document.createElement('li');
          li.textContent = participantName;
          participantList.appendChild(li);

          // Hide the form after submitting
          document.getElementById('addParticipantForm').style.display = 'none';
          document.getElementById('participantName').value = '';
        } catch (error) {
          console.error("Error submitting participant:", error);
          showToast("❌ Fehler beim Hinzufügen des Teilnehmers!");
        } finally {
          loader.style.display = "none";

          // Re-enable the submit button after 5 seconds
          setTimeout(() => {
            newSubmitParticipant.disabled = false;
          }, 5000);
        }
      }
    });

    // Hide the loader and show the modal once the data is ready
    loader.style.display = "none";
    modal.style.display = "flex"; // Show the modal

  } catch (error) {
    loader.style.display = "none";
    console.error("Error loading participants:", error);
    showToast("❌ Fehler beim Laden der Teilnehmer!");
  }
}

// Close event modal when the close button is clicked
const closeParticipantModal = document.getElementById('closeParticipantModal');
closeParticipantModal.addEventListener('click', () => {
  const modal = document.getElementById('eventModal');
  modal.style.display = 'none';
});


// Check Goals
function checkGoals(total) {
  const goals = [10000, 25000, 50000, 75000, 100000];
  goals.forEach((goal, index) => {
    const checkbox = document.getElementById(`goal${index + 1}Check`);
    const listItem = checkbox.parentElement;
    checkbox.checked = total >= goal;
    listItem.classList.toggle("completed", total >= goal);
  });
  updateGoalBanner(total);
}

// Update Goal Banner
function updateGoalBanner(total) {
  const goals = [10000, 25000, 50000, 75000, 100000];
  let lastReachedGoal = "";

  goals.forEach((goal, index) => {
    const goalCheck = document.getElementById(`goal${index + 1}Check`);
    if (total >= goal) {
      goalCheck.checked = true;
      lastReachedGoal = goalCheck.nextElementSibling.innerHTML;
    }
  });

  document.getElementById("goalBanner").innerHTML = lastReachedGoal
      ? `🎉 Ziel erreicht: ${lastReachedGoal.replace(/<[^>]*>/g, '')}!`
      : "Noch kein Ziel erreicht 😮";
  document.getElementById("goalBanner").style.display = "block";
}

async function showNextTraining() {
  try {
    const res = await fetch(`${sheetURL}?action=training`);
    const trainings = await res.json();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the next upcoming training
    const next = trainings
    .map(t => {
      const date = new Date(t.date);
      date.setHours(0, 0, 0, 0);
      return { ...t, dateObj: date };
    })
    .filter(t => t.dateObj >= today)
    .sort((a, b) => a.dateObj - b.dateObj)[0];

    if (!next) return; // No future training found

    const popup = document.getElementById("trainingPopup");
    const dateText = next.dateObj.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

    document.getElementById("trainingDate").innerText = `${dateText}`;
    document.getElementById("trainingDescription").innerText = next.description;

    // Set background image based on type
    let bgImage = "url('images/dauerlauf.png')";
    if (next.type === "Dauerlauf") bgImage = "url('images/dauerlauf.png')";
    else if (next.type === "Pyramiden") bgImage = "url('images/pyramiden.png')";
    else if (next.type === "Intervalle") bgImage = "url('images/intervalle.png')";
    else if (next.type === "Trail") bgImage = "url('images/trail.png')";
    else if (next.type === "ABC") bgImage = "url('images/ABC.png')";
    else if (next.type === "Dauerlauf2") bgImage = "url('images/dauerlauf2.png')";
    else if (next.type === "Dauerlauf3") bgImage = "url('images/dauerlauf3.png')";
    else if (next.type === "Intervalle2") bgImage = "url('images/intervalle2.png')";
    else if (next.type === "Sprints") bgImage = "url('images/sprints.png')";

    popup.style.backgroundImage = bgImage;
    popup.style.display = "block";

    // ⏱️ Fade out after 8.5 seconds
    setTimeout(() => {
      popup.classList.add("fade-out");
    }, 9000);

    // ⏳ Fully hide after 10 seconds
    setTimeout(() => {
      popup.style.display = "none";
    }, 13000);

  } catch (err) {
    console.error("Failed to load training data:", err);
  }
}



// Check if the popup has been shown before using localStorage
let popupShown = localStorage.getItem("popupShown") === "true"; // Use "true" string for comparison

document.addEventListener("DOMContentLoaded", function() {
  // Hide the popup initially
  document.getElementById("trainingPopup").style.display = "none";

  // After 5 seconds, show the popup only if it hasn't been shown yet
  if (!popupShown) {
    setTimeout(function() {
      document.getElementById("trainingPopup").style.display = "block";
      localStorage.setItem("popupShown", "true"); // Save flag to localStorage so it persists
    }, 5000); // 5000 milliseconds (5 seconds)
  }
});

document.addEventListener("DOMContentLoaded", showNextTraining);

// Close function
function closeTrainingPopup() {
  document.getElementById("trainingPopup").style.display = "none";
}

// Load Data on Page Load
loadData();



