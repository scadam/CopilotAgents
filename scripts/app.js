document.addEventListener("DOMContentLoaded", () => {
  microsoftTeams?.initialize();

  const sysId = new URLSearchParams(window.location.search).get("sys_id");
  const get = id => document.getElementById(id);
  if (!sysId) {
    get("loading").innerText = "Error: No incident ID provided.";
    return;
  }

  const tokenPromise = new Promise((resolve, reject) => {
    microsoftTeams.authentication.getAuthToken({
      successCallback: resolve,
      failureCallback: reject
    });
  });

  tokenPromise.then(async aadToken => {
    try {
      get("loading").innerText = "Fetching the requested incident...";
      const incidentRes = await fetch(`/api/incidentv2?sys_id=${sysId}`, {
        headers: { Authorization: `Bearer ${aadToken}` }
      });
      const incident = await incidentRes.json();
      const i = incident.result;

      get("number").value = i.number || "";
      get("short_description").value = i.short_description || "";
      get("urgency").value = i.urgency || "3";
      get("state").value = i.state || "1";
      get("opened_at").value = formatDate(i.opened_at);
      get("closed_at").value = formatDate(i.closed_at);

      await loadCallers(aadToken, i.caller_id?.value);

      get("loading").style.display = "none";
      get("incidentForm").style.display = "block";
    } catch (err) {
      console.error("Fetch failed:", err);
      get("loading").innerText = "Unable to load incident.";
    }
  }).catch(err => {
    console.error("Auth error:", err);
    get("loading").innerText = "Authentication error.";
  });

  async function loadCallers(aadToken, selectedId) {
    try {
      const res = await fetch("/api/sys_users", {
        headers: { Authorization: `Bearer ${aadToken}` }
      });
      const data = await res.json();
      const caller = get("caller_id");
      caller.innerHTML = "";

      data.result.forEach(user => {
        const opt = document.createElement("option");
        opt.value = user.sys_id;
        opt.textContent = user.name;
        if (user.sys_id === selectedId) opt.selected = true;
        caller.appendChild(opt);
      });
    } catch (err) {
      console.error("Caller load failed:", err);
      get("caller_id").innerHTML = "<option>Error loading callers</option>";
    }
  }

  function formatDate(str) {
    if (!str) return "";
    const dt = new Date(str);
    return dt.toISOString().slice(0, 16);
  }

  get("saveBtn").onclick = async () => {
    const resultDiv = get("result");
    resultDiv.innerText = "Saving...";
    resultDiv.classList.remove("error");

    const payload = {
      sys_id: sysId,
      short_description: get("short_description").value,
      caller_id: get("caller_id").value,
      urgency: get("urgency").value,
      state: get("state").value,
      opened_at: get("opened_at").value,
      closed_at: get("closed_at").value
    };

    try {
      const aadToken = await tokenPromise;
      const resp = await fetch("/api/incidentv2", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aadToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      resultDiv.innerText = "✅ Incident updated successfully.";
    } catch (err) {
      console.error("Save error:", err);
      resultDiv.classList.add("error");
      resultDiv.innerText = "Update failed.";
    }
  };
});