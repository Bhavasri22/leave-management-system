
let userId = "";

const API_URL = "https://leave-management-system-l2w3.onrender.com/api";

const $ = (id) => document.getElementById(id);

function showMessage(message) {
    $("message").textContent = message;
}

function showSection(section) {
    $("register-section").hidden = section !== "register";
    $("login-section").hidden = section !== "login";
    $("dashboard").hidden = section !== "dashboard";
}

function getToday() {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function setupDateFields() {
    const today = getToday();

    $("from-date").min = today;
    $("to-date").min = today;
}

function calculateLeaveDays() {
    const fromDate = $("from-date").value;
    const toDate = $("to-date").value;

    $("leave-days").value = "";
    $("date-message").textContent = "";

    if (!fromDate || !toDate) return;

    if (toDate < fromDate) {
        $("date-message").textContent =
            "To Date must be after or equal to From Date.";
        $("date-message").style.color = "red";
        return;
    }

    const start = new Date(fromDate + "T00:00:00");
    const end = new Date(toDate + "T00:00:00");

    const totalDays =
        Math.round((end - start) / 86400000) + 1;

    $("leave-days").value = totalDays;
    $("date-message").textContent = `Total leave days: ${totalDays}`;
    $("date-message").style.color = "green";
}

$("from-date").addEventListener("change", () => {
    const fromDate = $("from-date").value;

    $("to-date").min = fromDate || getToday();

    if ($("to-date").value && $("to-date").value < fromDate) {
        $("to-date").value = "";
    }

    calculateLeaveDays();
});

$("to-date").addEventListener("change", calculateLeaveDays);

// Common API request function
async function request(endpoint, options = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        });
    } catch (error) {
        throw new Error(
            "Cannot connect to backend. Please check Render server."
        );
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        const text = await response.text();

        throw new Error(
            `Backend returned a non-JSON response (${response.status}). Check API route and Render server.`
        );
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
}

// Student Registration
$("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const data = await request("/register", {
            method: "POST",
            body: JSON.stringify({
                username: $("username").value.trim(),
                email: $("reg-email").value.trim(),
                rollNumber: $("roll-number").value.trim()
            })
        });

        $("register-form").reset();

        showSection("login");
        showMessage(data.message || "Registration successful");

    } catch (error) {
        showMessage(error.message);
    }
});

// Student Login
$("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const data = await request("/login", {
            method: "POST",
            body: JSON.stringify({
                email: $("login-email").value.trim()
            })
        });

        userId = data.userId;

        if (!userId) {
            throw new Error("User ID missing from backend response.");
        }

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

        if (!userId) {
            showMessage("Please login first.");
            return;
        }

        const data = await request(`/apply-leave/${userId}`, {
            method: "POST",
            body: JSON.stringify({
                type: $("leave-type").value,
                fromDate,
                toDate,
                reason: $("leave-reason").value.trim()
            })
        });

        $("leave-form").reset();
        $("leave-days").value = "";
        $("date-message").textContent = "";

        setupDateFields();

        showMessage(data.message || "Leave request submitted");

        await loadMyLeaves();

    } catch (error) {
        showMessage(error.message);
    }
});

// Display Student Leave Requests
async function loadMyLeaves() {
    try {
        if (!userId) {
            showMessage("Please login first.");
            return;
        }

        const leaves = await request(`/my-leaves/${userId}`);

        const container = $("my-leaves");
        container.replaceChildren();

        if (!Array.isArray(leaves) || leaves.length === 0) {
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

            reason.textContent = `Your Reason: ${leave.reason}`;
            status.textContent = `Status: ${leave.status}`;

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
        if (!userId) {
            showMessage("Please login first.");
            return;
        }

        const data = await request(`/leave-balance/${userId}`);

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
