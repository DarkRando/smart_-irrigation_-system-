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
      authDomain: document.getElementById("firebaseAuthDomain").value.trim(),
      databaseURL: document.getElementById("firebaseDBUrl").value.trim(),
      projectId: document.getElementById("firebaseProjectId").value.trim(),
      storageBucket: document.getElementById("firebaseBucket").value.trim(),
      messagingSenderId: document.getElementById("firebaseSenderId").value.trim(),
      appId: document.getElementById("firebaseAppId").value.trim(),
    },
    deviceId: document.getElementById("deviceId").value.trim(),
  };

  // basic validation
  if (!settings.deviceId) {
    alert("Device ID is required");
    return;
  }

  // Save permanently
  localStorage.setItem("setupConfig", JSON.stringify(settings));

  alert("Configuration saved successfully!");

  // redirect to dashboard
  window.location.href = "index.html";
});
