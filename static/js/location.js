// ====== 配置区 ======
const SHEETDB_API_URL = "https://sheetdb.io/api/v1/42l4qrr2ds9o1"; // ← 改成你的 SheetDB API URL
// ===================

// 发送数据到 SheetDB
async function sendToSheetDB(data) {
  try {
    await fetch(SHEETDB_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [data] })
    });
    console.log("✅ 访客信息已上传：", data);
  } catch (err) {
    console.error("❌ 上传失败:", err);
  }
}

// 获取浏览器定位（需要用户授权）
function getGeoByBrowser() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject("浏览器不支持地理定位");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          source: "browser",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

// 获取 IP 定位（不需要授权）
async function getGeoByIP() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const info = await res.json();
    return {
      source: "ipapi",
      ip: info.ip,
      city: info.city,
      region: info.region,
      country: info.country_name,
      latitude: info.latitude,
      longitude: info.longitude,
    };
  } catch (e) {
    console.warn("IP 定位失败：", e);
    return null;
  }
}

// 主逻辑
(async function () {
  // 避免重复记录：本地只记录一次
  if (localStorage.getItem("visitorLogged")) {
    console.log("🚫 已记录过访客信息，跳过。");
    return;
  }

  let locationData = null;

  try {
    console.log("📍 尝试使用浏览器定位...");
    const browserLoc = await getGeoByBrowser();
    locationData = browserLoc;
    console.log("✅ 浏览器定位成功");
  } catch (err) {
    console.warn("❌ 浏览器定位失败:", err);
    console.log("🌐 使用 IP 定位替代...");
    const ipLoc = await getGeoByIP();
    locationData = ipLoc;
  }

  if (!locationData) {
    console.error("无法获取任何地理位置信息。");
    return;
  }

  const data = {
    timestamp: new Date().toISOString(),
    ...locationData
  };

  await sendToSheetDB(data);
  localStorage.setItem("visitorLogged", "true");
})();
