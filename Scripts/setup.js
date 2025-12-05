document.getElementById("saveSetup").addEventListener("click", () => {

  const settings = {
    field: {
      length: Number(document.getElementById("fieldLength").value),
      breadth: Number(document.getElementById("fieldBreadth").value),
    },
    wifi: {
      ssid: document.getElementById("wifiSSID").value.trim(),
      password: document.getElementById("wifiPass").value.trim(),
    },
    firebase: {
      apiKey: document.getElementById("firebaseApiKey").value.trim(),
      databaseURL: document.getElementById("firebaseDBUrl").value.trim(),
      appId: document.getElementById("firebaseAppId").value.trim(),
    }
  };

  localStorage.setItem("setupConfig", JSON.stringify(settings));
  alert("Configuration saved successfully!");
  window.location.href = "index.html";
});

