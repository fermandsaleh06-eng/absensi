const DEFAULT_ROOMS = [
    { id: 'R01', name: 'IGD', hasPatients: true },
    { id: 'R01A', name: 'Ponek', hasPatients: true },
    { id: 'R02', name: 'Ruangan NICU', hasPatients: true },
    { id: 'R03', name: 'Ruangan Dewasa I', hasPatients: true },
    { id: 'R04', name: 'Ruangan Paru', hasPatients: true },
    { id: 'R05', name: 'Ruangan Dewasa II/Kelas', hasPatients: true },
    { id: 'R06', name: 'Ruangan Kebidanan', hasPatients: true },
    { id: 'R07', name: 'Ruangan Anak', hasPatients: true },
    { id: 'R08', name: 'Rekam Medik', hasPatients: false },
    { id: 'R09', name: 'Apotik', hasPatients: false },
    { id: 'R10', name: 'Laboratorium', hasPatients: false },
    { id: 'R11', name: 'Radiologi', hasPatients: false },
    { id: 'R12', name: 'Ruangan Gizi', hasPatients: false }
];

const app = {
    photoBase64: null,
    currentDate: '',

    init() {
        this.currentDate = this.getFormattedDate();
        document.getElementById('home-date').textContent = this.currentDate;
        
        // Initialize DB
        if (!localStorage.getItem('rsud_monitoring')) {
            localStorage.setItem('rsud_monitoring', JSON.stringify([]));
        }
        if (!localStorage.getItem('rsud_employees_saved')) {
            localStorage.setItem('rsud_employees_saved', JSON.stringify([]));
        }

        this.renderEmployeeDatalist();

        // Setup navigation back button
        document.getElementById('btn-back').addEventListener('click', () => {
            this.navigateTo('home');
        });
    },

    getFormattedDate(dateObj = new Date()) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return dateObj.toLocaleDateString('id-ID', options);
    },

    getFormattedTime() {
        const d = new Date();
        return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    },

    getYYYYMMDD(dateObj = new Date()) {
        return dateObj.toISOString().split('T')[0];
    },

    navigateTo(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        // Show target screen
        document.getElementById(`screen-${screenId}`).classList.add('active');
        
        // Header and back button logic
        const btnBack = document.getElementById('btn-back');
        if (screenId === 'home') {
            btnBack.classList.add('hidden');
            document.getElementById('header-title').textContent = 'RSUD Monitoring';
        } else {
            btnBack.classList.remove('hidden');
        }

        // Screen specific init
        if (screenId === 'room-list') this.loadRoomList();
        if (screenId === 'today-data') this.loadTodayData();
        if (screenId === 'history') {
            document.getElementById('header-title').textContent = 'Riwayat';
            document.getElementById('history-date').value = this.getYYYYMMDD();
            this.loadHistoryByDate();
        }
    },

    loadRoomList() {
        document.getElementById('header-title').textContent = 'Pilih Ruangan';
        const rooms = DEFAULT_ROOMS;
        const container = document.getElementById('room-list-container');
        container.innerHTML = '';
        
        rooms.forEach(room => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div class="list-item-title">${room.name}</div>
                <i class="fas fa-chevron-right text-muted"></i>
            `;
            div.onclick = () => this.openMonitoringForm(room);
            container.appendChild(div);
        });
        this.navigateTo('room-list');
    },

    renderEmployeeDatalist() {
        const names = JSON.parse(localStorage.getItem('rsud_employees_saved') || '[]');
        const datalist = document.getElementById('employee-names');
        datalist.innerHTML = '';
        names.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            datalist.appendChild(option);
        });
    },

    openMonitoringForm(room) {
        document.getElementById('header-title').textContent = 'Monitoring';
        
        // Reset Form
        document.getElementById('monitoring-form').reset();
        this.photoBase64 = null;
        document.getElementById('photo-preview-container').classList.add('hidden');
        
        // Counters reset
        if(document.getElementById('oxy-tp-l')) {
            document.getElementById('oxy-tp-l').value = 0;
            document.getElementById('oxy-tp-p').value = 0;
            document.getElementById('oxy-kp-l').value = 0;
            document.getElementById('oxy-kp-p').value = 0;
            document.getElementById('oxy-sb').value = 0;
        }
        document.getElementById('patient-total').textContent = '0';
        document.getElementById('patient-male-total').textContent = '0';
        document.getElementById('patient-female-total').textContent = '0';
        document.getElementById('patient-breakdown').innerHTML = '';
        
        const dokterInput = document.getElementById('dokter-jaga');
        if(dokterInput) dokterInput.value = '';
        
        // Set metadata
        document.getElementById('form-room-id').value = room.id;
        document.getElementById('form-has-patients').value = room.hasPatients;
        document.getElementById('form-room-name').textContent = room.name;
        document.getElementById('form-date').querySelector('span').textContent = this.currentDate;
        
        const timeNow = this.getFormattedTime();
        document.getElementById('form-time').querySelector('span').textContent = timeNow;

        const secPat = document.getElementById('section-patients');
        const secOxy = document.getElementById('section-oxygen');
        const secDokter = document.getElementById('section-dokter-jaga');
        
        if (!room.hasPatients) {
            secPat.classList.add('hidden');
            secOxy.classList.add('hidden');
        } else {
            secPat.classList.remove('hidden');
            secOxy.classList.remove('hidden');
        }

        if (room.name.includes('IGD')) {
            secDokter.classList.remove('hidden');
        } else {
            secDokter.classList.add('hidden');
        }

        // Employees
        const employeeList = document.getElementById('employee-list');
        employeeList.innerHTML = '';
        this.addEmployeeField(); // Add one by default

        // Patients
        const patientList = document.getElementById('patient-list');
        patientList.innerHTML = '';

        this.navigateTo('monitoring-form');
    },

    addEmployeeField() {
        const container = document.getElementById('employee-list');
        const timeValue = new Date().toTimeString().substring(0, 5); // HH:MM
        const roomName = document.getElementById('form-room-name').textContent;
        const isGizi = roomName.includes('Gizi');
        const noTime = roomName.includes('Laboratorium') || roomName.includes('Radiologi') || roomName.includes('Gizi');
        
        const div = document.createElement('div');
        div.className = 'employee-row flex-column gap-10';
        div.style.marginBottom = "10px";
        
        let roleHtml = '';
        if (isGizi) {
            roleHtml = `
                <select class="form-control emp-role" style="margin-top:5px;" required>
                    <option value="" disabled selected>Pilih Jabatan / Peran</option>
                    <option value="Petugas Gizi">Petugas Gizi</option>
                    <option value="Juru Masak">Juru Masak</option>
                </select>
            `;
        }

        div.innerHTML = `
            <div style="display:flex; gap:10px;">
                <input type="text" class="form-control emp-name" placeholder="Nama Pegawai" list="employee-names" style="flex:1;" required>
                ${noTime ? `<input type="hidden" class="employee-time" value="">` : `<input type="time" class="form-control employee-time" value="${timeValue}" required style="width:110px;">`}
                <button type="button" class="btn btn-danger" style="padding:10px; border-radius:8px; border:none; background:var(--danger); color:white; cursor:pointer;" onclick="this.closest('.employee-row').remove()"><i class="fas fa-trash"></i></button>
            </div>
            ${roleHtml}
        `;
        container.appendChild(div);
    },

    addPatientField() {
        const container = document.getElementById('patient-list');
        const roomName = document.getElementById('form-room-name').textContent;
        const isIGD = roomName.includes('IGD');
        const isNICU = roomName.includes('NICU');
        const isDewasa1 = roomName.includes('Dewasa I') && !roomName.includes('Dewasa II');
        const isParu = roomName.includes('Paru');
        const isDewasa2 = roomName.includes('Dewasa II');
        const isKebidanan = roomName.includes('Kebidanan');
        const isAnak = roomName.includes('Anak');

        let genderHtml = `
            <select class="form-control pat-gender" style="flex:1;" onchange="app.recalcPatients()">
                <option value="L">Laki-laki (L)</option>
                <option value="P">Perempuan (P)</option>
            </select>
        `;
        if (isKebidanan) {
            genderHtml = `
                <select class="form-control pat-gender" style="flex:1;" onchange="app.recalcPatients()">
                    <option value="P">Perempuan (P)</option>
                </select>
            `;
        }

        let middleHtml = ''; 
        let bottomHtml = '';

        if (isIGD) {
            middleHtml = `
                <select class="form-control pat-room" style="flex:1;" required onchange="app.recalcPatients()">
                    <option value="" disabled selected>Pilih Area</option>
                    <option value="Tindakan">Tindakan</option>
                    <option value="Triase">Triase</option>
                    <option value="Resusitasi">Resusitasi</option>
                    <option value="Observasi">Observasi</option>
                    <option value="Rawat Jalan">Rawat Jalan</option>
                </select>
            `;
        } else if (isNICU) {
            middleHtml = `
                <select class="form-control pat-room" style="flex:1;" required onchange="app.recalcPatients()">
                    <option value="" disabled selected>Pilih Area</option>
                    <option value="NICU">NICU</option>
                    <option value="Perina">Perina</option>
                </select>
            `;
        } else if (isDewasa1) {
            middleHtml = `<input type="hidden" class="pat-room" value="-">`;
            bottomHtml = `<input type="hidden" class="pat-class" value="-">`;
        } else if (isParu || isDewasa2 || isKebidanan || isAnak) {
            middleHtml = `
                <select class="form-control pat-room" style="flex:1;" required onchange="app.recalcPatients()">
                    <option value="" disabled selected>Pilih Kelas</option>
                    <option value="Kelas 1">Kelas 1</option>
                    <option value="Kelas 2">Kelas 2</option>
                    <option value="Kelas 3">Kelas 3</option>
                </select>
            `;
        } else {
            // Default normal room
            middleHtml = `<input type="text" class="form-control pat-room" placeholder="No. Kamar" style="flex:1;" required onkeyup="app.recalcPatients()">`;
            bottomHtml = `<input type="text" class="form-control pat-class" placeholder="Kelas" required onkeyup="app.recalcPatients()">`;
        }

        const div = document.createElement('div');
        div.className = 'patient-row flex-column gap-10 mb-20';
        div.style.paddingBottom = "15px";
        div.style.borderBottom = "1px dashed var(--border)";
        
        div.innerHTML = `
            <div style="display:flex; gap:10px; align-items:center; margin-bottom:${bottomHtml ? '10px' : '0'};">
                ${genderHtml}
                ${middleHtml}
                <button type="button" class="btn btn-danger" style="padding:12px; border-radius:8px; border:none; background:var(--danger); color:white; cursor:pointer;" onclick="app.removePatientField(this)"><i class="fas fa-trash"></i></button>
            </div>
            ${bottomHtml ? `<div>${bottomHtml}</div>` : ''}
        `;
        container.appendChild(div);
        this.recalcPatients();
    },

    removePatientField(btn) {
        btn.closest('.patient-row').remove();
        this.recalcPatients();
    },

    recalcPatients() {
        let male = 0;
        let female = 0;
        const breakdown = { 'L': {}, 'P': {} };
        const isDewasa1 = document.getElementById('form-room-name').textContent.includes('Dewasa I') && !document.getElementById('form-room-name').textContent.includes('Dewasa II');

        document.querySelectorAll('.patient-row').forEach(row => {
            const gender = row.querySelector('.pat-gender').value;
            if (gender === 'L') male++;
            if (gender === 'P') female++;
            
            // Gather class/area for breakdown
            let cls = '';
            if (row.querySelector('.pat-room')) {
                let rVal = row.querySelector('.pat-room').value;
                if(rVal && rVal !== '-') cls = rVal; // usually the dropdown Area/Kelas
            }
            if (row.querySelector('.pat-class') && isDewasa1) {
                // Dewasa I classes removed, so this will fallback
                cls = row.querySelector('.pat-class').value || 'Tanpa Kelas';
                if(cls === '-') cls = 'Tanpa Kelas';
            }
            
            if (cls) {
                if (!breakdown[gender][cls]) breakdown[gender][cls] = 0;
                breakdown[gender][cls]++;
            }
        });
        document.getElementById('patient-male-total').textContent = male;
        document.getElementById('patient-female-total').textContent = female;
        document.getElementById('patient-total').textContent = male + female;

        // Render breakdown
        let bdHtml = '';
        ['L', 'P'].forEach(g => {
            let items = Object.keys(breakdown[g]).map(k => `${k}: ${breakdown[g][k]}`);
            if (items.length > 0) {
                bdHtml += `<div style="margin-top:2px;"><strong>${g === 'L' ? 'Laki-laki' : 'Perempuan'}</strong> — ${items.join(', ')}</div>`;
            }
        });
        document.getElementById('patient-breakdown').innerHTML = bdHtml;
    },

    updateCounter(id, delta) {
        const input = document.getElementById(id);
        if(!input) return;
        let val = parseInt(input.value) + delta;
        if (val < 0) val = 0;
        input.value = val;
    },


    handlePhoto(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.photoBase64 = e.target.result;
                document.getElementById('photo-preview').src = this.photoBase64;
                document.getElementById('photo-preview-container').classList.remove('hidden');
                document.getElementById('btn-take-photo').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    },

    removePhoto() {
        this.photoBase64 = null;
        document.getElementById('camera-input').value = '';
        document.getElementById('photo-preview-container').classList.add('hidden');
        document.getElementById('btn-take-photo').classList.remove('hidden');
    },

    saveMonitoring() {
        const dateISO = this.getYYYYMMDD();
        
        // Collect Employees
        const employees = [];
        let savedNames = JSON.parse(localStorage.getItem('rsud_employees_saved') || '[]');
        
        document.querySelectorAll('.employee-row').forEach(row => {
            const name = row.querySelector('.emp-name').value.trim();
            const time = row.querySelector('.employee-time').value;
            const roleEl = row.querySelector('.emp-role');
            const role = roleEl ? roleEl.value : '';
            if (name) {
                employees.push({ name, time, role });
                if (!savedNames.includes(name)) {
                    savedNames.push(name);
                }
            }
        });
        
        localStorage.setItem('rsud_employees_saved', JSON.stringify(savedNames));
        this.renderEmployeeDatalist(); // update datalist

        if (employees.length === 0) {
            alert('Minimal masukkan satu nama pegawai!');
            return;
        }

        const hasPatients = document.getElementById('form-has-patients').value === 'true';

        // Collect Patients
        const patients = [];
        let male = 0;
        let female = 0;
        let oxy_tp_l = 0, oxy_tp_p = 0;
        let oxy_kp_l = 0, oxy_kp_p = 0;
        let oxy_sb = 0;

        if (hasPatients) {
            document.querySelectorAll('.patient-row').forEach(row => {
                let rVal = row.querySelector('.pat-room') ? row.querySelector('.pat-room').value.trim() : '';
                let cVal = row.querySelector('.pat-class') ? row.querySelector('.pat-class').value.trim() : '';
                patients.push({
                    gender: row.querySelector('.pat-gender').value,
                    kamar: rVal,
                    kelas: cVal
                });
            });
            male = patients.filter(p => p.gender === 'L').length;
            female = patients.filter(p => p.gender === 'P').length;
            
            oxy_tp_l = parseInt(document.getElementById('oxy-tp-l').value) || 0;
            oxy_tp_p = parseInt(document.getElementById('oxy-tp-p').value) || 0;
            oxy_kp_l = parseInt(document.getElementById('oxy-kp-l').value) || 0;
            oxy_kp_p = parseInt(document.getElementById('oxy-kp-p').value) || 0;
            oxy_sb = parseInt(document.getElementById('oxy-sb').value) || 0;
        }

        const data = {
            id: 'M-' + Date.now(),
            date: dateISO,
            dateFormatted: this.currentDate,
            time: document.getElementById('form-time').querySelector('span').textContent,
            room_id: document.getElementById('form-room-id').value,
            room_name: document.getElementById('form-room-name').textContent,
            dokter_jaga: document.getElementById('dokter-jaga') ? document.getElementById('dokter-jaga').value.trim() : '',
            hasPatients: hasPatients,
            employees: employees,
            patients: patients,
            patient_male: male,
            patient_female: female,
            patient_total: male + female,
            oxy_tp_l: oxy_tp_l,
            oxy_tp_p: oxy_tp_p,
            oxy_kp_l: oxy_kp_l,
            oxy_kp_p: oxy_kp_p,
            oxy_sb: oxy_sb,
            issue: document.getElementById('issue-text').value.trim(),
            notes: document.getElementById('notes').value,
            photo: this.photoBase64
        };

        const records = JSON.parse(localStorage.getItem('rsud_monitoring'));
        
        // Optional: Overwrite if room already visited today, or just push new
        // Based on simpler flow, we can just push it (allowing multiple visits or updating)
        // Let's replace if exists for same day and room
        const existingIndex = records.findIndex(r => r.date === dateISO && r.room_id === data.room_id);
        if (existingIndex >= 0) {
            records[existingIndex] = data;
        } else {
            records.push(data);
        }

        localStorage.setItem('rsud_monitoring', JSON.stringify(records));
        
        document.getElementById('success-message').textContent = `Data ${data.room_name} berhasil disimpan.`;
        this.navigateTo('success');
    },

    loadTodayData() {
        document.getElementById('header-title').textContent = 'Data Hari Ini';
        document.getElementById('today-data-date').textContent = this.currentDate;
        
        const dateISO = this.getYYYYMMDD();
        const rooms = DEFAULT_ROOMS;
        const records = JSON.parse(localStorage.getItem('rsud_monitoring'))
                        .filter(r => r.date === dateISO);
        
        let visited = 0;
        const container = document.getElementById('today-rooms-list');
        container.innerHTML = '';

        rooms.forEach(room => {
            const record = records.find(r => r.room_id === room.id);
            const div = document.createElement('div');
            div.className = 'list-item';
            
            if (record) {
                visited++;
                div.innerHTML = `
                    <div>
                        <div class="list-item-title">${room.name}</div>
                        <div class="text-muted" style="font-size:12px; margin-top:4px;"><i class="fas fa-clock"></i> ${record.time}</div>
                    </div>
                    <div class="list-item-status status-done">
                        <i class="fas fa-check"></i> Selesai
                    </div>
                `;
                div.onclick = () => this.showRoomDetail(record);
            } else {
                div.innerHTML = `
                    <div class="list-item-title">${room.name}</div>
                    <div class="list-item-status status-pending">Belum</div>
                `;
                div.onclick = () => this.openMonitoringForm(room);
            }
            container.appendChild(div);
        });

        document.getElementById('stat-total').textContent = rooms.length;
        document.getElementById('stat-visited').textContent = visited;
        document.getElementById('stat-unvisited').textContent = rooms.length - visited;
    },

    showRoomDetail(record) {
        document.getElementById('header-title').textContent = 'Detail Ruangan';
        
        let empsHtml = record.employees.map(e => `<li>${e.name} ${e.role ? `<strong>(${e.role})</strong>` : ''} — <span class="text-muted">${e.time}</span></li>`).join('');
        
        let patsHtml = '';
        if (!record.hasPatients) {
            patsHtml = '<li class="text-muted">Ruangan khusus petugas, tidak ada pasien.</li>';
        } else if (record.patients && record.patients.length > 0) {
            patsHtml = record.patients.map(p => {
                let txt = '';
                if (p.kamar && p.kamar !== '-') txt += p.kamar;
                if (p.kelas && p.kelas !== '-') txt += (txt ? ' - ' : '') + p.kelas;
                return `<li>${p.gender === 'L' ? 'Laki-laki' : 'Perempuan'} — ${txt || 'Tanpa Area/Kelas'}</li>`;
            }).join('');
        } else {
            patsHtml = '<li>Tidak ada pasien dicatat</li>';
        }

        let photoHtml = '';
        if (record.photo) {
            photoHtml = `<div class="detail-section">
                <h5>FOTO DOKUMENTASI</h5>
                <img src="${record.photo}" style="width:100%; border-radius:8px; margin-top:5px;">
            </div>`;
        }
        
        let oxygenHtml = '';
        if (record.hasPatients) {
            oxygenHtml = `
            <div class="detail-section">
                <h5>OKSIGEN</h5>
                <p style="font-size:12px; margin-bottom:5px;"><strong>Laki-laki:</strong> Terpakai: ${record.oxy_tp_l || 0} | KP: ${record.oxy_kp_l || 0}</p>
                <p style="font-size:12px; margin-bottom:5px;"><strong>Perempuan:</strong> Terpakai: ${record.oxy_tp_p || 0} | KP: ${record.oxy_kp_p || 0}</p>
                <p style="font-size:12px;"><strong>Standby (Total):</strong> ${record.oxy_sb || 0}</p>
            </div>
            `;
        }

        let dokterHtml = '';
        if (record.room_name.includes('IGD') && record.dokter_jaga) {
            dokterHtml = `
            <div class="detail-section">
                <h5>DOKTER JAGA</h5>
                <p>${record.dokter_jaga}</p>
            </div>
            `;
        }

        const html = `
            <h3>${record.room_name}</h3>
            <div style="font-size:14px; color:#6c757d; margin-bottom:15px;">
                <i class="fas fa-calendar"></i> ${record.dateFormatted} &nbsp;&nbsp; 
                <i class="fas fa-clock"></i> ${record.time}
            </div>
            
            ${dokterHtml}
            
            <div class="detail-section">
                <h5>PEGAWAI</h5>
                <ul class="detail-list">
                    ${empsHtml}
                </ul>
            </div>

            <div class="detail-section">
                <h5>PASIEN (Total: ${record.patient_total || 0})</h5>
                <p class="text-muted" style="font-size:12px;">L: ${record.patient_male || 0} | P: ${record.patient_female || 0}</p>
                <ul class="detail-list mt-10">
                    ${patsHtml}
                </ul>
            </div>

            ${oxygenHtml}

            <div class="detail-section">
                <h5>PERMASALAHAN</h5>
                <p style="background:#fff3cd; padding:10px; border-radius:8px;">
                    ${record.issue ? record.issue.replace(/\n/g, '<br>') : 'Tidak ada masalah dicatat.'}
                </p>
            </div>

            <div class="detail-section">
                <h5>CATATAN</h5>
                <p style="background:#f8f9fa; padding:10px; border-radius:8px; font-style:italic;">
                    ${record.notes ? record.notes.replace(/\n/g, '<br>') : 'Tidak ada catatan.'}
                </p>
            </div>

            ${photoHtml}
            
            <div style="margin-top:20px; display:flex; gap:10px;">
                <button class="btn btn-secondary" style="flex:1;" onclick="document.getElementById('detail-modal').classList.remove('active')">Tutup</button>
                <button class="btn btn-danger" style="flex:1; background:#dc3545;" onclick="app.deleteRecord('${record.id}')">Hapus Data</button>
            </div>
        `;
        
        document.getElementById('detail-content').innerHTML = html;
        this.navigateTo('room-detail');
    },

    loadHistoryByDate() {
        const dateInput = document.getElementById('history-date').value;
        if (!dateInput) return;

        const records = JSON.parse(localStorage.getItem('rsud_monitoring')).filter(r => r.date === dateInput);
        const container = document.getElementById('history-rooms-list');
        container.innerHTML = '';
        
        const summary = document.getElementById('history-summary');
        
        if (records.length === 0) {
            summary.classList.add('hidden');
            container.innerHTML = '<div class="text-center text-muted mt-20" style="padding:40px 0;"><i class="fas fa-box-open" style="font-size:40px; margin-bottom:10px;"></i><br>Tidak ada data monitoring untuk tanggal ini.</div>';
            return;
        }

        const dateObj = new Date(dateInput);
        document.getElementById('history-summary-date').textContent = this.getFormattedDate(dateObj);
        document.getElementById('history-summary-count').textContent = records.length;
        summary.classList.remove('hidden');

        records.forEach(record => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div>
                    <div class="list-item-title">${record.room_name}</div>
                    <div class="text-muted" style="font-size:12px; margin-top:4px;"><i class="fas fa-clock"></i> ${record.time}</div>
                </div>
                <i class="fas fa-chevron-right text-muted"></i>
            `;
            div.onclick = () => this.showRoomDetail(record);
            container.appendChild(div);
        });
    },

    actionReport(actionType) {
        const dateInput = document.getElementById('history-date').value;
        if (!dateInput) return;
        
        const records = JSON.parse(localStorage.getItem('rsud_monitoring')).filter(r => r.date === dateInput);
        if (records.length === 0) {
            alert('Tidak ada data pada tanggal ini.');
            return;
        }

        // Format Date for Title (e.g., 01-Oktober-2026)
        const dateObj = new Date(dateInput);
        const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
        const formattedTitleDate = `${String(dateObj.getDate()).padStart(2, '0')}-${months[dateObj.getMonth()]}-${dateObj.getFullYear()}`;
        
        if (actionType === 'whatsapp') {
            this.sendToWhatsApp(records, formattedTitleDate);
            return;
        }
        
        if (actionType === 'excel') {
            this.exportExcel(records, formattedTitleDate);
            return;
        }

        this.generatePDF(records, formattedTitleDate, actionType);
    },

    sendToWhatsApp(records, dateStr) {
        let text = `*LAPORAN SP RSUD*\n*Tanggal:* ${dateStr}\n\n`;
        
        records.forEach((r, idx) => {
            text += `*${idx+1}. ${r.room_name.toUpperCase()}*\n`;
            
            let emps = r.employees.map(e => `- ${e.name} ${e.role ? `(${e.role})` : ''} ${e.time ? `(Jam: ${e.time})` : ''}`.trim()).join('\n');
            if (r.dokter_jaga) {
                emps = `- Dr. ${r.dokter_jaga} (Dokter Jaga)\n` + emps;
            }
            text += `Petugas:\n${emps}\n`;
            
            if (r.hasPatients) {
                text += `Total Pasien: ${r.patient_total} (L:${r.patient_male}, P:${r.patient_female})\n`;
                let patList = (r.patients || []).map(p => {
                    let c = [p.kamar, p.kelas].filter(x => x && x !== '-').join('/');
                    return `- ${p.gender === 'L' ? 'L' : 'P'} (${c || 'Tanpa Area'})`;
                }).join('\n');
                text += `Rincian Pasien:\n${patList}\n`;
                text += `Oksigen: L (Tp:${r.oxy_tp_l || 0}, KP:${r.oxy_kp_l || 0}) | P (Tp:${r.oxy_tp_p || 0}, KP:${r.oxy_kp_p || 0}) | Standby: ${r.oxy_sb || 0}\n`;
            } else {
                const rn = r.room_name.toLowerCase();
                const isNonPatientRoom = rn.includes('rekam medik') || rn.includes('apotik') || rn.includes('laboratorium') || rn.includes('radiologi') || rn.includes('gizi');
                if (!isNonPatientRoom) {
                    text += `Hanya Petugas (Tidak ada pasien)\n`;
                }
            }
            
            if (r.issue && r.issue.trim() !== '') {
                text += `Masalah: ${r.issue}\n`;
            }
            text += `\n`;
        });
        
        const encoded = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encoded}`, '_blank');
    },

    deleteRecord(id) {
        if(confirm('Yakin ingin menghapus catatan ruangan ini?')) {
            let records = JSON.parse(localStorage.getItem('rsud_monitoring'));
            records = records.filter(r => r.id !== id);
            localStorage.setItem('rsud_monitoring', JSON.stringify(records));
            document.getElementById('detail-modal').classList.remove('active');
            
            // Reload views based on what is active
            this.loadTodayData();
            const dateInput = document.getElementById('history-date');
            if(dateInput && dateInput.value) {
                this.loadHistoryByDate();
            }
        }
    },

    deleteHistoryDate(dateISO) {
        if(confirm('Yakin ingin menghapus SEMUA data pada tanggal ini?')) {
            let records = JSON.parse(localStorage.getItem('rsud_monitoring'));
            records = records.filter(r => r.date !== dateISO);
            localStorage.setItem('rsud_monitoring', JSON.stringify(records));
            
            // Refresh history view
            this.loadHistoryByDate();
            this.loadTodayData();
            alert('Riwayat pada tanggal tersebut berhasil dihapus.');
        }
    },

    exportExcel(records, dateStr) {
        const dataArray = records.map(r => {
            let patDesc = '';
            if (!r.hasPatients) {
                patDesc = 'Hanya petugas';
            } else {
                patDesc = (r.patients || []).map(p => {
                    let c = [p.kamar, p.kelas].filter(x => x && x !== '-').join('/');
                    return `${p.gender === 'L' ? 'Laki-laki' : 'Perempuan'} (${c || 'Tanpa Area'})`;
                }).join(', ');
            }

            let oxyStr = '-';
            if (r.hasPatients) {
                oxyStr = `L (Tp:${r.oxy_tp_l || 0}, KP:${r.oxy_kp_l || 0}) | P (Tp:${r.oxy_tp_p || 0}, KP:${r.oxy_kp_p || 0}) | SB: ${r.oxy_sb || 0}`;
            }

            let emps = r.employees.map(e => `${e.name} ${e.role ? `(${e.role})` : ''} ${e.time ? `[${e.time}]` : ''}`.trim()).join(', ');
            if (r.dokter_jaga) {
                emps = `Dokter: ${r.dokter_jaga}, Petugas: ${emps}`;
            }

            return {
                'Ruangan': r.room_name,
                'Waktu Input': r.time,
                'Petugas': emps,
                'Total Pasien': r.hasPatients ? r.patient_total : '-',
                'Rincian Pasien': patDesc,
                'Oksigen': oxyStr,
                'Masalah': r.issue || '-'
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataArray);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan SP");
        
        // Auto-width columns
        const cols = [
            { wch: 15 }, // Ruangan
            { wch: 12 }, // Jam
            { wch: 35 }, // Petugas
            { wch: 10 }, // Total Pasien
            { wch: 40 }, // Rincian
            { wch: 45 }, // Oksigen
            { wch: 30 }  // Masalah
        ];
        ws['!cols'] = cols;

        XLSX.writeFile(wb, `Laporan_SP_${dateStr}.xlsx`);
    },

    generatePDF(records, dateStr, actionType) {
        // Create invisible table element for PDF
        const div = document.createElement('div');
        div.style.padding = '0';
        div.style.fontFamily = 'Arial, Helvetica, sans-serif';
        div.style.color = '#000';
        
        let tableRows = records.map(r => {
            let patDesc = '';
            let oxyDesc = '';
            
            let emps = r.employees.map(e => `<li style="margin-bottom:2px;">${e.name} ${e.role ? `(${e.role})` : ''} ${e.time ? `- ${e.time}` : ''}</li>`).join('');
            if (r.dokter_jaga) {
                emps = `<li style="margin-bottom:2px;"><strong>Dr. ${r.dokter_jaga}</strong></li>` + emps;
            }
            emps = `<ul style="margin:0; padding-left:12px; list-style-type:square;">${emps}</ul>`;

            if (!r.hasPatients) {
                patDesc = '<div style="text-align:center; color:#555;">Hanya Petugas</div>';
                oxyDesc = '-';
            } else {
                if(r.patients && r.patients.length > 0) {
                    let patList = r.patients.map(p => {
                        let c = [p.kamar, p.kelas].filter(x => x && x !== '-').join('/');
                        return `<li style="margin-bottom:2px;">${p.gender === 'L' ? 'L' : 'P'} — ${c || 'Tanpa Area'}</li>`;
                    }).join('');
                    patDesc = `<ul style="margin:0; padding-left:12px; list-style-type:square;">${patList}</ul>`;
                } else {
                    patDesc = 'Tidak ada pasien';
                }

                oxyDesc = `
                <div style="white-space: nowrap; line-height:1.2;">
                    <strong>L:</strong> Tp:${r.oxy_tp_l || 0}, KP:${r.oxy_kp_l || 0}<br>
                    <strong>P:</strong> Tp:${r.oxy_tp_p || 0}, KP:${r.oxy_kp_p || 0}<br>
                    <strong>SB:</strong> ${r.oxy_sb || 0}
                </div>`;
            }

            return `
            <tr style="page-break-inside: avoid; border-bottom: 1px solid #000;">
                <td style="border-right:1px solid #000; border-left:1px solid #000; padding:4px; vertical-align:top; font-weight:bold;">${r.room_name}</td>
                <td style="border-right:1px solid #000; padding:4px; vertical-align:top;">${emps}</td>
                <td style="border-right:1px solid #000; padding:4px; text-align:center; vertical-align:top; font-weight:bold; font-size:10px;">${r.hasPatients ? r.patient_total : '-'}</td>
                <td style="border-right:1px solid #000; padding:4px; vertical-align:top;">${patDesc}</td>
                <td style="border-right:1px solid #000; padding:4px; vertical-align:top;">${oxyDesc}</td>
                <td style="border-right:1px solid #000; padding:4px; vertical-align:top;">${r.issue ? r.issue.replace(/\n/g, '<br>') : '-'}</td>
            </tr>
            `;
        }).join('');

        div.innerHTML = `
            <div style="text-align:center; margin-bottom:10px; border-bottom:2px solid #000; padding-bottom:5px;">
                <h3 style="margin:0 0 3px 0; font-size:12pt; font-weight:bold;">RSUD MAREN H. NOHO RENUAT KOTA TUAL</h3>
                <h1 style="margin:0; font-size:16pt; font-weight:bold; text-transform:uppercase;">LAPORAN SP</h1>
            </div>
            
            <table style="width:100%; border-collapse:collapse; font-size:8pt; line-height:1.2; border: 1px solid #000;">
                <thead>
                    <tr style="background:#e9ecef; border-bottom:1px solid #000;">
                        <th style="border-right:1px solid #000; padding:5px 4px; width:13%; text-align:left;">Ruangan</th>
                        <th style="border-right:1px solid #000; padding:5px 4px; width:22%; text-align:left;">Petugas & Jam</th>
                        <th style="border-right:1px solid #000; padding:5px 4px; width:5%; text-align:center;">Jml</th>
                        <th style="border-right:1px solid #000; padding:5px 4px; width:25%; text-align:left;">Rincian Pasien</th>
                        <th style="border-right:1px solid #000; padding:5px 4px; width:15%; text-align:left;">Oksigen</th>
                        <th style="border-right:1px solid #000; padding:5px 4px; width:20%; text-align:left;">Permasalahan</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;

        const filename = `Laporan_SP_${dateStr}.pdf`;
        
        const opt = {
            margin:       10, // 10mm margin for maximum space
            filename:     filename,
            image:        { type: 'jpeg', quality: 1.0 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const worker = html2pdf().set(opt).from(div).toPdf().get('pdf').then(function (pdf) {
            const totalPages = pdf.internal.getNumberOfPages();
            const today = new Date();
            const printDateStr = today.toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'});
            
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(8);
                pdf.setTextColor(100);
                
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                
                // Footer: Date printed
                pdf.text('Dicetak pada: ' + printDateStr, 10, pageHeight - 5);
                
                // Footer: Page numbers
                const pageStr = 'Halaman ' + i + ' dari ' + totalPages;
                const textWidth = pdf.getStringUnitWidth(pageStr) * 8 / pdf.internal.scaleFactor;
                pdf.text(pageStr, pageWidth - 10 - textWidth, pageHeight - 5);
            }
        });

        if (actionType === 'download') {
            worker.save();
        } else {
            worker.output('bloburl').then(function(url) {
                if(actionType === 'preview') {
                    window.open(url, '_blank');
                } else if(actionType === 'print') {
                    const printWindow = window.open(url, '_blank');
                    if (printWindow) {
                        printWindow.onload = function() {
                            printWindow.print();
                        };
                    }
                }
            });
        }
    }
};

// Start app
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
