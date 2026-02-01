const jwt = require('jsonwebtoken');

// user token verification
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ msg: 'Token not found in header' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ msg: 'Token is not valid' });
    }
};

// User verification
const verifyUser = (req, res, next) => {
    verifyToken(req, res, next);
};

// Admin verification
const verifyAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user && req.user.role === 'admin') {
            next();
        } else {
            return res.status(403).json({ msg: 'Access denied: Admin role required' });
        }
    });
};

// VOLUNTEER verification 
const verifyVolunteer = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user && (req.user.role === 'volunteer' || req.user.role === 'admin')) {
            next();
        } else {
            return res.status(403).json({ msg: 'Access denied: Volunteer or Admin role required' });
        }
    });
};

module.exports = {
    verifyUser,
    verifyAdmin,
    verifyVolunteer
};
