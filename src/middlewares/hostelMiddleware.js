// middlewares/hostelMiddleware.js
import { prisma } from '../config/database.js'; // make sure prisma imported

export const requireHostelSelection = async (req, res, next) => {
  try {
    // Accept header OR query param (support both for migration/testing)
    const headerHostelId = req.headers['x-hostel-id'];
    const queryHostelId = req.query.hostelId;
    const hostelIdCandidate = headerHostelId || queryHostelId || null;

    // If user not authenticated, fail early.
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated.',
      });
    }

    // If no hostel selected (owner wants "All" or global view) — continue with null
    if (!hostelIdCandidate) {
      req.hostelId = null;
      // Ensure controllers expecting req.query.hostelId see the same value (null)
      delete req.query.hostelId;
      return next();
    }

    // Verify the owner actually owns the hostelIdCandidate
    const hostel = await prisma.hostel.findFirst({
      where: {
        id: hostelIdCandidate,
        ownerId: req.user.id,
      },
    });

    if (!hostel) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own the selected hostel.',
      });
    }

    // Attach verified hostel id to request in two places for compatibility
    req.hostelId = hostel.id;
    req.query.hostelId = hostel.id; // controllers that read req.query.hostelId will work

    next();
  } catch (error) {
    console.error('Hostel middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking hostel access.',
    });
  }
};
