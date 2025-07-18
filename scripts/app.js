document.addEventListener("DOMContentLoaded", () => {
  if (typeof microsoftTeams === "undefined") {
    document.getElementById("loading").innerText = "Error: Teams SDK not loaded.";
    return;
  }

  microsoftTeams.initialize();

  const params = new URLSearchParams(window.location.search);
  const sysId = params.get("sys_id");
  if (!sysId) {
    document.getElementById("loading").innerText = "Error: no incident id.";
    return;
  }

  // Fetch incident details
  microsoftTeams.authentication.getAuthToken({
    successCallback: async (aadToken) => {
      try {
        const res = await fetch(`/api/incident?sys_id=${sysId}`, {
          headers: { Authorization: `Bearer ${aadToken}` }
        });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const data = await res.json();
        document.getElementById("number").value = data.result.number || "";
        document.getElementById("short_description").value = data.result.short_description || "";
        document.getElementById("state").value = data.result.state || "";
        document.getElementById("loading").style.display = "none";
        document.getElementById("incidentForm").style.display = "block";
      } catch (err) {
        console.error("Error loading incident:", err);
        document.getElementById("loading").innerText = "Unable to load incident.";
      }
    },
    failureCallback: (error) => {
      console.error("Token error:", error);
      document.getElementById("loading").innerText = "Authentication error or consent required.";
    }
  });

  // Save changes handler
  document.getElementById("saveBtn").onclick = async () => {
    const resultDiv = document.getElementById("result");
    resultDiv.innerText = "Saving...";
    resultDiv.classList.remove("error");

    const updated = {
      sys_id: sysId,
      short_description: document.getElementById("short_description").value,
      state: document.getElementById("state").value
    };

    try {
      const aadToken = await new Promise((resolve, reject) =>
        microsoftTeams.authentication.getAuthToken({
          successCallback: resolve,
          failureCallback: reject
        })
      );

      const resp = await fetch("/api/incident", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aadToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updated)
      });

      if (!resp.ok) throw new Error(`Update failed: ${resp.status}`);
      resultDiv.innerText = "✅ Incident updated successfully.";
    } catch (err) {
      console.error("Save error:", err);
      resultDiv.classList.add("error");
      resultDiv.innerText = "Failed to update incident.";
    }
  };
});