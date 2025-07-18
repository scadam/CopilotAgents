// Azure Function: Incident API
module.exports = async function (context, req) {
  const sys_id = req.query.sys_id;
  const method = req.method;
  // 1. Authenticate the caller via Azure AD token
  const authHeader = req.headers['authorization'] || '';
  if (!authHeader.startsWith('Bearer ')) {
    context.res = { status: 401, body: "No token" };
    return;
  }
  const token = authHeader.split(' ')[1];
  // Validate the token (e.g., using Microsoft identity library or jwt). 
  // Ensure signature is valid and token is from your AAD app and not expired.
  //try {
  //  const verifiedToken = verifyJwt(token, /* your AAD signing keys or library*/);
  //  // Optionally, ensure the token has the expected scope or audience.
  //
  //} catch (e) {
  //  context.res = { status: 401, body: "Invalid token" };
  //  return;
  //}

  // 2. Call ServiceNow API
  const SN_INSTANCE = "dev217950.service-now.com.service-now.com";
  const SN_TABLE_API = `https://${SN_INSTANCE}/api/now/table/incident`;
  const SN_USER = "admin";
  const SN_PASS = "mIEh6jpTT9*="; // (Alternatively use OAuth client credentials)
  const authBasic = Buffer.from(`${SN_USER}:${SN_PASS}`).toString('base64');

  if (req.method === "GET") {
    const sysId = req.query.sys_id;
    const res = await fetch(`${SN_TABLE_API}/${sysId}`, {
      method: "GET",
      headers: { "Accept": "application/json", "Authorization": `Basic ${authBasic}` }
    });
    const data = await res.json();
    context.res = { status: 200, body: data };
  } else if (req.method === "POST") {
    const body = req.body || {};
    const sysId = body.sys_id;
    delete body.sys_id;
    const res = await fetch(`${SN_TABLE_API}/${sysId}`, {
      method: "PATCH",
      headers: { 
        "Accept": "application/json", 
        "Content-Type": "application/json",
        "Authorization": `Basic ${authBasic}` 
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    context.res = { status: 200, body: data };
  } else {
    context.res = { status: 405, body: "Method not allowed" };
  }
};