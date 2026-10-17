require('dotenv').config();
const express=require('express');
const cors=require("cors");
const pool=require("./db");
const app=express();
app.use(express.json());
app.use(cors());
//1.health check route

app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT DATABASE() AS db"
        );

        res.json({
            status: "success",
            message: "Backend connected to MySQL!",
            database: rows[0].db
        });
    } catch (error) {
        console.error("Database error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Database connection failed",
            details: error.message
        });
    }
});

//2.get all patients route
app.get("/api/patients",async(req,res)=>{
    try{
        const [patients]=await pool.query('select * from patients');
        res.json(patients);
    }catch(error){
        console.error(error.message);
        res.status(500).json({
            error: "could not retrieve patients"
        });
    }
});
//3.post new patient route
app.post('/api/patients',async(req,res)=>{
    try{
        const {full_name,age,gender,phone,address}=req.body;
        const sql="insert into patients(full_name,age,gender,phone,address)values(?,?,?,?,?)";
        const[result]=await pool.query(sql,[full_name,age,gender,phone,address]);
        res.status(201).json({
            success:true,
            message:'patient registered successfully!',
            patientID: result.insertId
        });
    }catch(err){
        console.error('patient registration error:',err.message);
        res.status(500).json({success:false,message:'failed to register patient'});
    }
});

/* GET: Fetch all doctors */
app.get("/api/doctors", async (req, res) => {
    try {
        const [doctors] = await pool.query(`
            SELECT
                doctor_id,
                full_name,
                specialization,
                phone,
                email,
                department_id,
                created_at
            FROM doctors
            ORDER BY doctor_id DESC
        `);

        res.json(doctors);
    } catch (error) {
        console.error("Fetch doctors error:", error.message);

        res.status(500).json({
            error: "Could not fetch doctors."
        });
    }
});

/* POST: Save a new doctor */
app.post("/api/doctors", async (req, res) => {
    try {
        const { full_name, specialization, phone, email } = req.body;

        if (
            typeof full_name !== "string" ||
            !full_name.trim()
        ) {
            return res.status(400).json({
                error: "Doctor's full name is required."
            });
        }

        const [result] = await pool.query(
            `INSERT INTO doctors
                (full_name, specialization, phone, email)
             VALUES (?, ?, ?, ?)`,
            [
                full_name.trim(),
                specialization?.trim() || null,
                phone?.trim() || null,
                email?.trim() || null
            ]
        );

        res.status(201).json({
            message: "Doctor registered successfully.",
            doctor_id: result.insertId
        });
    } catch (error) {
        console.error("Save doctor error:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "This email address is already registered."
            });
        }

        res.status(500).json({
            error: "Could not save doctor."
        });
    }
});

/* =========================================
   APPOINTMENTS API
========================================= */

// GET: Fetch patients for the appointment form
app.get("/api/appointment-options/patients", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT patient_id, full_name
             FROM patients
             ORDER BY full_name`
        );

        res.json(rows);
    } catch (error) {
        console.error("Fetch appointment patients:", error.message);
        res.status(500).json({ error: "Could not load patients." });
    }
});

// GET: Fetch doctors for the appointment form
app.get("/api/appointment-options/doctors", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT doctor_id, full_name, specialization
             FROM doctors
             ORDER BY full_name`
        );

        res.json(rows);
    } catch (error) {
        console.error("Fetch appointment doctors:", error.message);
        res.status(500).json({ error: "Could not load doctors." });
    }
});

// GET: Fetch appointments with patient and doctor names
app.get("/api/appointments", async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                a.appointment_id,
                a.patient_id,
                p.full_name AS patient_name,
                a.doctor_id,
                d.full_name AS doctor_name,
                d.specialization,
                a.appointment_date,
                a.appointment_time,
                a.reason,
                a.status,
                a.created_at
            FROM appointments a
            INNER JOIN patients p
                ON a.patient_id = p.patient_id
            INNER JOIN doctors d
                ON a.doctor_id = d.doctor_id
            ORDER BY a.appointment_date DESC,
                     a.appointment_time DESC
        `);

        res.json(rows);
    } catch (error) {
        console.error("Fetch appointments:", error.message);
        res.status(500).json({ error: "Could not fetch appointments." });
    }
});

// POST: Create an appointment
app.post("/api/appointments", async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            reason
        } = req.body;

        const patientId = Number(patient_id);
        const doctorId = Number(doctor_id);

        if (
            !Number.isInteger(patientId) || patientId <= 0 ||
            !Number.isInteger(doctorId) || doctorId <= 0
        ) {
            return res.status(400).json({
                error: "Please select a valid patient and doctor."
            });
        }

        if (
            typeof appointment_date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(appointment_date) ||
            !Number.isFinite(Date.parse(appointment_date + "T00:00:00Z")) ||
            new Date(appointment_date + "T00:00:00Z")
                .toISOString().slice(0, 10) !== appointment_date
        ) {
            return res.status(400).json({
                error: "Please provide a valid appointment date."
            });
        }

        if (
            typeof appointment_time !== "string" ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(appointment_time)
        ) {
            return res.status(400).json({
                error: "Please provide a valid appointment time."
            });
        }

        const [patientRows] = await pool.query(
            "SELECT patient_id FROM patients WHERE patient_id = ?",
            [patientId]
        );

        if (patientRows.length === 0) {
            return res.status(400).json({
                error: "The selected patient does not exist."
            });
        }

        const [doctorRows] = await pool.query(
            "SELECT doctor_id FROM doctors WHERE doctor_id = ?",
            [doctorId]
        );

        if (doctorRows.length === 0) {
            return res.status(400).json({
                error: "The selected doctor does not exist."
            });
        }

        const [result] = await pool.query(
            `INSERT INTO appointments
                (patient_id, doctor_id, appointment_date,
                 appointment_time, reason)
             VALUES (?, ?, ?, ?, ?)`,
            [
                patientId,
                doctorId,
                appointment_date,
                appointment_time,
                typeof reason === "string" && reason.trim()
                    ? reason.trim()
                    : null
            ]
        );

        res.status(201).json({
            message: "Appointment created successfully.",
            appointment_id: result.insertId
        });
    } catch (error) {
        console.error("Create appointment:", error.message);
        res.status(500).json({
            error: "Could not create the appointment."
        });
    }
});

// PATCH: Update appointment status
app.patch("/api/appointments/:id/status", async (req, res) => {
    try {
        const appointmentId = Number(req.params.id);
        const { status } = req.body;

        const allowedStatuses = [
            "Scheduled",
            "Completed",
            "Cancelled"
        ];

        if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
            return res.status(400).json({
                error: "Invalid appointment ID."
            });
        }

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                error: "Invalid appointment status."
            });
        }

        const [result] = await pool.query(
            "UPDATE appointments SET status = ? WHERE appointment_id = ?",
            [status, appointmentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: "Appointment not found."
            });
        }

        res.json({ message: "Appointment status updated." });
    } catch (error) {
        console.error("Update appointment:", error.message);
        res.status(500).json({
            error: "Could not update appointment status."
        });
    }
});

/* =========================
   BILLING MODULE API ROUTES
========================= */

// Get patients for the billing form
app.get("/api/billing-options/patients", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT patient_id, full_name
             FROM patients
             ORDER BY full_name ASC`
        );

        res.json(rows);
    } catch (error) {
        console.error("Error loading billing patients:", error.message);
        res.status(500).json({
            message: "Failed to load patients"
        });
    }
});


// Get appointments for the billing form
app.get("/api/billing-options/appointments", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                a.appointment_id,
                a.patient_id,
                a.appointment_date,
                a.appointment_time,
                p.full_name AS patient_name,
                d.full_name AS doctor_name
             FROM appointments a
             JOIN patients p
                ON a.patient_id = p.patient_id
             JOIN doctors d
                ON a.doctor_id = d.doctor_id
             WHERE a.status != 'Cancelled'
             ORDER BY a.appointment_date DESC,
                      a.appointment_time DESC`
        );

        res.json(rows);
    } catch (error) {
        console.error("Error loading billing appointments:", error.message);
        res.status(500).json({
            message: "Failed to load appointments"
        });
    }
});


// Get all bills
app.get("/api/bills", async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT
                b.bill_id,
                b.patient_id,
                b.appointment_id,
                b.amount,
                b.payment_status,
                b.payment_method,
                b.bill_date,
                b.created_at,
                p.full_name AS patient_name,
                a.appointment_date,
                d.full_name AS doctor_name
             FROM bills b
             JOIN patients p
                ON b.patient_id = p.patient_id
             LEFT JOIN appointments a
                ON b.appointment_id = a.appointment_id
             LEFT JOIN doctors d
                ON a.doctor_id = d.doctor_id
             ORDER BY b.bill_id DESC`
        );

        res.json(rows);
    } catch (error) {
        console.error("Error loading bills:", error.message);
        res.status(500).json({
            message: "Failed to load bills"
        });
    }
});


// Create a new bill
app.post("/api/bills", async (req, res) => {
    try {
        const {
            patient_id,
            appointment_id,
            amount,
            payment_status,
            payment_method,
            bill_date
        } = req.body;

        // Validate required fields
        if (
            !patient_id ||
            !Number.isInteger(Number(patient_id)) ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) <= 0 ||
            !bill_date
        ) {
            return res.status(400).json({
                message: "Please provide a valid patient, positive amount, and bill date."
            });
        }

        const validStatuses = [
            "Pending",
            "Paid",
            "Partially Paid"
        ];

        const validMethods = [
            "Cash",
            "Card",
            "UPI",
            "Insurance"
        ];

        const status = payment_status || "Pending";

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid payment status."
            });
        }

        if (
            payment_method &&
            !validMethods.includes(payment_method)
        ) {
            return res.status(400).json({
                message: "Invalid payment method."
            });
        }

        // Check that the patient exists
        const [patients] = await pool.query(
            "SELECT patient_id FROM patients WHERE patient_id = ?",
            [Number(patient_id)]
        );

        if (patients.length === 0) {
            return res.status(404).json({
                message: "Patient not found."
            });
        }

        // If an appointment was selected, verify it belongs
        // to the selected patient
        let appointmentId = null;

        if (
            appointment_id !== undefined &&
            appointment_id !== null &&
            appointment_id !== ""
        ) {
            if (!Number.isInteger(Number(appointment_id))) {
                return res.status(400).json({
                    message: "Invalid appointment ID."
                });
            }

            const [appointments] = await pool.query(
                `SELECT appointment_id
                 FROM appointments
                 WHERE appointment_id = ?
                   AND patient_id = ?`,
                [Number(appointment_id), Number(patient_id)]
            );

            if (appointments.length === 0) {
                return res.status(400).json({
                    message: "Appointment does not belong to the selected patient."
                });
            }

            appointmentId = Number(appointment_id);
        }

        // Insert bill into database
        const [result] = await pool.query(
            `INSERT INTO bills
                (
                    patient_id,
                    appointment_id,
                    amount,
                    payment_status,
                    payment_method,
                    bill_date
                )
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                Number(patient_id),
                appointmentId,
                Number(amount),
                status,
                payment_method || null,
                bill_date
            ]
        );

        res.status(201).json({
            message: "Bill created successfully!",
            bill_id: result.insertId
        });
    } catch (error) {
        console.error("Error creating bill:", error.message);
        res.status(500).json({
            message: "Failed to create bill"
        });
    }
});


// Update a bill's payment status
app.patch("/api/bills/:id/status", async (req, res) => {
    try {
        const billId = Number(req.params.id);
        const { payment_status } = req.body;

        const validStatuses = [
            "Pending",
            "Paid",
            "Partially Paid"
        ];

        if (
            !Number.isInteger(billId) ||
            billId <= 0 ||
            !validStatuses.includes(payment_status)
        ) {
            return res.status(400).json({
                message: "Invalid bill ID or payment status."
            });
        }

        const [result] = await pool.query(
            `UPDATE bills
             SET payment_status = ?
             WHERE bill_id = ?`,
            [payment_status, billId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Bill not found."
            });
        }

        res.json({
            message: "Payment status updated successfully!"
        });
    } catch (error) {
        console.error("Error updating payment status:", error.message);
        res.status(500).json({
            message: "Failed to update payment status"
        });
    }
});

app.get("/api/dashboard-stats", async (req, res) => {
    try {
        const [[patients]] = await pool.query(
            "SELECT COUNT(*) AS total FROM patients"
        );

        const [[doctors]] = await pool.query(
            "SELECT COUNT(*) AS total FROM doctors"
        );

        const [[appointments]] = await pool.query(
            "SELECT COUNT(*) AS total FROM appointments"
        );

        const [[bills]] = await pool.query(
            "SELECT COUNT(*) AS total FROM bills"
        );

        res.json({
            totalPatients: patients.total,
            totalDoctors: doctors.total,
            totalAppointments: appointments.total,
            totalBills: bills.total
        });
    } catch (error) {
        console.error("Dashboard error:", error.message);

        res.status(500).json({
            message: "Failed to load dashboard statistics"
        });
    }
});

//server listener at the very bottom
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>{
    console.log(`server running on local host http://loaclhost:${PORT}`);
});``