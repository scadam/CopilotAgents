const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    context.log("Incidentv2 function triggered");
    const sysId = req.query.sys_id || (req.body && req.body.sys_id);

    if (!sysId) {
      context.res = {
        status: 400,
        body: { error: "Missing sys_id parameter" }
      };
      return;
    }

    // 🔐 ServiceNow API config
    const SN_INSTANCE = "dev217950.service-now.com";
    const SN_TABLE_API = `https://${SN_INSTANCE}/api/now/table/incident`;
    const SN_USER = "admin";
    const SN_PASS = "mIEh6jpTT9*="; // Store securely for production
    const authHeader = Buffer.from(`${SN_USER}:${SN_PASS}`).toString("base64");

    if (req.method === "GET") {
      const response = await fetch(`${SN_TABLE_API}/${sysId}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${authHeader}`
        }
      });

      const data = await response.json();
      context.res = {
        status: response.status,
        body: data
      };
    } else if (req.method === "POST") {
      const payload = { ...req.body };
      delete payload.sys_id;

      const response = await fetch(`${SN_TABLE_API}/${sysId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${authHeader}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      context.res = {
        status: response.status,
        body: data
      };
    } else {
      context.res = {
        status: 405,
        body: { error: "Method not allowed" }
      };
    }
  } catch (err) {
    context.log.error("ServiceNow call failed:", err);
    context.res = {
      status: 500,
      body: { error: "Server error", detail: err.message }
    };
  }
};