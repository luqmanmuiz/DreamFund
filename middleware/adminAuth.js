const adminAuth = (req, res, next) => {
  // Check if user exists and is admin
  if (!req.user) {
    return res.status(401).json({ message: "Access denied. No user found." })
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin only." })
  }

  next()
}

module.exports = adminAuth
