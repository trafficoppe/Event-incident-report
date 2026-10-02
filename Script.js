let selectedFiles = [];
let employeeData = []; 

// 1. โหลดรายชื่อพนักงานทันทีที่เปิดเว็บ
window.addEventListener('DOMContentLoaded', () => {
  fetch(APP_CONFIG.SCRIPT_URL + '?action=getEmployees')
    .then(response => response.json())
    .then(data => {
      if (data.status === "Success") {
        employeeData = data.data;
      }
    })
    .catch(error => console.error("Error loading employees:", error));
});

// 2. ระบบ Autocomplete ค้นหาชื่อ
const nameInput = document.getElementById('name');
const positionInput = document.getElementById('position');
const departmentInput = document.getElementById('department');
const autocompleteList = document.getElementById('autocomplete-list');

nameInput.addEventListener('input', function() {
  let val = this.value;
  autocompleteList.innerHTML = '';
  if (!val) return false;

  let count = 0;
  employeeData.forEach(emp => {
    if (emp.name.toLowerCase().includes(val.toLowerCase()) && count < 8) { 
      let item = document.createElement('div');
      
      let regex = new RegExp(`(${val})`, "gi");
      item.innerHTML = emp.name.replace(regex, "<strong>$1</strong>");
      
      item.addEventListener('click', function() {
        nameInput.value = emp.name;
        positionInput.value = emp.position;       
        departmentInput.value = emp.department;   
        autocompleteList.innerHTML = '';
      });
      autocompleteList.appendChild(item);
      count++;
    }
  });
});

document.addEventListener('click', function(e) {
  if (e.target !== nameInput) {
    autocompleteList.innerHTML = '';
  }
});

// 3. ระบบจัดการอัปโหลดรูปภาพ
document.getElementById('imageUpload').addEventListener('change', function(e) {
  let newFiles = Array.from(e.target.files);
  
  if (selectedFiles.length + newFiles.length > 3) {
    // ใช้ SweetAlert2 แจ้งเตือนเมื่อรูปเกิน
    Swal.fire({
      title: 'แจ้งเตือน',
      text: 'สามารถแนบรูปภาพได้สูงสุด 3 รูปเท่านั้น',
      icon: 'warning',
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#f39c12'
    });
    newFiles = newFiles.slice(0, 3 - selectedFiles.length);
  }
  
  selectedFiles = selectedFiles.concat(newFiles);
  updateFileList();
  this.value = ''; 
});

function updateFileList() {
  const fileList = document.getElementById('fileList');
  fileList.innerHTML = '';
  
  selectedFiles.forEach((file, index) => {
    let item = document.createElement('div');
    item.className = 'file-item';
    
    let fileName = file.name;
    if (fileName.length > 25) {
      fileName = fileName.substring(0, 22) + '...';
    }

    item.innerHTML = `<span>${fileName}</span> <span class="remove-btn" onclick="removeFile(${index})" title="ลบไฟล์นี้">✖</span>`;
    fileList.appendChild(item);
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  updateFileList();
}

document.getElementById('incidentForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // (อาจจะมีโค้ดเปลี่ยนข้อความปุ่มเป็น "กำลังส่งข้อมูล..." อยู่ตรงนี้ ปล่อยไว้เหมือนเดิมครับ)
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.innerText = "กำลังส่งข้อมูล...";
  submitBtn.disabled = true;

  // 🔽 เอาโค้ดมาวางตรงนี้เลยครับ (แทนที่ formData อันเก่าไปเลย) 🔽
  
  // 1. ดึงค่าประเภทเหตุการณ์ (ถ้าเลือก "อื่นๆ" ให้เอาข้อความที่พิมพ์มาใช้)
  let categoryValue = "";
  let categoryEle = document.querySelector('input[name="category"]:checked');
  if (categoryEle) {
      categoryValue = categoryEle.value === 'อื่นๆ' ? document.getElementById('otherCategory').value : categoryEle.value;
  }
  
  // 2. ดึงค่าความรุนแรง
  let severityValue = "";
  let severityEle = document.querySelector('input[name="severity"]:checked');
  if (severityEle) {
      severityValue = severityEle.value;
  }

  // 3. จัดเตรียมข้อมูลส่งไป Google Apps Script
  let formData = {
    name: document.getElementById('name').value,
    position: document.getElementById('position').value,
    department: document.getElementById('department').value,
    category: categoryValue,
    severity: severityValue,
    location: document.getElementById('location').value,
    details: document.getElementById('details').value
  };
  
  // 🔼 สิ้นสุดส่วนที่ต้องเอามาวาง 🔼

  // ... โค้ดด้านล่างนี้จะเป็นส่วนที่ใช้แปลงรูปภาพ และใช้คำสั่ง fetch() ส่งข้อมูลไป Apps Script 
  // (ซึ่งโค้ดส่วนล่างนี้ ให้ใช้ของเดิมที่คุณมีอยู่ได้เลยครับ ไม่ต้องลบ)
  
  // ตัวอย่างเช่น:
  // let imagePromises = selectedFiles.map(file => getBase64(file));
  // ...

  const getBase64 = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ filename: file.name, mimeType: file.type, data: reader.result });
      };
      reader.readAsDataURL(file);
    });
  };

  let filePromises = [];
  for(let i = 0; i < 3; i++) {
    if(selectedFiles[i]) {
      filePromises.push(getBase64(selectedFiles[i]).then(data => { formData['image' + (i+1)] = data; }));
    } else {
      formData['image' + (i+1)] = null;
    }
  }

  Promise.all(filePromises).then(() => {
    fetch(APP_CONFIG.SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(formData)
    })
    .then(response => response.json())
    .then(data => {
      submitBtn.disabled = false;
      submitBtn.innerText = 'ส่งรายงาน';
      
      if (data.status === "Success") {
        // แจ้งเตือนเมื่อสำเร็จด้วย SweetAlert2
        Swal.fire({
          title: 'สำเร็จ!',
          text: 'บันทึกข้อมูลและอัปโหลดรูปเรียบร้อยแล้ว',
          icon: 'success',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#207144'
        });
        
        document.getElementById('incidentForm').reset();
        selectedFiles = [];
        updateFileList();
      } else {
        // แจ้งเตือนเมื่อบันทึกข้อมูล Error 
        Swal.fire({
          title: 'เกิดข้อผิดพลาด',
          text: data.message,
          icon: 'error',
          confirmButtonText: 'ตกลง',
          confirmButtonColor: '#e74c3c'
        });
      }
    })
    .catch(error => {
      submitBtn.disabled = false;
      submitBtn.innerText = 'ส่งรายงาน';
      
      // แจ้งเตือนเมื่อเชื่อมต่อไม่ได้หรือเน็ตหลุด
      Swal.fire({
        title: 'การเชื่อมต่อล้มเหลว',
        text: 'โปรดตรวจสอบอินเทอร์เน็ตของคุณ หรือลองใหม่อีกครั้ง',
        icon: 'error',
        confirmButtonText: 'ตกลง',
        confirmButtonColor: '#e74c3c'
      });
    });
  });
});
// ระบบซ่อน/แสดงช่อง "อื่นๆ" ของประเภทเหตุการณ์
document.querySelectorAll('input[name="category"]').forEach(radio => {
  radio.addEventListener('change', function() {
    const otherInput = document.getElementById('otherCategory');
    if (this.value === 'อื่นๆ') {
      otherInput.style.display = 'block';
      otherInput.required = true;
      otherInput.focus();
    } else {
      otherInput.style.display = 'none';
      otherInput.required = false;
      otherInput.value = '';
    }
  });
});