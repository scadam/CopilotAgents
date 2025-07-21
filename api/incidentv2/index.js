const fetch = require("node-fetch");

module.exports = async function (context, req) {
  context.log("Incidentv2 function triggered");

  try {
    // 🔍 Step 1: Extract sys_id
    const sysId = req.query.sys_id || (req.body && req.body.sys_id);
    context.log("Resolved sysId:", sysId);

    if (!sysId) {
      context.log("sys_id missing from request");
      context.res = {
        status: 400,
        body: { error: "Missing sys_id parameter" }
      };
      return;
    }

    // 🔐 Step 2: Request OAuth token from ServiceNow
    context.log("Starting OAuth token request...");
    const params = new URLSearchParams();
    params.append("grant_type", "password");
    params.append("client_id", "ca92cca4c5ca22100ba4fd7a16004118");
    params.append("client_secret", "winn1e2025");
    params.append("username", "admin");
    params.append("password", "mIEh6jpTT9*=");

    const tokenRes = await fetch("https://dev217950.service-now.com/oauth_token.do", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });

    context.log("OAuth response status:", tokenRes.status);

    const rawToken = await tokenRes.text();
    context.log("Raw OAuth response body:", rawToken);

    let tokenData;
    try {
      tokenData = JSON.parse(rawToken);
    } catch (err) {
      context.log.error("Failed to parse OAuth token:", err);
      context.res = {
        status: 500,
        body: {
          error: "OAuth token parse error",
          detail: rawToken
        }
      };
      return;
    }

    const token = tokenData.access_token;
    if (!token) {
      context.log.error("No access_token found in OAuth response");
      context.res = {
        status: 500,
        body: {
          error: "Token retrieval failed",
          detail: tokenData
        }
      };
      return;
    }

    context.log("Token acquired successfully");

    // 🎯 Step 3: Build ServiceNow API request
    const SN_TABLE_API = `https://dev217950.service-now.com/api/now/table/incident/${sysId}`;

    if (req.method === "GET") {
      context.log("Starting GET request to ServiceNow...");
      const response = await fetch(SN_TABLE_API, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      context.log("ServiceNow GET response status:", response.status);
      const rawBody = await response.text();
      context.log("Raw GET response:", rawBody);

      let parsed;
      try {
        parsed = JSON.parse(rawBody);
      } catch (err) {
        context.log.error("Failed to parse ServiceNow GET response:", err);
        context.res = {
          status: 500,
          body: { error: "ServiceNow GET parse error", detail: rawBody }
        };
        return;
      }

      context.res = {
        status: response.status,
        body: parsed
      };

    } else if (req.method === "POST") {
      context.log("Starting PATCH update to ServiceNow...");
      const payload = { ...req.body };
      delete payload.sys_id;
      context.log("Patch payload:", payload);

      const response = await fetch(SN_TABLE_API, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      context.log("ServiceNow PATCH response status:", response.status);
      const rawBody = await response.text();
      context.log("Raw PATCH response:", rawBody);

      let parsed;
      try {
        parsed = JSON.parse(rawBody);
      } catch (err) {
        context.log.error("Failed to parse ServiceNow PATCH response:", err);
        context.res = {
          status: 500,
          body: { error: "ServiceNow PATCH parse error", detail: rawBody }
        };
        return;
      }

      context.res = {
        status: response.status,
        body: parsed
      };

    } else {
      context.log("Unsupported method:", req.method);
      context.res = {
        status: 405,
        body: { error: "Method not allowed" }
      };
    }

  } catch (err) {
    context.log.error("Unhandled exception in incidentv2 function:", err);
    context.res = {
      status: 500,
      body: {
        error: "Server error",
        detail: err.message || "Unknown error"
      }
    };
  }
};