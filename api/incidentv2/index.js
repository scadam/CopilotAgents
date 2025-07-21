
const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    context.log("Incidentv2 function triggered");
    const sysId = req.query.sys_id || (req.body && req.body.sys_id);
    if (!sysId) {
      context.res = { status: 400, body: { error: "Missing sys_id" } };
      return;
    }

    // Step 1: Get OAuth token from ServiceNow
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("client_id", "ca92cca4c5ca22100ba4fd7a16004118");
    params.append("client_secret", "winn1e2025");
    params.append("username", "admin");
    params.append("password", "mIEh6jpTT9*=");

    const tokenRes = await fetch("https://dev217950.service-now.com/oauth_token.do", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });

    if (!tokenRes.ok) throw new Error(`Token error: ${tokenRes.status}`);
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    const SN_TABLE_API = `https://dev217950.service-now.com/api/now/table/incident`;

    if (req.method === "GET") {
      const response = await fetch(`${SN_TABLE_API}/${sysId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();
      context.res = { status: response.status, body: data };

    } else if (req.method === "POST") {
      const payload = { ...req.body };
      delete payload.sys_id;

      const response = await fetch(`${SN_TABLE_API}/${sysId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      context.res = { status: response.status, body: data };

    } else {
      context.res = { status: 405, body: { error: "Method not allowed" } };
    }

  } catch (err) {
    context.log.error("ServiceNow OAuth call failed:", err);
    context.res = { status: 500, body: { error: "Server error", detail: err.message } };
  }
};