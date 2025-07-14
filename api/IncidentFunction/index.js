// File: api/IncidentFunction/index.js
const https = require('https');

module.exports = async function (context, req) {
    // 1. Authentication: verify Azure AD token from Teams
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        context.res = { status: 401, body: "Unauthorized: No token" };
        return;
    }
    const aadToken = authHeader.split(' ')[1];
    try {
        // Validate the JWT (for demo, we'll skip detailed validation due to complexity).
        // In production, use Microsoft identity library or JWT library to validate signature, issuer, aud, etc.
        const tokenParts = aadToken.split('.');
        if (tokenParts.length !== 3) throw new Error("Invalid JWT");
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        // (Optional) Check token issuer, audience, expiry, etc. 
        // Ensure aud or scp matches your app's expected values.
    } catch (e) {
        context.res = { status: 401, body: "Unauthorized: Invalid token" };
        return;
    }

    // 2. Determine request type (GET for fetch, POST for update)
    const sysId = req.query.sys_id || (req.body && req.body.sys_id);
    if (!sysId) {
        context.res = { status: 400, body: "Missing sys_id" };
        return;
    }

    // ServiceNow instance and credentials (use environment variables in production!)
    const SN_INSTANCE = "dev217950.service-now.com";
    const SN_USERNAME = "admin";       // or use OAuth token instead of user/pass
    const SN_PASSWORD = "mIEh6jpTT9*=";
    const auth = 'Basic ' + Buffer.from(`${SN_USERNAME}:${SN_PASSWORD}`).toString('base64');

    const options = {
        host: SN_INSTANCE,
        path: `/api/now/table/incident/${sysId}`,
        headers: {
            "Accept": "application/json",
            "Authorization": auth
        }
    };

    if (req.method === "GET") {
        // 3. Fetch incident details from ServiceNow
        options.method = "GET";
    } else if (req.method === "POST") {
        // 4. Update incident in ServiceNow
        options.method = "PATCH";
        const body = req.body;
        // Remove sys_id from body before sending to SN (not needed in table API JSON)
        if (body && body.sys_id) delete body.sys_id;
        const updateData = JSON.stringify(body || {});
        options.headers["Content-Type"] = "application/json";
        options.headers["Content-Length"] = Buffer.byteLength(updateData);
        // We'll send updateData in the request below.
    } else {
        context.res = { status: 405, body: "Method Not Allowed" };
        return;
    }

    // 5. Call ServiceNow API (using Node https)
    try {
        const result = await new Promise((resolve, reject) => {
            const snReq = https.request(options, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ status: res.statusCode, body: data });
                    } else {
                        reject(new Error(`ServiceNow API error: ${res.statusCode} ${data}`));
                    }
                });
            });
            snReq.on('error', err => reject(err));
            if (req.method === "POST") {
                snReq.write(JSON.stringify(req.body));
            }
            snReq.end();
        });
        // Respond back to the static web app
        context.res = {
            status: result.status,
            headers: { "Content-Type": "application/json" },
            body: result.body ? JSON.parse(result.body) : null
        };
    } catch (error) {
        console.error("ServiceNow request failed:", error);
        context.res = { status: 500, body: error.message };
    }
};