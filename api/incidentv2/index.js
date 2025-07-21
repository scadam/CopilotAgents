const fetch = require("node-fetch");

module.exports = async function (context, req) {
  context.log("Incidentv2 function triggered");

  try {
    // 🧠 Step 1: Resolve sys_id
    const sysId = req.query.sys_id || (req.body && req.body.sys_id);
    context.log("Resolved sysId:", sysId);

    if (!sysId) {
      context.log("Missing sys_id — aborting");
      context.res = {
        status: 400,
        body: { error: "Missing sys_id parameter" }
      };
      return;
    }

    // 🔐 Step 2: Prepare OAuth token request
    context.log("Preparing OAuth token request…");

    const clientId = "ca92cca4c5ca22100ba4fd7a16004118";
    const clientSecret = "winn1e2025";
    const username = "admin";
    const password = "mIEh6jpTT9*=";
    const tokenUrl = "https://dev217950.service-now.com/oauth_token.do";

    const tokenBody = new URLSearchParams();
    tokenBody.append("grant_type", "password");
    tokenBody.append("client_id", clientId);
    tokenBody.append("client_secret", clientSecret);
    tokenBody.append("username", username);
    tokenBody.append("password", password);

    context.log("Token POST body prepared");

    let tokenRes;
    try {
      tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenBody
      });
    } catch (fetchErr) {
      context.log.error("OAuth token fetch threw:", fetchErr);
      context.res = {
        status: 500,
        body: {
          error: "OAuth token request failed",
          detail: fetchErr.message
        }
      };
      return;
    }

    context.log("OAuth token response status:", tokenRes.status);
    const tokenText = await tokenRes.text();
    context.log("Raw token response:", tokenText);

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (parseErr) {
      context.log.error("Token JSON parse error:", parseErr);
      context.res = {
        status: 500,
        body: {
          error: "OAuth token parse error",
          detail: tokenText
        }
      };
      return;
    }

    const token = tokenData.access_token;
    if (!token) {
      context.log.error("No access_token found:", tokenData);
      context.res = {
        status: 500,
        body: {
          error: "Token missing in response",
          detail: tokenData
        }
      };
      return;
    }

    context.log("Token acquired:", token);

    // 🎯 Step 3: Build ServiceNow API endpoint
    const apiUrl = `https://dev217950.service-now.com/api/now/table/incident/${sysId}`;

    if (req.method === "GET") {
      context.log("Performing GET to:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      const raw = await response.text();
      context.log("GET response status:", response.status);
      context.log("GET response body:", raw);

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        context.log.error("GET parse error:", err);
        context.res = {
          status: 500,
          body: { error: "ServiceNow GET parse failure", detail: raw }
        };
        return;
      }

      context.res = {
        status: response.status,
        body: parsed
      };

    } else if (req.method === "POST") {
      context.log("Performing PATCH to:", apiUrl);

      const payload = { ...req.body };
      delete payload.sys_id;
      context.log("PATCH payload:", payload);

      const response = await fetch(apiUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const raw = await response.text();
      context.log("PATCH response status:", response.status);
      context.log("PATCH response body:", raw);

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        context.log.error("PATCH parse error:", err);
        context.res = {
          status: 500,
          body: { error: "ServiceNow PATCH parse failure", detail: raw }
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
    context.log.error("Unhandled exception in incidentv2:", err);
    context.res = {
      status: 500,
      body: {
        error: "Server error",
        detail: err.message || "Unknown error"
      }
    };
  }
};