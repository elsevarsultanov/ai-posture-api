const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Müvəqqəti yaddaş.
// Sonrakı mərhələdə bunu database ilə dəyişə bilərik.
const devices = {};

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "AI Posture API",
    version: "1.0.0"
  });
});

// Cihazın vəziyyətini əldə et
app.get("/api/device/:deviceId", (req, res) => {
  const { deviceId } = req.params;

  if (!devices[deviceId]) {
    devices[deviceId] = {
      deviceId,
      calibrated: false,
      normalPitch: null,
      warningAngle: 10,
      badAngle: 15,
      criticalAngle: 20,
      status: "not_calibrated"
    };
  }

  res.json({
    ok: true,
    device: devices[deviceId]
  });
});

// Kalibrasiya nəticəsini yadda saxla
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

  devices[deviceId] = {
    ...(devices[deviceId] || {}),
    deviceId,
    calibrated: true,
    normalPitch,
    warningAngle: 10,
    badAngle: 15,
    criticalAngle: 20,
    status: "ready"
  };

  res.json({
    ok: true,
    message: "Duzgun oturus yadda saxlanildi",
    device: devices[deviceId]
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

  if (!devices[deviceId]) {
    devices[deviceId] = {
      deviceId,
      calibrated: false,
      normalPitch: null,
      warningAngle: 10,
      badAngle: 15,
      criticalAngle: 20,
      status: "not_calibrated"
    };
  }

  if (typeof warningAngle === "number") {
    devices[deviceId].warningAngle = warningAngle;
  }

  if (typeof badAngle === "number") {
    devices[deviceId].badAngle = badAngle;
  }

  if (typeof criticalAngle === "number") {
    devices[deviceId].criticalAngle = criticalAngle;
  }

  res.json({
    ok: true,
    message: "Parametrler yenilendi",
    device: devices[deviceId]
  });
});

// ESP8266-dan cari posture məlumatı
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

  const device = devices[deviceId];

  if (!device) {
    return res.status(404).json({
      ok: false,
      error: "Cihaz tapilmadi"
    });
  }

  if (!device.calibrated) {
    return res.json({
      ok: true,
      calibrated: false,
      status: "not_calibrated"
    });
  }

  const deviation = Math.abs(device.normalPitch - pitch);

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
  device.lastPitch = pitch;
  device.deviation = deviation;

  res.json({
    ok: true,
    calibrated: true,
    status,
    pitch,
    normalPitch: device.normalPitch,
    deviation,
    speak,
    message
  });
});

app.listen(PORT, () => {
  console.log(`AI Posture API running on port ${PORT}`);
});
