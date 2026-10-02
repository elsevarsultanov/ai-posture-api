const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// =====================================================
// DEVICES
// =====================================================

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

      status: "not_calibrated",

      calibrationRequested: false,

      currentPitch: null,
      deviation: null,

      lastUpdate: null
    };
  }

  return devices[deviceId];
}

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "AI Posture API",
    version: "2.0.0"
  });
});

// =====================================================
// GET DEVICE
// ESP8266 + AI STUDIO
// =====================================================

app.get("/api/device/:deviceId", (req, res) => {

  const deviceId = req.params.deviceId;

  const device = getDevice(deviceId);

  res.status(200).json({
    ok: true,
    device: device
  });
});

// =====================================================
// REQUEST CALIBRATION
// AI STUDIO → RENDER
// =====================================================

app.post("/api/calibration/request", (req, res) => {

  const { deviceId } = req.body;

  if (!deviceId) {
    return res.status(400).json({
      ok: false,
      error: "deviceId is required"
    });
  }

  const device = getDevice(deviceId);

  device.calibrationRequested = true;

  device.status = "calibration_requested";

  res.json({
    ok: true,
    message: "Calibration requested",
    device: device
  });
});

// =====================================================
// SAVE CALIBRATION
// ESP8266 → RENDER
// =====================================================

app.post("/api/calibration", (req, res) => {

  const {
    deviceId,
    normalPitch
  } = req.body;

  if (!deviceId) {
    return res.status(400).json({
      ok: false,
      error: "deviceId is required"
    });
  }

  if (
    typeof normalPitch !== "number" ||
    !Number.isFinite(normalPitch)
  ) {
    return res.status(400).json({
      ok: false,
      error: "normalPitch must be a valid number"
    });
  }

  const device = getDevice(deviceId);

  device.normalPitch = normalPitch;

  device.calibrated = true;

  device.calibrationRequested = false;

  device.status = "calibrated";

  device.currentPitch = null;

  device.deviation = null;

  device.lastUpdate = new Date().toISOString();

  res.json({
    ok: true,
    message: "Calibration saved",
    device: device
  });
});

// =====================================================
// POSTURE UPDATE
// ESP8266 → RENDER
// =====================================================

app.post("/api/posture", (req, res) => {

  const {
    deviceId,
    currentPitch
  } = req.body;

  if (!deviceId) {
    return res.status(400).json({
      ok: false,
      error: "deviceId is required"
    });
  }

  if (
    typeof currentPitch !== "number" ||
    !Number.isFinite(currentPitch)
  ) {
    return res.status(400).json({
      ok: false,
      error: "currentPitch must be a valid number"
    });
  }

  const device = getDevice(deviceId);

  device.currentPitch = currentPitch;

  device.lastUpdate = new Date().toISOString();

  if (device.calibrated && device.normalPitch !== null) {

    const deviation =
      Math.abs(
        currentPitch - device.normalPitch
      );

    device.deviation = deviation;

    if (deviation < device.warningAngle) {

      device.status = "good";

    } else if (deviation < device.badAngle) {

      device.status = "warning";

    } else if (deviation < device.criticalAngle) {

      device.status = "bad";

    } else {

      device.status = "critical";
    }
  }

  res.json({
    ok: true,

    deviceId: deviceId,

    currentPitch: device.currentPitch,

    normalPitch: device.normalPitch,

    deviation: device.deviation,

    status: device.status
  });
});

// =====================================================
// SETTINGS
// =====================================================

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
      error: "deviceId is required"
    });
  }

  const device = getDevice(deviceId);

  if (
    typeof warningAngle === "number" &&
    Number.isFinite(warningAngle)
  ) {
    device.warningAngle = warningAngle;
  }

  if (
    typeof badAngle === "number" &&
    Number.isFinite(badAngle)
  ) {
    device.badAngle = badAngle;
  }

  if (
    typeof criticalAngle === "number" &&
    Number.isFinite(criticalAngle)
  ) {
    device.criticalAngle = criticalAngle;
  }

  res.json({
    ok: true,
    device: device
  });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {

  console.log(
    `AI Posture API running on port ${PORT}`
  );

});
