// ตัวแปรเก็บสถานะว่าการ์ดแต่ละใบกำลังแสดงรูปที่เท่าไหร่ และเก็บรอบเวลาของแต่ละการ์ด
const sliderStates = {};
const sliderIntervals = {};

window.addEventListener('DOMContentLoaded', () => {
  fetch(APP_CONFIG.SCRIPT_URL + '?action=getIncidents')
    .then(response => response.json())
    .then(data => {
      if (data.status === "Success") {
        renderDashboard(data.data);
      } else {
        document.getElementById('incidents-list').innerHTML = `<div style="text-align:center; color:red; padding:20px;">เกิดข้อผิดพลาด: ${data.message}</div>`;
      }
    })
    .catch(error => {
      document.getElementById('incidents-list').innerHTML = `<div style="text-align:center; color:red; padding:20px;">การเชื่อมต่อล้มเหลว: ${error.message}</div>`;
    });
});

function renderDashboard(incidents) {
  let total = incidents.length;
  let normal = 0, warning = 0, danger = 0;
  let cardsHtml = '';
  
  // เก็บ ID ของการ์ดที่มีมากกว่า 1 รูปเพื่อทำสไลด์อัตโนมัติ
  let autoSlideCards = [];

  incidents.forEach((item, index) => {
    // นับสถิติ
    if (item.severity === 'เหตุการณ์ปกติ') normal++;
    else if (item.severity === 'อาจเกิดอันตรายได้') warning++;
    else if (item.severity === 'อันตรายมากต้องแก้ไข') danger++;

    let badgeClass = 'badge-normal';
    if (item.severity === 'อาจเกิดอันตรายได้') badgeClass = 'badge-warning';
    if (item.severity === 'อันตรายมากต้องแก้ไข') badgeClass = 'badge-danger';

    // วันที่และเวลาไทย
    let dateTimeHtml = item.timestamp;
    let d = new Date(item.timestamp);
    if (!isNaN(d)) {
       let dateStr = d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
       let timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
       dateTimeHtml = `<strong style="font-size:16px; color:#207144;">${dateStr}</strong><br><span style="color:#6b7280; font-size:14px;">เวลา ${timeStr} น.</span>`;
    }

    // จัดการรูปภาพ
    let validImages = [];
    item.images.forEach(url => {
      if (url && url.trim() !== "") {
        let imgIdMatch = url.match(/\/d\/(.+?)\//);
        if (imgIdMatch && imgIdMatch[1]) {
           validImages.push(`https://drive.google.com/thumbnail?id=${imgIdMatch[1]}&sz=w800`);
        } else {
           validImages.push(url);
        }
      }
    });

    let imagesHtml = '';
    let cardId = `card-${index}`;
    sliderStates[cardId] = 0; // ตั้งค่าเริ่มต้นให้แสดงภาพที่ 0

    if (validImages.length > 0) {
      // สร้างโครงสร้าง Slider
      let slidesHtml = validImages.map((img, i) => `
        <img src="${img}" class="slide ${i === 0 ? 'active' : ''}" alt="รูปภาพเหตุการณ์">
      `).join('');

      let controlsHtml = '';
      if (validImages.length > 1) {
        // ถ้ามีมากกว่า 1 รูป ให้แสดงปุ่มเลื่อน จุด (Dots) และเก็บ ID ไว้ทำสไลด์อัตโนมัติ
        autoSlideCards.push(cardId);
        
        let dotsHtml = validImages.map((_, i) => `
          <span class="dot ${i === 0 ? 'active' : ''}" onclick="setSlide('${cardId}', ${i})"></span>
        `).join('');

        controlsHtml = `
          <button class="slider-btn prev" onclick="moveSlide('${cardId}', -1)">&#10094;</button>
          <button class="slider-btn next" onclick="moveSlide('${cardId}', 1)">&#10095;</button>
          <div class="slider-dots">${dotsHtml}</div>
        `;
      }

      imagesHtml = `
        <div class="slider-container" id="slider-${cardId}">
          ${slidesHtml}
          ${controlsHtml}
        </div>
      `;
    } else {
      imagesHtml = `<div class="slider-container"><div class="no-image">ไม่มีรูปภาพแนบ</div></div>`;
    }

    // ประกอบ HTML
    cardsHtml += `
      <div class="incident-card">
        <div class="card-left">
          ${imagesHtml}
        </div>
        <div class="card-right">
          <div class="incident-header">
            <div>${dateTimeHtml}</div>
            <div><span class="badge ${badgeClass}">${item.severity}</span></div>
          </div>
          <div class="incident-info">
            <p><strong>ผู้รายงาน:</strong> ${item.name} <span style="color:#6b7280; font-size:13px;">(${item.position})</span></p>
            <p><strong>หน่วยงาน:</strong> ${item.department}</p>
            <p style="margin-top: 15px;"><strong>รายละเอียดเพิ่มเติม:</strong></p>
            <div class="detail-box">${item.details || 'ไม่มีการระบุรายละเอียดเพิ่มเติม'}</div>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById('count-total').innerText = total;
  document.getElementById('count-normal').innerText = normal;
  document.getElementById('count-warning').innerText = warning;
  document.getElementById('count-danger').innerText = danger;

  const container = document.getElementById('incidents-list');
  if (incidents.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; background:white; border-radius:12px; color:#6b7280;">ยังไม่มีข้อมูลการแจ้งเหตุ</div>';
  } else {
    container.innerHTML = cardsHtml;
    
    // เริ่มทำงานสไลด์อัตโนมัติหลังจากเรนเดอร์เสร็จ
    autoSlideCards.forEach(cardId => {
      startAutoSlide(cardId);
    });
  }
}

// ฟังก์ชันเริ่มสไลด์อัตโนมัติ
function startAutoSlide(cardId) {
  // ล้างการตั้งเวลาเดิมก่อนเพื่อไม่ให้เวลาซ้อนทับกันเมื่อผู้ใช้กดปุ่ม
  if (sliderIntervals[cardId]) clearInterval(sliderIntervals[cardId]);
  
  // ตั้งเวลาเลื่อนรูปภาพอัตโนมัติทุก 3.5 วินาที
  sliderIntervals[cardId] = setInterval(() => {
    moveSlide(cardId, 1, false);
  }, 3500);
}

// ฟังก์ชันเลื่อนภาพ ซ้าย-ขวา
function moveSlide(cardId, step, userAction = true) {
  const container = document.getElementById(`slider-${cardId}`);
  if (!container) return;
  
  const slides = container.querySelectorAll('.slide');
  const dots = container.querySelectorAll('.dot');
  
  sliderStates[cardId] += step;
  
  // วนลูปรูปภาพ
  if (sliderStates[cardId] >= slides.length) sliderStates[cardId] = 0;
  if (sliderStates[cardId] < 0) sliderStates[cardId] = slides.length - 1;
  
  updateSliderUI(slides, dots, sliderStates[cardId]);
  
  // ถ้าย้ายรูปโดยการกดเอง ให้รีเซ็ตเวลานับใหม่
  if (userAction) startAutoSlide(cardId);
}

// ฟังก์ชันกดข้ามไปรูปที่ต้องการ (เวลากดที่จุด)
function setSlide(cardId, slideIndex) {
  const container = document.getElementById(`slider-${cardId}`);
  if (!container) return;
  
  const slides = container.querySelectorAll('.slide');
  const dots = container.querySelectorAll('.dot');
  
  sliderStates[cardId] = slideIndex;
  updateSliderUI(slides, dots, sliderStates[cardId]);
  
  // รีเซ็ตเวลานับใหม่เมื่อผู้ใช้กด
  startAutoSlide(cardId);
}

// อัปเดตคลาส active บนรูปภาพและจุด
function updateSliderUI(slides, dots, currentIndex) {
  slides.forEach((slide, idx) => {
    slide.classList.remove('active');
    if (idx === currentIndex) slide.classList.add('active');
  });
  
  if (dots.length > 0) {
    dots.forEach((dot, idx) => {
      dot.classList.remove('active');
      if (idx === currentIndex) dot.classList.add('active');
    });
  }
}