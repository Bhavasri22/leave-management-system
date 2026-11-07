
let staffToken = "";
const API_URL = "https://leave-management-system-l2w3.onrender.com";
const $ = (id) => document.getElementById(id);

function showMessage(message) {
    $("staff-message").textContent = message;
}

async function api(url, options = {}) {
    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(staffToken
                ? { Authorization: `Bearer ${staffToken}` }
                : {}),
            ...options.headers
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// Staff Login
$("staff-login-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
        const data = await api("/api/staff/login", {
            method: "POST",
            body: JSON.stringify({
                email: $("staff-email").value.trim(),
                password: $("staff-password").value
            })
        });

        staffToken = data.token;

        $("staff-login").hidden = true;
        $("staff-dashboard").hidden = false;

        showMessage("Staff login successful");

        await loadRequests();

    } catch (error) {
        showMessage(error.message);
    }
});

// Load Student Leave Requests
async function loadRequests() {
    try {
        const leaves = await api("/api/staff/leaves");

        const container = $("requests-list");

        container.replaceChildren();

        if (leaves.length === 0) {
            container.textContent = "No leave requests found.";
            return;
        }

        leaves.forEach((leave) => {
            const card = document.createElement("div");

            const student = document.createElement("h3");
            const type = document.createElement("p");
            const dates = document.createElement("p");
            const days = document.createElement("p");
            const reason = document.createElement("p");
            const status = document.createElement("p");

            student.textContent = leave.userId
                ? `${leave.userId.username} (${leave.userId.rollNumber})`
                : "Student information unavailable";

            type.textContent =
                `Leave Type: ${leave.type}`;

            dates.textContent =
                `From: ${leave.fromDate ? new Date(leave.fromDate).toLocaleDateString() : "Not available"} | To: ${leave.toDate ? new Date(leave.toDate).toLocaleDateString() : "Not available"}`;

            days.textContent =
                `Total Days: ${leave.days}`;

            reason.textContent =
                `Student Reason: ${leave.reason}`;

            status.textContent =
                `Status: ${leave.status}`;

            card.append(
                student,
                type,
                dates,
                days,
                reason,
                status
            );

            card.style.border = "1px solid #cbd5e1";
            card.style.borderRadius = "10px";
            card.style.padding = "16px";
            card.style.margin = "15px 0";
            card.style.background = "#f8fafc";

            if (leave.status === "Pending") {

                const approve = document.createElement("button");

                approve.textContent = "Approve";

                approve.addEventListener("click", () => {
                    decideLeave(leave._id, "Approved");
                });

                const rejectionLabel = document.createElement("label");

                rejectionLabel.textContent =
                    "Reason for Rejection:";

                const rejectionInput = document.createElement("textarea");

                rejectionInput.placeholder =
                    "Enter the reason if you reject this leave";

                rejectionInput.rows = 3;

                rejectionInput.style.width = "100%";
                rejectionInput.style.margin = "10px 0";

                const reject = document.createElement("button");

                reject.textContent = "Reject";
                reject.style.background = "#dc2626";

                reject.addEventListener("click", () => {
                    const rejectionReason =
                        rejectionInput.value.trim();

                    if (!rejectionReason) {
                        showMessage(
                            "Please enter a rejection reason."
                        );
                        rejectionInput.focus();
                        return;
                    }

                    decideLeave(
                        leave._id,
                        "Rejected",
                        rejectionReason
                    );
                });

                card.append(
                    approve,
                    rejectionLabel,
                    rejectionInput,
                    reject
                );

            } else if (leave.status === "Rejected") {

                const rejection = document.createElement("p");

                rejection.textContent =
                    `Rejection Reason: ${leave.rejectionReason || "Not provided"}`;

                rejection.style.color = "red";

                card.appendChild(rejection);

            }

            container.appendChild(card);
        });

    } catch (error) {
        showMessage(error.message);
    }
}

// Approve or Reject Leave
async function decideLeave(leaveId, decision, rejectionReason = "") {
    try {
        const data = await api(
            `/api/staff/leaves/${leaveId}/decision`,
            {
                method: "POST",
                body: JSON.stringify({
                    decision,
                    rejectionReason
                })
            }
        );

        showMessage(data.message);

        await loadRequests();

    } catch (error) {
        showMessage(error.message);
    }
}

// Refresh Requests
$("load-requests").addEventListener("click", loadRequests);

// Staff Logout
$("staff-logout").addEventListener("click", () => {
    staffToken = "";

    $("staff-login-form").reset();

    $("staff-login").hidden = false;
    $("staff-dashboard").hidden = true;

    $("requests-list").replaceChildren();

    showMessage("Logged out successfully");
});
