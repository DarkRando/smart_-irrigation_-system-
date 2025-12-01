const API_KEY = "d0627b401bf615e88fef4c9e8affec54";
const lat = 10.8066;
const lon = 76.7252;

async function fetchNextRain() {
  const url =
    `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,daily&appid=${API_KEY}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error("Weather API error:", resp.status, await resp.text());
      return;
    }

    const data = await resp.json();
    const hourly = data.hourly;

    let nextRainHours = null;

    for (let i = 0; i < hourly.length; i++) {
      const block = hourly[i];

      const willRain =
        (block.pop && block.pop > 0.20) ||          // POP > 20%
        (block.rain && block.rain["1h"] > 0);       // explicit rain

      if (willRain) {
        nextRainHours = i;   // each block = 1 hour forward
        break;
      }
    }

    if (nextRainHours === null) {
      console.log("No rain expected soon.");
      document.getElementById("nextRainValue").innerText = "No rain soon";
      return;
    }

    console.log("Next rain in:", nextRainHours, "hours");
    document.getElementById("nextRainValue").innerText =
      nextRainHours + " hours";

  } catch (err) {
    console.error("Network error:", err);
  }
}

// Auto-update
if(false){
    fetchNextRain();
    setInterval(fetchNextRain, 15 * 60 * 1000);
}