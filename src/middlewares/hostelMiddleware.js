// // middlewares/hostelMiddleware.js
// import { prisma } from '../config/database.js'; // make sure prisma imported

// export const requireHostelSelection = async (req, res, next) => {
//   try {
//     // Accept header OR query param (support both for migration/testing)
//     const headerHostelId = req.headers['x-hostel-id'];
//     const queryHostelId = req.query.hostelId;
//     const hostelIdCandidate = headerHostelId || queryHostelId || null;

//     // If user not authenticated, fail early.
//     if (!req.user || !req.user.id) {
//       return res.status(401).json({
//         success: false,
//         message: 'User not authenticated.',
//       });
//     }

//     // If no hostel selected (owner wants "All" or global view) — continue with null
//     if (!hostelIdCandidate) {
//       req.hostelId = null;
//       // Ensure controllers expecting req.query.hostelId see the same value (null)
//       delete req.query.hostelId;
//       return next();
//     }

//     // Verify the owner actually owns the hostelIdCandidate
//     const hostel = await prisma.hostel.findFirst({
//       where: {
//         id: hostelIdCandidate,
//         ownerId: req.user.id,
//       },
//     });

//     if (!hostel) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied. You do not own the selected hostel.',
//       });
//     }

//     // Attach verified hostel id to request in two places for compatibility
//     req.hostelId = hostel.id;
//     req.query.hostelId = hostel.id; // controllers that read req.query.hostelId will work

//     next();
//   } catch (error) {
//     console.error('Hostel middleware error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error checking hostel access.',
//     });
//   }
// };

// // middlewares/hostelMiddleware.js
// import { prisma } from '../config/database.js';

// export const requireHostelSelection = async (req, res, next) => {
//   try {
//     const headerHostelId = req.headers['x-hostel-id'];
//     const queryHostelId = req.query.hostelId;
//     const bodyHostelId = req.body.hostelId; // Also check body for POST requests
//     const hostelIdCandidate = headerHostelId || queryHostelId || bodyHostelId || null;

//     if (!req.user || !req.user.id) {
//       return res.status(401).json({ success: false, message: 'User not authenticated.' });
//     }

//     // If no hostel selected, continue (controllers will handle 'All Hostels' logic)
//     if (!hostelIdCandidate) {
//       req.hostelId = null;
//       return next();
//     }

//     // --- FIX START: Handle Warden vs Owner logic ---

//     // 1. If user is WARDEN
//     if (req.user.role === 'WARDEN' || req.user.role === 'warden') {
//         const staff = await prisma.staff.findUnique({
//             where: { id: req.user.id }
//         });

//         // Check if Warden exists AND is assigned to the requested hostel
//         if (!staff || staff.hostelId !== hostelIdCandidate) {
//             return res.status(403).json({
//                 success: false,
//                 message: 'Access denied. You are not assigned to this hostel.',
//             });
//         }

//         // Success! Warden is valid.
//         req.hostelId = hostelIdCandidate;
//         req.query.hostelId = hostelIdCandidate;
//         return next();
//     }

//     // 2. If user is OWNER (Existing Logic)
//     const hostel = await prisma.hostel.findFirst({
//       where: {
//         id: hostelIdCandidate,
//         ownerId: req.user.id,
//       },
//     });

//     if (!hostel) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied. You do not own the selected hostel.',
//       });
//     }

//     // --- FIX END ---

//     req.hostelId = hostel.id;
//     req.query.hostelId = hostel.id;

//     next();
//   } catch (error) {
//     console.error('Hostel middleware error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error checking hostel access.',
//     });
//   }
// };

// src/middlewares/hostelMiddleware.js
import { prisma } from "../config/database.js";

export const requireHostelSelection = async (req, res, next) => {
  try {
    const headerHostelId = req.headers["x-hostel-id"];
    const queryHostelId = req.query.hostelId;

    // FIX: Safely check req.body. If it's undefined (GET request), use null.
    const bodyHostelId = req.body?.hostelId;

    const hostelIdCandidate =
      headerHostelId || queryHostelId || bodyHostelId || null;

    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated." });
    }

    // If no hostel selected, continue (controllers will handle 'All Hostels' logic)
    if (!hostelIdCandidate) {
      req.hostelId = null;
      return next();
    }

    // --- 1. WARDEN CHECK ---
    if (req.user.role === "WARDEN" || req.user.role === "warden") {
      const staff = await prisma.staff.findUnique({
        where: { id: req.user.id },
      });

      // Check if Warden exists AND is assigned to the requested hostel
      if (!staff || staff.hostelId !== hostelIdCandidate) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You are not assigned to this hostel.",
        });
      }

      // Success! Warden is valid.
      req.hostelId = hostelIdCandidate;
      req.query.hostelId = hostelIdCandidate;
      return next();
    }

    // --- 2. OWNER CHECK ---
    const hostel = await prisma.hostel.findFirst({
      where: {
        id: hostelIdCandidate,
        ownerId: req.user.id,
      },
    });

    if (!hostel) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not own the selected hostel.",
      });
    }

    req.hostelId = hostel.id;
    req.query.hostelId = hostel.id;

    next();
  } catch (error) {
    console.error("Hostel middleware error:", error);
    // Don't crash the server, just return 500
    res.status(500).json({
      success: false,
      message: "Server error checking hostel access.",
    });
  }
};
