import { prisma } from "../config/database.js";
import { hashPassword, comparePassword } from "../utils/passwordHelper.js";
import { generateToken } from "../utils/jwtHelper.js";

// ====================== OWNER ADDS WARDEN ======================
export const addWarden = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const ownerId = req.user.id; 

    // ✅ FIX: Robust check for Hostel ID (Middleware OR Direct Header)
    const hostelId = req.hostelId || req.headers['x-hostel-id'];

    console.log("Debug - Adding Warden:", { name, phone, hostelId }); // Debug log

    if (!hostelId) {
      return res.status(400).json({ 
        success: false, 
        message: "Hostel ID is missing. Please select a hostel." 
      });
    }

    if (!name || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: "Name and Phone are required." 
      });
    }

    // 1. Check if phone already exists in Staff table
    const existingStaff = await prisma.staff.findUnique({
      where: { phone },
    });

    if (existingStaff) {
      return res.status(400).json({ 
        success: false, 
        message: "Staff with this phone number already exists." 
      });
    }

    // 2. Generate Random Password (6 digits)
    const plainPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await hashPassword(plainPassword);

    // 3. Create Warden
    const newWarden = await prisma.staff.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        role: "WARDEN",
        ownerId,
        hostelId, 
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Warden added successfully",
      data: {
        id: newWarden.id,
        name: newWarden.name,
        credentials: {
          phone: newWarden.phone,
          password: plainPassword,
        }
      },
    });

  } catch (error) {
    console.error("Add Warden error:", error);
    res.status(500).json({ success: false, message: "Failed to add warden." });
  }
};

// ... keep wardenLogin as is ...

// ... keep wardenLogin as is ...

// ====================== WARDEN LOGIN ======================
export const wardenLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone and password are required." 
      });
    }

    // 1. Find Staff by Phone
    const warden = await prisma.staff.findUnique({
      where: { phone },
      include: {
        hostel: { select: { name: true } }
      }
    });

    if (!warden) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // 2. Verify Role
    if (warden.role !== "WARDEN") {
        return res.status(403).json({ success: false, message: "Access denied. Not a warden." });
    }

    // 3. Check Password
    const isPasswordValid = await comparePassword(password, warden.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // 4. Generate Token
    const token = generateToken({ id: warden.id, role: "warden" });

    // 5. Send Response
    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: warden.id,
          name: warden.name,
          phone: warden.phone,
          role: "warden",
          hostelName: warden.hostel?.name
        },
      },
    });

  } catch (error) {
    console.error("Warden login error:", error);
    res.status(500).json({ success: false, message: "Login failed." });
  }
};