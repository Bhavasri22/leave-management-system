
let userId = "";

const $ = (id) => document.getElementById(id);

function showMessage(message) {
    $("message").textContent = message;
}

function showSection(section) {
    $("register-section").hidden = section !== "register";
    $("login-section").hidden = section !== "login";
    $("dashboard").hidden = section !== "dashboard";
}

// Get today's date in local YYYY-MM-DD format
function getToday() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Set minimum selectable dates
function setupDateFields() {
    const today = getToday();

    $("from-date").min = today;
    $("to-date").min = today;
}

// Calculate leave days
function calculateLeaveDays() {
    const fromDate = $("from-date").value;
    const toDate = $("to-date").value;

    $("leave-days").value = "";
    $("date-message").textContent = "";

    if (!fromDate || !toDate) {
        return;
    }

    if (toDate < fromDate) {
        $("date-message").textContent =
            "To Date must be after or equal to From Date.";

        $("date-message").style.color = "red";
        return;
    }

    const start = new Date(fromDate + "T00:00:00");
    const end = new Date(toDate + "T00:00:00");

    const difference = Math.round(
        (end - start) / (1000 * 60 * 60 * 24)
    );

    const totalDays = difference + 1;

    $("leave-days").value = totalDays;

    $("date-message").textContent =
        `Total leave days: ${totalDays}`;

    $("date-message").style.color = "green";
}

// Date change events
$("from-date").addEventListener("change", () => {
    const fromDate = $("from-date").value;

    $("to-date").min = fromDate || getToday();

    if (
        $("to-date").value &&
        $("to-date").value < fromDate
    ) {
        $("to-date").value = "";
    }

    calculateLeaveDays();
});

$("to-date").addEventListener("change", calculateLeaveDays);

// API Request Function
async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// Student Registration
$("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const data = await request("/api/register", {
            method: "POST",
            body: JSON.stringify({
                username: $("username").value.trim(),
                email: $("reg-email").value.trim(),
                rollNumber: $("roll-number").value.trim()
            })
        });

        $("register-form").reset();

        showSection("login");
        showMessage(data.message);

    } catch (error) {
        showMessage(error.message);
    }
});

// Student Login
$("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const data = await request("/api/login", {
            method: "POST",
            body: JSON.stringify({
                email: $("login-email").value.trim()
            })
        });

        userId = data.userId;

        $("display-name").textContent = data.username;
        $("display-roll").textContent = data.rollNumber;

        updateBalance(data);

        setupDateFields();

        showSection("dashboard");
        showMessage("Login successful");

    } catch (error) {
        showMessage(error.message);
    }
});

// Update Leave Balance
function updateBalance(data) {
    $("casual-balance").textContent = data.casualLeave;
    $("medical-balance").textContent = data.medicalLeave;
}

// Apply for Leave
$("leave-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const fromDate = $("from-date").value;
        const toDate = $("to-date").value;

        if (!fromDate || !toDate) {
            showMessage("Please select both leave dates");
            return;
        }

        if (toDate < fromDate) {
            showMessage("To Date cannot be before From Date");
            return;
        }

        const data = await request(`/api/apply-leave/${userId}`, {
            method: "POST",
            body: JSON.stringify({
                type: $("leave-type").value,
                fromDate: fromDate,
                toDate: toDate,
                reason: $("leave-reason").value.trim()
            })
        });

        $("leave-form").reset();

        $("leave-days").value = "";
        $("date-message").textContent = "";

        setupDateFields();

        showMessage(data.message);

        await loadMyLeaves();

    } catch (error) {
        showMessage(error.message);
    }
});

// Display Student Leave Requests
async function loadMyLeaves() {
    try {
        const leaves = await request(`/api/my-leaves/${userId}`);

        const container = $("my-leaves");

        container.replaceChildren();

        if (leaves.length === 0) {
            container.textContent = "No leave requests yet.";
            return;
        }

        leaves.forEach((leave) => {
            const card = document.createElement("div");

            const details = document.createElement("p");
            const dates = document.createElement("p");
            const reason = document.createElement("p");
            const status = document.createElement("p");

            details.textContent =
                `${leave.type.toUpperCase()} Leave - ${leave.days} day(s)`;

            dates.textContent =
                `From: ${new Date(leave.fromDate).toLocaleDateString()} | To: ${new Date(leave.toDate).toLocaleDateString()}`;

            reason.textContent =
                `Your Reason: ${leave.reason}`;

            status.textContent =
                `Status: ${leave.status}`;

            card.append(details, dates, reason, status);

            if (leave.status === "Pending") {
                status.style.color = "#d97706";
            } else if (leave.status === "Approved") {
                status.style.color = "green";
            } else if (leave.status === "Rejected") {
                status.style.color = "red";

                const rejection = document.createElement("p");

                rejection.textContent =
                    `Staff Rejection Reason: ${leave.rejectionReason || "Not provided"}`;

                rejection.style.color = "red";

                card.appendChild(rejection);
            }

            card.style.border = "1px solid #ccc";
            card.style.borderRadius = "8px";
            card.style.padding = "12px";
            card.style.margin = "12px 0";

            container.appendChild(card);
        });

    } catch (error) {
        showMessage(error.message);
    }
}

// View Leave Status
$("view-my-leaves").addEventListener("click", loadMyLeaves);

// Refresh Leave Balance
$("refresh-balance").addEventListener("click", async () => {
    try {
        const data = await request(`/api/leave-balance/${userId}`);

        updateBalance(data);

        showMessage("Leave balance refreshed");

    } catch (error) {
        showMessage(error.message);
    }
});

// Switch to Login
$("show-login").addEventListener("click", () => {
    showSection("login");
    showMessage("");
});

// Switch to Register
$("show-register").addEventListener("click", () => {
    showSection("register");
    showMessage("");
});

// Logout
$("logout").addEventListener("click", () => {
    userId = "";

    $("login-form").reset();
    $("leave-form").reset();
    $("my-leaves").replaceChildren();

    $("leave-days").value = "";
    $("date-message").textContent = "";

    showSection("login");

    showMessage("Logged out successfully");
});
