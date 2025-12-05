async function fetchNextRain() {
  const lat = 10.8066;
  const lon = 76.7252;

 const url =
`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
  `&minutely_15=precipitation&timezone=auto`;

  try {
    const resp = await fetch(url);
    console.log("FETCH RESPONSE:", resp); 

    if (!resp.ok) {
      console.error("Weather API error:", resp.status, await resp.text());
      return;
    }

    const data = await resp.json();


    const arr = data.minutely_15.precipitation;

let nextRainMins = null;

for (let i = 0; i < arr.length; i++) {
  if (arr[i] > 0) {
    nextRainMins = i * 15;  
    break;
  }
}
let x=nextRainMins;

    const el = document.getElementById("nextRainValue");

    if (nextRainMins === null) {
      el.innerText = "No rain soon";
    } else {
      el.innerText = `${Math.floor(nextRainMins/60)} hours ${nextRainMins%60} minutes`;
    }

  } catch (err) {
    console.error("Network error:", err);
  }
}
fetchNextRain();
