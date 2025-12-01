#include <ESP8266WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include "DHT.h"
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// -------------------- USER CONFIG --------------------
#define WIFI_SSID       "Mi 11X"
#define WIFI_PASSWORD   "vichu002"

#define API_KEY "AIzaSyCuumVzK4ppOldG-jVcW936QpLTNgXbzfY"
#define DATABASE_URL "https://smart-irrigation-5fc1d-default-rtdb.firebaseio.com/"


#define RELAY_PIN D0           
const bool RELAY_ACTIVE_LOW = true; 

#define DHTPIN D4             
#define DHTTYPE DHT11
#define BUTTON_TOGGLE_PIN D5   
#define BUTTON_SHOW_PIN D7     
#define MOISTURE_PIN A0       


int airValue = 750;    
int waterValue = 300;  


float s = 0.04;          
float limitI = 10.0;  

const unsigned long SENSORS_SEND_INTERVAL = 5000UL;
const unsigned long FIREBASE_CHECK_INTERVAL = 5000UL; 
const unsigned long HOURLY_CHECK_INTERVAL = 3600000UL; 

LiquidCrystal_I2C LCD(0x27, 16, 2);

DHT dht(DHTPIN, DHTTYPE);

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
unsigned long lastSendTime = 0;
unsigned long lastFirebaseCheck = 0;
unsigned long lastHourlyCheck = 0;

bool pumpState = false;              
bool lastSentPumpState = false;      
unsigned long pumpStartTimeMs = 0;
unsigned long pumpDurationMs = 0;   
bool pumpAutoRunning = false;       


unsigned long lastDebounceToggle = 0;
unsigned long lastDebounceShow = 0;
const unsigned long DEBOUNCE_DELAY = 50;


float T_max = 40;
float T_min = 0;
float Time_max = 24;


float c1 = 0.25;
float c2 = 0.25;
float c3 = 0.25;
float c4 = 0.25;

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  LCD.clear();
  LCD.setCursor(0,0);
  LCD.print("Connecting WiFi");

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
    if (millis() - start > 20000) {
      WiFi.disconnect();
      delay(500);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      start = millis();
    }
  }

  LCD.clear();
  LCD.print("WiFi OK:");
  LCD.setCursor(0,1);
  LCD.print(WiFi.localIP().toString());

  Serial.println();
  Serial.println("WiFi connected: ");
  Serial.println(WiFi.localIP());
}


void applyRelay(bool on) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(RELAY_PIN, on ? LOW : HIGH);
  } else {
    digitalWrite(RELAY_PIN, on ? HIGH : LOW);
  }
  pumpState = on;
}


float computeI(int moisturePercent, float temperatureC, float humidityPct) {

  float time_till_rainfall = 0.5;
  float dryness = (1 - (moisturePercent/100)); 
  float tempFactor = (temperatureC - T_min/(T_max - T_min) ); 
  float air_dryness = 1 - humidityPct/100; 

  float I = (c1*dryness + c2*tempFactor + c3*air_dryness + c4*time_till_rainfall)/4; 

  return I;
}


void showAllData(int moisturePercent, float temperature, float humidity) {
  // Moisture
  LCD.clear();
  LCD.setCursor(0,0);
  LCD.print("Moisture:");
  LCD.print(moisturePercent);
  LCD.print("%");
  LCD.setCursor(0,1);
  LCD.print(pumpState ? "Pump: ON" : "Pump: OFF");
  delay(1000);


  LCD.clear();
  LCD.setCursor(0,0);
  LCD.print("Temp:");
  LCD.print(temperature);
  LCD.print(" C");
  LCD.setCursor(0,1);
  LCD.print("Humidity:");
  LCD.print(humidity);
  LCD.print("%");
  delay(1500);
}


void setup() {
  Serial.begin(115200);
  dht.begin();

  pinMode(RELAY_PIN, OUTPUT);
  if (RELAY_ACTIVE_LOW) digitalWrite(RELAY_PIN, HIGH); else digitalWrite(RELAY_PIN, LOW);
  pumpState = false;
  lastSentPumpState = !pumpState; 

  pinMode(BUTTON_TOGGLE_PIN, INPUT_PULLUP);
  pinMode(BUTTON_SHOW_PIN, INPUT_PULLUP);

  LCD.init();
  LCD.backlight();

  connectWiFi();

 
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("Firebase Signup OK");
  } else {
    Serial.printf("Signup Error (may be ignored): %s\n", config.signer.signupError.message.c_str());
  }

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(false);

  LCD.clear();
  LCD.print("System Ready");
  delay(1200);
}


bool readPumpStateFromFirebase(bool &valid) {
  valid = false;
  if (!Firebase.ready()) return false;
  if (Firebase.RTDB.getBool(&fbdo, "/pump/pump_state")) {
    valid = true;
    return fbdo.to<bool>();
  } else {
    Serial.printf("Firebase get pump state failed: %s\n", fbdo.errorReason().c_str());
    return false;
  }
}


void writePumpStateToFirebase(bool state) {
  if (!Firebase.ready()) return;
  if (Firebase.RTDB.setBool(&fbdo, "/pump/pump_state", state)) {
    Serial.printf("Wrote pump state: %s\n", state ? "ON" : "OFF");
  } else {
    Serial.printf("Failed writing pump state: %s\n", fbdo.errorReason().c_str());
  }
}


void loop() {
  unsigned long now = millis();
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  
  bool btnToggleState = digitalRead(BUTTON_TOGGLE_PIN) == LOW; // pressed when LOW (pullup)
  if (btnToggleState && (now - lastDebounceToggle > DEBOUNCE_DELAY)) {
    lastDebounceToggle = now;
    bool newState = !pumpState;
    applyRelay(newState);
    pumpAutoRunning = false; 
    writePumpStateToFirebase(pumpState);
    Serial.printf("Button toggle pressed -> pump %s\n", pumpState ? "ON" : "OFF");
    delay(200); 
  }

  
  bool btnShowState = digitalRead(BUTTON_SHOW_PIN) == LOW;
  if (btnShowState && (now - lastDebounceShow > DEBOUNCE_DELAY)) {
    lastDebounceShow = now;
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    int sensorValue = analogRead(MOISTURE_PIN);
    int moisturePercent = map(sensorValue, airValue, waterValue, 0, 100);
    moisturePercent = constrain(moisturePercent, 0, 100);
    if (isnan(humidity) || isnan(temperature)) {
      LCD.clear();
      LCD.setCursor(0,0);
      LCD.print("DHT Failed");
    } else {
      showAllData(moisturePercent, temperature, humidity);
    }
    delay(300);
  }

 
  if (now - lastSendTime > SENSORS_SEND_INTERVAL) {
    lastSendTime = now;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    int sensorValue = analogRead(MOISTURE_PIN);
    int moisturePercent = map(sensorValue, airValue, waterValue, 0, 100);
    moisturePercent = constrain(moisturePercent, 0, 100);

  
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("DHT read failed, skipping send");
    } else {

      LCD.clear();
      LCD.setCursor(0,0);
      LCD.print("Moist:");
      LCD.print(moisturePercent);
      LCD.print("%");
      LCD.setCursor(0,1);
      LCD.print("Temp:");
      LCD.print(temperature);

  
      FirebaseJson json;
      json.set("temperature", temperature);
      json.set("humidity", humidity);
      json.set("soilMoisture", moisturePercent);
      json.set("timestamp", now);

      if (Firebase.RTDB.setJSON(&fbdo, "/sensors/latest", &json)) {
        Serial.println("Sensors sent OK");
      } else {
        Serial.printf("Firebase Error sending sensors: %s\n", fbdo.errorReason().c_str());
      }
    }
  }


  if (now - lastFirebaseCheck > FIREBASE_CHECK_INTERVAL) {
    lastFirebaseCheck = now;
    bool valid = false;
    bool remoteState = readPumpStateFromFirebase(valid);
    if (valid) {

      if (remoteState != pumpState) {
        Serial.printf("Remote pump state differs: remote=%s local=%s -> applying remote\n", remoteState ? "ON" : "OFF", pumpState ? "ON" : "OFF");
        applyRelay(remoteState);
        pumpAutoRunning = false;
        lastSentPumpState = remoteState;
      }
    }
  }

  if (pumpState != lastSentPumpState) {
    writePumpStateToFirebase(pumpState);
    lastSentPumpState = pumpState;
  }

  if (now - lastHourlyCheck > HOURLY_CHECK_INTERVAL) {
    lastHourlyCheck = now;

    // read sensors
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    int sensorValue = analogRead(MOISTURE_PIN);
    int moisturePercent = map(sensorValue, airValue, waterValue, 0, 100);
    moisturePercent = constrain(moisturePercent, 0, 100);

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("Hourly check: DHT read failed; skipping I calculation");
    } else {
      float I = computeI(moisturePercent, temperature, humidity);
      Serial.printf("Hourly check - I=%.3f (limit=%.3f)\n", I, limitI);

      if (I > limitI) {
        double durationSeconds = (double)I * 540.0 * (double)s;
        if (durationSeconds < 1.0) durationSeconds = 1.0;
        pumpDurationMs = (unsigned long)(durationSeconds * 1000.0);
        pumpStartTimeMs = now;
        pumpAutoRunning = true;
        applyRelay(true);
        writePumpStateToFirebase(true);
        Serial.printf("Auto pump started for %.0f s (%.0f ms)\n", durationSeconds, (double)pumpDurationMs);
      } else {
        Serial.println("I not over limit - no auto start");
      }
    }
  }

  if (pumpAutoRunning && pumpStartTimeMs > 0) {
    if (now - pumpStartTimeMs >= pumpDurationMs) {
      applyRelay(false);
      pumpAutoRunning = false;
      pumpStartTimeMs = 0;
      pumpDurationMs = 0;
      writePumpStateToFirebase(false);
      Serial.println("Auto pump duration finished - pump stopped");
    }
  }

  delay(1);
}
