export function getUserIdFromToken(token: string | null) {
    if (!token) return null;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        // Decode base64url safely
        const payloadDecoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
        const payload = JSON.parse(payloadDecoded);
        const userId =
            payload.sub ||
            payload.nameid ||
            payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        return userId ? String(userId) : null;
    } catch (err) {
        console.error('Error decoding JWT token:', err);
        return null;
    }
}