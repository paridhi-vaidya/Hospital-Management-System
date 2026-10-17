
"use strict";

// ==========================================
// 1. BACKEND API CONFIGURATION
// ==========================================

const API_BASE_URL = "http://localhost:3000/api";

// ==========================================
// 2. GET HTML ELEMENTS
// ==========================================

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("main section");

const pageTitle = document.getElementById("page-title");

const patientCount = document.getElementById("patient-count");
const doctorCount = document.getElementById("doctor-count");
const appointmentCount = document.getElementById("appointment-count");
const billCount = document.getElementById("bill-count");

const recentPatients = document.getElementById("recent-patients");
const patientTable = document.getElementById("patient-table");

const patientForm = document.getElementById("patient-form");
const patientFormPanel = document.getElementById("patient-form-panel");
const showPatientFormButton = document.getElementById("show-patient-form");
const cancelPatientButton = document.getElementById("cancel-patient");
const patientMessage = document.getElementById("patient-message");

const patientSearch = document.getElementById("patient-search");
const refreshPatientsButton = document.getElementById("refresh-patients");

// ==========================================
// 3. APPLICATION STATE
// ==========================================

let patients = [];

const sectionTitles = {
    dashboard: "Dashboard Overview",
    patients: "Patient Management",
    doctors: "Doctor Management",
    appointments: "Appointment Management",
    billing: "Billing Management"
};

// ==========================================
// 4. HELPER FUNCTIONS
// ==========================================

// Safely create a table cell containing text.
function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent =
        value === null || value === undefined || value === ""
            ? "—"
            : String(value);

    return cell;
}

// Display a message below the patient form.
function showPatientMessage(message, type = "success") {
    if (!patientMessage) return;

    patientMessage.textContent = message;
    patientMessage.className = `message ${type}`;
}

// Format a date for display.
function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString();
}

// Display an error in the browser console and show a friendly message.
function handleError(error, userMessage) {
    console.error(userMessage, error);
    showPatientMessage(userMessage, "error");
}

// ==========================================
// 5. PAGE NAVIGATION
// ==========================================

function showSection(sectionId) {
    const targetSection = document.getElementById(sectionId);

    if (!targetSection) {
        console.warn(`Section "${sectionId}" was not found.`);
        return;
    }

    // Hide all sections and display the selected section.
    sections.forEach((section) => {
        section.hidden = section.id !== sectionId;
    });

    // Update the selected sidebar link.
    navLinks.forEach((link) => {
        const isActive = link.dataset.section === sectionId;

        link.classList.toggle("active", isActive);

        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    // Update the page heading.
    if (pageTitle) {
        pageTitle.textContent =
            sectionTitles[sectionId] || "Hospital Management System";
    }

    // Refresh patient data when opening the patient section.
    if (sectionId === "patients") {
        loadPatients();
    }
}

// Handle sidebar navigation.
navLinks.forEach((link) => {
    link.addEventListener("click", () => {
        showSection(link.dataset.section);
    });
});

// Handle buttons that navigate to another section.
document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => {
        showSection(button.dataset.go);
    });
});

// ==========================================
// 6. SHOW AND HIDE THE PATIENT FORM
// ==========================================

function openPatientForm() {
    if (patientFormPanel) {
        patientFormPanel.hidden = false;
    }

    if (patientForm) {
        const nameInput = patientForm.elements.namedItem("full_name");

        if (nameInput) {
            nameInput.focus();
        }
    }

    if (patientMessage) {
        patientMessage.textContent = "";
        patientMessage.className = "message";
    }
}

function closePatientForm() {
    if (patientFormPanel) {
        patientFormPanel.hidden = true;
    }

    if (patientForm) {
        patientForm.reset();
    }

    if (patientMessage) {
        patientMessage.textContent = "";
        patientMessage.className = "message";
    }
}

if (showPatientFormButton) {
    showPatientFormButton.addEventListener("click", openPatientForm);
}

if (cancelPatientButton) {
    cancelPatientButton.addEventListener("click", closePatientForm);
}

// ==========================================
// 7. LOAD PATIENTS FROM THE BACKEND
// ==========================================

async function loadPatients() {
    if (patientTable) {
        patientTable.replaceChildren();

        const loadingRow = document.createElement("tr");
        const loadingCell = document.createElement("td");

        loadingCell.colSpan = 6;
        loadingCell.textContent = "Loading patients...";
        loadingRow.appendChild(loadingCell);
        patientTable.appendChild(loadingRow);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/patients`);

        if (!response.ok) {
            throw new Error(`Server returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("The server did not return a patient list.");
        }

        patients = data;

        renderPatientTable(patients);
        renderRecentPatients(patients);
        updateDashboardCounts();

        if (patientMessage && patientMessage.classList.contains("error")) {
            patientMessage.textContent = "";
            patientMessage.className = "message";
        }
    } catch (error) {
        console.error("Unable to load patients:", error);

        patients = [];
        renderPatientTable([]);
        renderRecentPatients([]);
        updateDashboardCounts();

        if (patientTable) {
            patientTable.replaceChildren();

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.textContent =
                "Could not load patients. Check that the backend and database are running.";

            row.appendChild(cell);
            patientTable.appendChild(row);
        }

        showPatientMessage(
            "Unable to connect to the backend. Make sure your server is running on port 5000.",
            "error"
        );
    }
}

// ==========================================
// 8. DISPLAY ALL PATIENTS
// ==========================================

function renderPatientTable(patientList) {
    if (!patientTable) return;

    patientTable.replaceChildren();

    if (patientList.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = "No patients found.";

        row.appendChild(cell);
        patientTable.appendChild(row);
        return;
    }

    patientList.forEach((patient) => {
        const row = document.createElement("tr");

        row.appendChild(createCell(patient.patient_id));
        row.appendChild(createCell(patient.full_name));
        row.appendChild(createCell(patient.age));
        row.appendChild(createCell(patient.gender));
        row.appendChild(createCell(patient.phone));
        row.appendChild(createCell(patient.address));

        patientTable.appendChild(row);
    });
}

// ==========================================
// 9. DISPLAY RECENT PATIENTS ON DASHBOARD
// ==========================================

function renderRecentPatients(patientList) {
    if (!recentPatients) return;

    recentPatients.replaceChildren();

    // The backend returns newest patients first.
    const recentList = patientList.slice(0, 5);

    if (recentList.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No recent patients.";

        row.appendChild(cell);
        recentPatients.appendChild(row);
        return;
    }

    recentList.forEach((patient) => {
        const row = document.createElement("tr");

        row.appendChild(createCell(patient.patient_id));
        row.appendChild(createCell(patient.full_name));
        row.appendChild(createCell(patient.age));
        row.appendChild(createCell(patient.gender));
        row.appendChild(createCell(patient.phone));

        recentPatients.appendChild(row);
    });
}

// ==========================================
// 10. UPDATE DASHBOARD COUNTS
// ==========================================

function updateDashboardCounts() {
    if (patientCount) {
        patientCount.textContent = patients.length;
    }

    // These modules are placeholders until doctor,
    // appointment, and billing APIs are implemented.
    if (doctorCount) {
        doctorCount.textContent = "0";
    }

    if (appointmentCount) {
        appointmentCount.textContent = "0";
    }

    if (billCount) {
        billCount.textContent = "0";
    }
}

// ==========================================
// 11. SEARCH PATIENTS
// ==========================================

if (patientSearch) {
    patientSearch.addEventListener("input", () => {
        const searchTerm = patientSearch.value.trim().toLowerCase();

        const filteredPatients = patients.filter((patient) => {
            const name = String(patient.full_name || "").toLowerCase();
            const id = String(patient.patient_id || "").toLowerCase();
            const phone = String(patient.phone || "").toLowerCase();

            return (
                name.includes(searchTerm) ||
                id.includes(searchTerm) ||
                phone.includes(searchTerm)
            );
        });

        renderPatientTable(filteredPatients);
    });
}

// ==========================================
// 12. REGISTER A NEW PATIENT
// ==========================================

if (patientForm) {
    patientForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(patientForm);

        const fullName = String(formData.get("full_name") || "").trim();
        const ageValue = String(formData.get("age") || "").trim();
        const gender = String(formData.get("gender") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const address = String(formData.get("address") || "").trim();

        const age = Number(ageValue);

        // Basic client-side validation.
        if (!fullName) {
            showPatientMessage("Please enter the patient's full name.", "error");
            return;
        }

        if (
            ageValue === "" ||
            !Number.isInteger(age) ||
            age < 0 ||
            age > 130
        ) {
            showPatientMessage(
                "Please enter a valid age between 0 and 130.",
                "error"
            );
            return;
        }

        const patientData = {
            full_name: fullName,
            age: age,
            gender: gender,
            phone: phone,
            address: address
        };

        const submitButton = patientForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/patients`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(patientData)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.error || result.message ||
                    `Server returned HTTP ${response.status}`
                );
            }

            showPatientMessage("Patient registered successfully!", "success");

            patientForm.reset();

            // Reload the patient list and dashboard counts.
            await loadPatients();

            // Keep the form panel open so the user can add another patient.
            if (patientFormPanel) {
                patientFormPanel.hidden = false;
            }

            showPatientMessage("Patient registered successfully!", "success");
        } catch (error) {
            handleError(
                error,
                error.message ||
                    "Unable to register the patient. Please try again."
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}

// ==========================================
// 13. REFRESH PATIENT LIST
// ==========================================

if (refreshPatientsButton) {
    refreshPatientsButton.addEventListener("click", () => {
        loadPatients();
    });
}

// ==========================================
// 14. INITIALIZE THE APPLICATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // Start on the dashboard.
    showSection("dashboard");

    // Fetch the patient list from the backend.
    loadPatients();
});

/* =========================================
   DOCTOR MANAGEMENT
========================================= */

const doctorForm = document.getElementById("doctor-form");
const doctorTable = document.getElementById("doctor-table");
const doctorMessage = document.getElementById("doctor-message");
const refreshDoctorsButton = document.getElementById("refresh-doctors");

const doctorApiUrl = `${API_BASE_URL}/doctors`;

let doctors = [];

// Display a message
function showDoctorMessage(message, type = "success") {
    if (!doctorMessage) return;

    doctorMessage.textContent = message;
    doctorMessage.className = `message ${type}`;
}

// Create a table cell safely
function createDoctorCell(value) {
    const cell = document.createElement("td");

    cell.textContent =
        value === null || value === undefined || value === ""
            ? "—"
            : String(value);

    return cell;
}

// Fetch doctors from MySQL through the backend
async function loadDoctors() {
    if (!doctorTable) return;

    doctorTable.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");

    loadingCell.colSpan = 5;
    loadingCell.textContent = "Loading doctors...";

    loadingRow.appendChild(loadingCell);
    doctorTable.appendChild(loadingRow);

    try {
        const response = await fetch(doctorApiUrl);

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        doctors = await response.json();

        renderDoctors(doctors);

        if (doctorMessage && doctorMessage.classList.contains("error")) {
            showDoctorMessage("", "");
        }
    } catch (error) {
        console.error("Could not load doctors:", error);

        doctorTable.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent =
            "Unable to load doctors. Check that the backend is running.";

        row.appendChild(cell);
        doctorTable.appendChild(row);

        showDoctorMessage(
            "Could not fetch doctors. Please check your backend.",
            "error"
        );
    }
}

// Display doctors in the table
function renderDoctors(doctorList) {
    if (!doctorTable) return;

    doctorTable.replaceChildren();

    if (doctorList.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No doctors registered yet.";

        row.appendChild(cell);
        doctorTable.appendChild(row);
        return;
    }

    doctorList.forEach((doctor) => {
        const row = document.createElement("tr");

        row.appendChild(createDoctorCell(doctor.doctor_id));
        row.appendChild(createDoctorCell(doctor.full_name));
        row.appendChild(createDoctorCell(doctor.specialization));
        row.appendChild(createDoctorCell(doctor.phone));
        row.appendChild(createDoctorCell(doctor.email));

        doctorTable.appendChild(row);
    });
}

// Save a new doctor
if (doctorForm) {
    doctorForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(doctorForm);

        const doctorData = {
            full_name: String(formData.get("full_name") || "").trim(),
            specialization: String(
                formData.get("specialization") || ""
            ).trim(),
            phone: String(formData.get("phone") || "").trim(),
            email: String(formData.get("email") || "").trim()
        };

        if (!doctorData.full_name) {
            showDoctorMessage(
                "Please enter the doctor's name.",
                "error"
            );
            return;
        }

        const saveButton = document.getElementById("save-doctor-button");

        if (saveButton) saveButton.disabled = true;

        try {
            const response = await fetch(doctorApiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(doctorData)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    result.error || "Could not save doctor."
                );
            }

            doctorForm.reset();

            showDoctorMessage(
                "Doctor registered successfully!",
                "success"
            );

            await loadDoctors();
        } catch (error) {
            console.error("Doctor registration failed:", error);

            showDoctorMessage(
                error.message || "Could not register doctor.",
                "error"
            );
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    });
}

// Refresh button
if (refreshDoctorsButton) {
    refreshDoctorsButton.addEventListener("click", loadDoctors);
}

// Load doctors when the Doctors sidebar item is clicked
document.querySelectorAll('.nav-link[data-section="doctors"]')
    .forEach((link) => {
        link.addEventListener("click", loadDoctors);
    });

// Load doctors when the page opens
loadDoctors();

/* =========================================
   APPOINTMENT MANAGEMENT
========================================= */

const appointmentForm = document.getElementById("appointment-form");
const appointmentTable = document.getElementById("appointment-table");
const appointmentMessage = document.getElementById("appointment-message");
const appointmentPatientSelect = document.getElementById("appointment-patient");
const appointmentDoctorSelect = document.getElementById("appointment-doctor");
const refreshAppointmentsButton = document.getElementById("refresh-appointments");
const saveAppointmentButton = document.getElementById("save-appointment-button");

let appointments = [];

function showAppointmentMessage(message, type = "success") {
    if (!appointmentMessage) return;

    appointmentMessage.textContent = message;
    appointmentMessage.className = `message ${type}`;
}

function createAppointmentCell(value) {
    const cell = document.createElement("td");

    cell.textContent =
        value === null || value === undefined || value === ""
            ? "—"
            : String(value);

    return cell;
}

// Avoid timezone shifts when displaying a MySQL date.
function displayAppointmentDate(value) {
    if (!value) return "—";

    const datePart = String(value).slice(0, 10);
    const parts = datePart.split("-");

    if (parts.length !== 3) return datePart;

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function displayAppointmentTime(value) {
    if (!value) return "—";

    return String(value).slice(0, 5);
}

// Populate a dropdown using API data.
function fillAppointmentSelect(select, records, idKey, labelFunction, placeholder) {
    if (!select) return;

    select.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = placeholder;
    select.appendChild(defaultOption);

    records.forEach((record) => {
        const option = document.createElement("option");
        option.value = record[idKey];
        option.textContent = labelFunction(record);
        select.appendChild(option);
    });
}

// Load patients and doctors for the booking form.
async function loadAppointmentOptions() {
    try {
        const [patientResponse, doctorResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/appointment-options/patients`),
            fetch(`${API_BASE_URL}/appointment-options/doctors`)
        ]);

        if (!patientResponse.ok || !doctorResponse.ok) {
            throw new Error("Could not load patients or doctors.");
        }

        const patientRecords = await patientResponse.json();
        const doctorRecords = await doctorResponse.json();

        fillAppointmentSelect(
            appointmentPatientSelect,
            patientRecords,
            "patient_id",
            (patient) => `${patient.full_name} (ID: ${patient.patient_id})`,
            patientRecords.length ? "Choose a patient" : "No patients registered"
        );

        fillAppointmentSelect(
            appointmentDoctorSelect,
            doctorRecords,
            "doctor_id",
            (doctor) =>
                doctor.specialization
                    ? `${doctor.full_name} — ${doctor.specialization}`
                    : doctor.full_name,
            doctorRecords.length ? "Choose a doctor" : "No doctors registered"
        );
    } catch (error) {
        console.error("Appointment options error:", error);

        fillAppointmentSelect(
            appointmentPatientSelect, [], "patient_id",
            () => "", "Could not load patients"
        );

        fillAppointmentSelect(
            appointmentDoctorSelect, [], "doctor_id",
            () => "", "Could not load doctors"
        );

        showAppointmentMessage(
            "Could not load patient and doctor lists. Check the backend.",
            "error"
        );
    }
}

// Fetch all appointments from the database.
async function loadAppointments() {
    if (!appointmentTable) return;

    appointmentTable.replaceChildren();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");
    loadingCell.colSpan = 7;
    loadingCell.textContent = "Loading appointments...";
    loadingRow.appendChild(loadingCell);
    appointmentTable.appendChild(loadingRow);

    try {
        const response = await fetch(`${API_BASE_URL}/appointments`);

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        appointments = await response.json();
        renderAppointments(appointments);

        if (appointmentMessage?.classList.contains("error")) {
            showAppointmentMessage("", "");
        }
    } catch (error) {
        console.error("Fetch appointments error:", error);

        appointmentTable.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = "Unable to load appointments.";

        row.appendChild(cell);
        appointmentTable.appendChild(row);

        showAppointmentMessage(
            "Could not fetch appointments. Check the backend.",
            "error"
        );
    }
}

// Render appointment rows and status controls.
function renderAppointments(list) {
    if (!appointmentTable) return;

    appointmentTable.replaceChildren();

    if (!list.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = "No appointments booked yet.";

        row.appendChild(cell);
        appointmentTable.appendChild(row);
        return;
    }

    list.forEach((appointment) => {
        const row = document.createElement("tr");

        row.appendChild(createAppointmentCell(appointment.appointment_id));
        row.appendChild(createAppointmentCell(appointment.patient_name));
        row.appendChild(createAppointmentCell(appointment.doctor_name));
        row.appendChild(createAppointmentCell(
            displayAppointmentDate(appointment.appointment_date)
        ));
        row.appendChild(createAppointmentCell(
            displayAppointmentTime(appointment.appointment_time)
        ));
        row.appendChild(createAppointmentCell(appointment.reason));

        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");

        ["Scheduled", "Completed", "Cancelled"].forEach((status) => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            statusSelect.appendChild(option);
        });

        statusSelect.value = appointment.status;
        statusSelect.setAttribute(
            "aria-label",
            `Status for appointment ${appointment.appointment_id}`
        );

        statusSelect.addEventListener("change", async () => {
            const newStatus = statusSelect.value;
            statusSelect.disabled = true;

            try {
                const response = await fetch(
                    `${API_BASE_URL}/appointments/${appointment.appointment_id}/status`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ status: newStatus })
                    }
                );

                const result = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(result.error || "Status update failed.");
                }

                appointment.status = newStatus;
                showAppointmentMessage(
                    `Appointment #${appointment.appointment_id} updated.`,
                    "success"
                );
            } catch (error) {
                console.error("Status update error:", error);

                statusSelect.value = appointment.status;

                showAppointmentMessage(
                    error.message || "Could not update appointment status.",
                    "error"
                );
            } finally {
                statusSelect.disabled = false;
            }
        });

        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);
        appointmentTable.appendChild(row);
    });
}

// Save a new appointment.
if (appointmentForm) {
    appointmentForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(appointmentForm);

        const appointmentData = {
            patient_id: formData.get("patient_id"),
            doctor_id: formData.get("doctor_id"),
            appointment_date: formData.get("appointment_date"),
            appointment_time: formData.get("appointment_time"),
            reason: String(formData.get("reason") || "").trim()
        };

        if (!appointmentData.patient_id || !appointmentData.doctor_id) {
            showAppointmentMessage(
                "Please select both a patient and a doctor.",
                "error"
            );
            return;
        }

        if (!appointmentData.appointment_date || !appointmentData.appointment_time) {
            showAppointmentMessage(
                "Please select an appointment date and time.",
                "error"
            );
            return;
        }

        if (saveAppointmentButton) {
            saveAppointmentButton.disabled = true;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/appointments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(appointmentData)
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.error || "Could not book appointment.");
            }

            appointmentForm.reset();

            showAppointmentMessage(
                `Appointment booked successfully! ID: ${result.appointment_id}`,
                "success"
            );

            await loadAppointments();
        } catch (error) {
            console.error("Book appointment error:", error);

            showAppointmentMessage(
                error.message || "Could not book appointment.",
                "error"
            );
        } finally {
            if (saveAppointmentButton) {
                saveAppointmentButton.disabled = false;
            }
        }
    });
}

// Refresh button.
if (refreshAppointmentsButton) {
    refreshAppointmentsButton.addEventListener("click", async () => {
        await loadAppointmentOptions();
        await loadAppointments();
    });
}

// Load appointment data when the sidebar item is clicked.
document.querySelectorAll('.nav-link[data-section="appointments"]')
    .forEach((link) => {
        link.addEventListener("click", async () => {
            await loadAppointmentOptions();
            await loadAppointments();
        });
    });

// Set today's date as the earliest selectable date.
const appointmentDateInput = document.getElementById("appointment-date");

if (appointmentDateInput) {
    const today = new Date();
    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    appointmentDateInput.min = localToday;
}

// Load data on startup.
loadAppointmentOptions();
loadAppointments();

/* =========================
   BILLING MODULE FRONTEND
========================= */

const billApiUrl = `${API_BASE_URL}/bills`;

const billingPatientsUrl =
    `${API_BASE_URL}/billing-options/patients`;

const billingAppointmentsUrl =
    `${API_BASE_URL}/billing-options/appointments`;

const billForm = document.getElementById("bill-form");
const billPatientSelect = document.getElementById("bill-patient");
const billAppointmentSelect =
    document.getElementById("bill-appointment");
const billMessage = document.getElementById("bill-message");
const billTable = document.getElementById("bill-table");


// Set today's date as the default bill date
const billDateInput = document.getElementById("bill-date");

if (billDateInput) {
    billDateInput.value = new Date().toLocaleDateString("en-CA");
}


// Load patients into the dropdown
async function loadBillingPatients() {
    try {
        const response = await fetch(billingPatientsUrl);

        if (!response.ok) {
            throw new Error("Could not load patients.");
        }

        const patients = await response.json();

        billPatientSelect.innerHTML =
            '<option value="">Select patient</option>';

        patients.forEach(patient => {
            const option = document.createElement("option");

            option.value = patient.patient_id;
            option.textContent =
                `${patient.full_name} (ID: ${patient.patient_id})`;

            billPatientSelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        billMessage.textContent = "Unable to load patients.";
    }
}


// Load appointments into the dropdown
async function loadBillingAppointments() {
    try {
        const response = await fetch(billingAppointmentsUrl);

        if (!response.ok) {
            throw new Error("Could not load appointments.");
        }

        const appointments = await response.json();

        billAppointmentSelect.innerHTML =
            '<option value="">No appointment linked</option>';

        appointments.forEach(appointment => {
            const option = document.createElement("option");

            option.value = appointment.appointment_id;
            option.dataset.patientId = appointment.patient_id;

            option.textContent =
                `#${appointment.appointment_id} - ` +
                `${appointment.patient_name} - ` +
                `${appointment.doctor_name} - ` +
                `${String(appointment.appointment_date).slice(0, 10)}`;

            billAppointmentSelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        billMessage.textContent = "Unable to load appointments.";
    }
}


// Only show appointments belonging to the selected patient
function filterBillingAppointments() {
    const selectedPatientId = billPatientSelect.value;

    billAppointmentSelect.value = "";

    Array.from(billAppointmentSelect.options).forEach(option => {
        if (!option.value) {
            option.hidden = false;
            return;
        }

        option.hidden =
            selectedPatientId !== "" &&
            option.dataset.patientId !== selectedPatientId;
    });
}

billPatientSelect.addEventListener(
    "change",
    filterBillingAppointments
);


// Load and display bills
async function loadBills() {
    billTable.innerHTML =
        '<tr><td colspan="8">Loading bills...</td></tr>';

    try {
        const response = await fetch(billApiUrl);

        if (!response.ok) {
            throw new Error("Could not load bills.");
        }

        const bills = await response.json();

        billTable.innerHTML = "";

        if (bills.length === 0) {
            billTable.innerHTML =
                '<tr><td colspan="8">No bills found. Create your first bill above.</td></tr>';
            return;
        }

        bills.forEach(bill => {
            const row = document.createElement("tr");

            const cells = [
                bill.bill_id,
                bill.patient_name,
                bill.appointment_id
                    ? `#${bill.appointment_id}`
                    : "—",
                `₹${Number(bill.amount).toFixed(2)}`,
                bill.payment_method || "—",
                String(bill.bill_date).slice(0, 10),
                bill.payment_status
            ];

            cells.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            const actionCell = document.createElement("td");
            const statusSelect = document.createElement("select");

            [
                "Pending",
                "Paid",
                "Partially Paid"
            ].forEach(status => {
                const option = document.createElement("option");
                option.value = status;
                option.textContent = status;
                statusSelect.appendChild(option);
            });

            statusSelect.value = bill.payment_status;

            const updateButton = document.createElement("button");
            updateButton.type = "button";
            updateButton.textContent = "Update";

            updateButton.addEventListener("click", async () => {
                updateButton.disabled = true;

                try {
                    const updateResponse = await fetch(
                        `${billApiUrl}/${bill.bill_id}/status`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                payment_status: statusSelect.value
                            })
                        }
                    );

                    const result = await updateResponse.json();

                    if (!updateResponse.ok) {
                        throw new Error(
                            result.message || "Status update failed."
                        );
                    }

                    billMessage.textContent = result.message;
                    await loadBills();
                } catch (error) {
                    billMessage.textContent = error.message;
                } finally {
                    updateButton.disabled = false;
                }
            });

            actionCell.appendChild(statusSelect);
            actionCell.appendChild(updateButton);
            row.appendChild(actionCell);

            billTable.appendChild(row);
        });
    } catch (error) {
        console.error(error);

        billTable.innerHTML =
            '<tr><td colspan="8">Failed to load bills. Check the backend.</td></tr>';
    }
}


// Create a new bill
billForm.addEventListener("submit", async event => {
    event.preventDefault();

    billMessage.textContent = "";

    const patientId = billPatientSelect.value;
    const appointmentId = billAppointmentSelect.value;

    const billData = {
        patient_id: Number(patientId),
        appointment_id: appointmentId
            ? Number(appointmentId)
            : null,
        amount: Number(document.getElementById("bill-amount").value),
        payment_status: document.getElementById("bill-status").value,
        payment_method:
            document.getElementById("bill-method").value || null,
        bill_date: billDateInput.value
    };

    const saveButton = document.getElementById("save-bill-button");
    saveButton.disabled = true;

    try {
        const response = await fetch(billApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(billData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to create bill.");
        }

        billMessage.textContent =
            `Success! ${result.message} Bill ID: ${result.bill_id}`;

        billForm.reset();

        if (billDateInput) {
            billDateInput.value = new Date().toLocaleDateString("en-CA");
        }

        filterBillingAppointments();

        await loadBills();
    } catch (error) {
        console.error(error);
        billMessage.textContent = error.message;
    } finally {
        saveButton.disabled = false;
    }
});


// Refresh button
document.getElementById("refresh-bills").addEventListener(
    "click",
    async () => {
        await Promise.all([
            loadBillingPatients(),
            loadBillingAppointments(),
            loadBills()
        ]);
    }
);


// Initial billing page data
loadBillingPatients();
loadBillingAppointments();
loadBills();
async function loadDashboardCounts(){
    try{
        const[patients,doctors,appointments,bills]=await Promise.all([
            fetch('http://loaclhost:3000/api/patients').then(r=>r.json()),
            fetch('http://loaclhost:3000/api/doctors').then(r=>r.json()),
            fetch('http://loaclhost:3000/api/appointments').then(r=>r.json()),
            fetch('http://loaclhost:3000/api/bills').then(r=>r.json()),
        ]);
        document.getElementById('totalPatient').textContent=patients.length;
        document.getElementById('totalDoctors').textContent=doctors.length;
        document.getElementById('totalAppointments').textContent=appointments.length;
        document.getElementById('totalBills').textContent=bills.length;

    }catch(err){
        console.error('Dashboard error:',err);
    }
}
loadDashboardCounts();

async function loadDashboardStats() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/dashboard-stats`
        );

        if (!response.ok) {
            throw new Error("Failed to load dashboard statistics");
        }

        const stats = await response.json();

        console.log("Dashboard stats:", stats);

        document.getElementById("total-patients").textContent =
            stats.totalPatients;

        document.getElementById("total-doctors").textContent =
            stats.totalDoctors;

        document.getElementById("total-appointments").textContent =
            stats.totalAppointments;

        document.getElementById("total-bills").textContent =
            stats.totalBills;

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDashboardStats();
});
