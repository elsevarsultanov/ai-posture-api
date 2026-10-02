const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const devices = {};

function getDevice(deviceId) {
  if (!devices[deviceId]) {
    devices[deviceId] = {
      deviceId: deviceId,
      calibrated: false,
      normalPitch: null,
      warningAngle: 10,
      badAngle: 15,
      criticalAngle: 20,
      status: "not_calibrated"
    };
  }

  return devices[deviceId];
}

// TEST
app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "AI Posture API",
    version: "1.0.0"
  });
});

// ESP8266 bu endpoint-i çağırır
app.get("/api/device/:deviceId", (req, res) => {

  const device = getDevice(req.params.deviceId);

  res.status(200).json({
    ok: true,
    device: device
  });
});

// Kalibrasiya
app.post("/api/calibration", (req, res) => {

  const {
    deviceId,
    normalPitch
  } = req.body;

  if (!deviceId || typeof normalPitch !== "number") {
    return res.status(400).json({
      ok: false,
      error: "deviceId ve normalPitch teleb olunur"
    });
  }

  const device = getDevice(deviceId);

  device.calibrated = true;
  device.normalPitch = normalPitch;
  device.status = "ready";

  res.json({
    ok: true,
    message: "Duzgun oturus yadda saxlanildi",
    device: device
  });
});

// Parametrləri dəyiş
app.post("/api/settings", (req, res) => {

  const {
    deviceId,
    warningAngle,
    badAngle,
    criticalAngle
  } = req.body;

  if (!deviceId) {
    return res.status(400).json({
      ok: false,
      error: "deviceId teleb olunur"
    });
  }

  const device = getDevice(deviceId);

  if (typeof warningAngle === "number") {
    device.warningAngle = warningAngle;
  }

  if (typeof badAngle === "number") {
    device.badAngle = badAngle;
  }

  if (typeof criticalAngle === "number") {
    device.criticalAngle = criticalAngle;
  }

  res.json({
    ok: true,
    message: "Parametrler yenilendi",
    device: device
  });
});

// ESP8266 posture göndərir
app.post("/api/posture", (req, res) => {

  const {
    deviceId,
    pitch
  } = req.body;

  if (!deviceId || typeof pitch !== "number") {
    return res.status(400).json({
      ok: false,
      error: "deviceId ve pitch teleb olunur"
    });
  }

  const device = getDevice(deviceId);

  if (!device.calibrated) {
    return res.json({
      ok: true,
      calibrated: false,
      status: "not_calibrated"
    });
  }

  const deviation =
    Math.abs(device.normalPitch - pitch);

  let status = "good";
  let speak = false;
  let message = "";

  if (deviation >= device.criticalAngle) {

    status = "critical";
    speak = true;
    message = "Xahiş edirəm, düzgün oturun.";

  } else if (deviation >= device.badAngle) {

    status = "bad";
    speak = true;
    message = "Xahiş edirəm, düzgün oturun.";

  } else if (deviation >= device.warningAngle) {

    status = "warning";
  }

  device.status = status;

  res.json({
    ok: true,
    calibrated: true,
    status: status,
    pitch: pitch,
    normalPitch: device.normalPitch,
    deviation: deviation,
    speak: speak,
    message: message
  });
});

app.listen(PORT, () => {
  console.log(`AI Posture API running on port ${PORT}`);
});
