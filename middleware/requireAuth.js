// arthub-server/middleware/requireAuth.js
// BetterAuth is on arthub-client (port 3000), not here.
// So we verify session by calling the client's BetterAuth endpoint.

export async function requireAuth(req, res, next) {
  try {
    // Forward the cookies from the incoming request to BetterAuth
    const cookie = req.headers.cookie || "";

    const response = await fetch(
      `${process.env.CLIENT_URL}/api/auth/get-session`,
      {
        headers: {
          cookie,
        },
      }
    );

    if (!response.ok) {
      return res.status(401).json({ error: "Unauthorized. Please login." });
    }

    const session = await response.json();

    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized. Please login." });
    }

    req.user = session.user; // { id, name, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session check failed." });
  }
}

// Check specific role
// Usage: router.post("/", requireAuth, requireRole("artist"), handler)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden. You don't have permission." });
    }
    next();
  };
}