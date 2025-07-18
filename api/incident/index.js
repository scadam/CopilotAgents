module.exports = async function (context, req) {
  context.log("Incidentv2 function triggered");

  const sysId = req.query.sys_id || (req.body && req.body.sys_id);

  if (!sysId) {
    context.res = {
      status: 400,
      body: { error: "Missing sys_id parameter" }
    };
    return;
  }

  if (req.method === "GET") {
    context.res = {
      status: 200,
      body: {
        result: {
          number: "INC9999999",
          short_description: "Mock incident loaded successfully",
          state: "In Progress",
          sys_id
        }
      }
    };
  } else if (req.method === "POST") {
    context.res = {
      status: 200,
      body: {
        result: {
          message: `Incident ${sysId} updated successfully`,
          updated: req.body
        }
      }
    };
  } else {
    context.res = {
      status: 405,
      body: { error: "Method not allowed" }
    };
  }
};