import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

const firebaseConfig = {
apiKey: "AIzaSyCuumVzK4ppOldG-jVcW936QpLTNgXbzfY",
authDomain: "smart-irrigation-5fc1d.firebaseapp.com",
databaseURL: "https://smart-irrigation-5fc1d-default-rtdb.firebaseio.com",
projectId: "smart-irrigation-5fc1d",
storageBucket: "smart-irrigation-5fc1d.firebasestorage.app",
messagingSenderId: "896182267295",
appId: "1:896182267295:web:ef4b0c9766e88e12eee1aa"
};


const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// const sensorRef = ref(db, 'sensors/latest');
// onValue(sensorRef, (snapshot) => {
// const data = snapshot.val();
// if (data) {
//     document.getElementById("temp").innerText = data.temperature + " °C";
//     document.getElementById("humid").innerText = data.humidity + " %";
// }
// });








function loadLogs() {
  return JSON.parse(localStorage.getItem("pumpLogs") || "[]");
}

function saveLogs(logs) {
  localStorage.setItem("pumpLogs", JSON.stringify(logs));
}


function fetchFirebaseLogs() {
  const ref = db.ref("sensor/log");

  ref.once("value")
    .then(snapshot => {
      if (!snapshot.exists()) {
        console.log("⚠️ No logs found in Firebase.");
        return;
      }

      const firebaseLogs = snapshot.val();
      const localLogs = loadLogs();

      let newLogs = [];

      // loop each firebase log
      Object.keys(firebaseLogs).forEach(key => {
        const data = firebaseLogs[key];

        
        const log = {
          zone: data.zone,
          start: data.start,
          end: data.end,
          duration: data.duration
        };

        newLogs.push(log);
      });

      // merge with local existing logs
      localLogs.push(...newLogs);
      saveLogs(localLogs);

      console.log(`🔥 Synced ${newLogs.length} logs from Firebase.`);
      renderLogs();
    })
    .catch(err => {
      console.error("❌ Firebase log fetch failed:", err);
    });
}



fetchFirebaseLogs();
