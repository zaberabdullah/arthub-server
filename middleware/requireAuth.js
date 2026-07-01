export async function requireAuth(req, res, next) {
  try {
    const cookie = req.headers.cookie || "";
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    
        console.log("Cookie:", cookie ? "exists" : "empty");
    console.log("Token:", token ? token.substring(0, 20) : "empty");


    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (token) headers.authorization = `Bearer ${token}`;

const response = await fetch(
  `${process.env.CLIENT_URL}/api/auth/get-session`,
  { headers }
);

const responseText = await response.text();
console.log("Session response:", responseText);
const session = JSON.parse(responseText);

    const session = await response.json();
    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized. Please login." });
    }

    req.user = session.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session check failed." });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden. You don't have permission." });
    }
    next();
  };
}