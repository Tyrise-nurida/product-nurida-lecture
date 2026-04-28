const API_GEO = 'https://nominatim.openstreetmap.org/search?format=json&q=';
const API_WEATHER = 'https://api.open-meteo.com/v1/forecast';
const AI_MODEL_URL = "https://teachablemachine.withgoogle.com/models/rjVz9mhb1/";

const elements = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    weatherContent: document.getElementById('weatherContent'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    cityName: document.getElementById('cityName'),
    currentTemp: document.getElementById('currentTemp'),
    weatherDesc: document.getElementById('weatherDesc'),
    humidity: document.getElementById('humidity'),
    windSpeed: document.getElementById('windSpeed'),
    rainProb: document.getElementById('rainProb'),
    mainWeatherIcon: document.getElementById('mainWeatherIcon'),
    sowingAdvice: document.querySelector('#sowingAdvice p'),
    pestAdvice: document.querySelector('#pestAdvice p'),
    workAdvice: document.querySelector('#workAdvice p'),
    forecastContainer: document.getElementById('forecastContainer'),
    themeToggle: document.getElementById('themeToggle'),
    imageInput: document.getElementById('imageInput'),
    uploadBtn: document.getElementById('uploadBtn'),
    imagePreview: document.getElementById('image-preview'),
    uploadPlaceholder: document.getElementById('upload-placeholder'),
    labelContainer: document.getElementById('label-container'),
    diagnosisResult: document.getElementById('diagnosis-result'),
    resultLabel: document.getElementById('result-label'),
    resultDesc: document.getElementById('result-desc'),
    rainNews: document.getElementById('rainNews'),
    windStrength: document.getElementById('windStrength'),
    uvIndex: document.getElementById('uvIndex'),
    updateTime: document.getElementById('updateTime'),
    pestTabs: document.querySelectorAll('.pest-tab'),
// ... existing code ...
    pestItems: document.querySelectorAll('.pest-item'),
    domainSelector: document.getElementById('domain_selector'),
    emailDomainInput: document.getElementById('email_domain'),
    fullEmailInput: document.getElementById('full_email'),
    contactForm: document.querySelector('.contact-form'),
    emailUserInput: document.querySelector('input[name="email_user"]')
};

// --- Email Domain Selector Logic ---
if (elements.domainSelector) {
    elements.domainSelector.addEventListener('change', (e) => {
        elements.emailDomainInput.value = e.target.value;
        if (e.target.value === "") {
            elements.emailDomainInput.focus();
        }
    });
}

if (elements.contactForm) {
    elements.contactForm.addEventListener('submit', (e) => {
        const user = elements.emailUserInput.value;
        const domain = elements.emailDomainInput.value;
        if (user && domain) {
            elements.fullEmailInput.value = `${user}@${domain}`;
        }
    });
}

// --- Theme Toggle Logic ---
// ... rest of the code ...
elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    elements.themeToggle.textContent = isLight ? '다크 모드' : '라이트 모드';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    elements.themeToggle.textContent = '다크 모드';
} else {
    elements.themeToggle.textContent = '라이트 모드';
}

// --- Pest Catalog Tab Logic ---
elements.pestTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const category = tab.getAttribute('data-category');
        
        // Update active tab
        elements.pestTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Filter items
        elements.pestItems.forEach(item => {
            if (item.classList.contains(category)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
});

// Initial filter for disease (default active tab)
const initialCategory = 'disease';
elements.pestItems.forEach(item => {
    if (item.classList.contains(initialCategory)) {
        item.style.display = 'flex';
    } else {
        item.style.display = 'none';
    }
});

// --- AI Diagnosis Logic ---
let aiModel, maxPredictions;

async function loadModel() {
    if (!aiModel) {
        const modelURL = AI_MODEL_URL + "model.json";
        const metadataURL = AI_MODEL_URL + "metadata.json";
        aiModel = await tmImage.load(modelURL, metadataURL);
        maxPredictions = aiModel.getTotalClasses();
    }
}

elements.uploadBtn.addEventListener('click', () => {
    elements.imageInput.click();
});

elements.imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        elements.imagePreview.src = event.target.result;
        elements.imagePreview.classList.remove('hidden');
        elements.uploadPlaceholder.classList.add('hidden');
        await runDiagnosis();
    };
    reader.readAsDataURL(file);
});

async function runDiagnosis() {
    elements.uploadBtn.disabled = true;
    elements.uploadBtn.textContent = "정밀 스캔 중...";
    
    try {
        await loadModel();
        const prediction = await aiModel.predict(elements.imagePreview);
        prediction.sort((a, b) => b.probability - a.probability);
        
        const topResult = prediction[0];
        elements.resultLabel.textContent = `결과: ${topResult.className} (${Math.round(topResult.probability * 100)}%)`;
        elements.diagnosisResult.classList.remove('hidden');

        if (topResult.probability > 0.5) {
            if (topResult.className.includes("탄저병")) {
                elements.resultDesc.textContent = "탄저병 증상이 감지되었습니다. 고온다습한 환경에서 확산이 빠르니 즉시 병든 과실을 제거하고 등록 약제를 정밀 살포하십시오.";
            } else if (topResult.className.includes("겹무늬썩음병")) {
                elements.resultDesc.textContent = "겹무늬썩음병 증상이 확인됩니다. 과실의 품질 저하를 막기 위해 통풍을 확보하고 비 오기 전후 집중 방제를 실시하십시오.";
            } else {
                elements.resultDesc.textContent = "정상 상태이거나 육안 확인이 필요한 상태입니다. 고품질 유지를 위해 주기적인 예찰을 지속하십시오.";
            }
        } else {
            elements.resultDesc.textContent = "분석 데이터가 부족합니다. 환부를 더 가깝고 선명하게 재촬영하여 스캔하십시오.";
        }

        elements.labelContainer.innerHTML = '';
        prediction.slice(0, 3).forEach(p => {
            const bar = document.createElement('div');
            bar.className = 'prediction-bar';
            bar.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
                    <span>${p.className}</span>
                    <span>${Math.round(p.probability * 100)}%</span>
                </div>
                <div class="progress"><div class="fill" style="width: ${p.probability * 100}%"></div></div>
            `;
            elements.labelContainer.appendChild(bar);
        });
    } catch (err) {
        console.error(err);
        alert("시스템 분석 중 오류가 발생했습니다.");
    } finally {
        elements.uploadBtn.disabled = false;
        elements.uploadBtn.textContent = "스캔 시작";
    }
}

// --- Weather Logic ---
const weatherMap = {
    0: { desc: '쾌청(맑음)', icon: 'fa-sun' },
    1: { desc: '대체로 맑음', icon: 'fa-cloud-sun' },
    2: { desc: '부분적 구름', icon: 'fa-cloud' },
    3: { desc: '흐림', icon: 'fa-cloud' },
    45: { desc: '안개 주의', icon: 'fa-smog' },
    48: { desc: '안개 주의', icon: 'fa-smog' },
    51: { desc: '약한 이슬비', icon: 'fa-cloud-rain' },
    61: { desc: '약한 강우', icon: 'fa-cloud-showers-heavy' },
    63: { desc: '보통 강우', icon: 'fa-cloud-showers-heavy' },
    65: { desc: '강한 강우', icon: 'fa-cloud-showers-heavy' },
    71: { desc: '약한 강설', icon: 'fa-snowflake' },
    95: { desc: '뇌우 주의', icon: 'fa-bolt' }
};

async function getWeatherData(city) {
    try {
        showLoading(true);
        const geoRes = await fetch(API_GEO + encodeURIComponent(city));
        const geoData = await geoRes.json();
        if (geoData.length === 0) throw new Error('Location not found');
        const { lat, lon, display_name } = geoData[0];
        const shortName = display_name.split(',')[0];
        const weatherRes = await fetch(`${API_WEATHER}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,precipitation_probability&daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto`);
        const data = await weatherRes.json();
        updateUI(data, shortName);
    } catch (err) {
        console.error(err);
        showError(true);
    } finally {
        showLoading(false);
    }
}

function updateUI(data, city) {
    const current = data.current_weather;
    const weatherInfo = weatherMap[current.weathercode] || { desc: '데이터 수신 중', icon: 'fa-satellite' };
    elements.cityName.textContent = city;
    elements.currentTemp.textContent = Math.round(current.temperature);
    elements.weatherDesc.textContent = weatherInfo.desc;
    elements.mainWeatherIcon.className = `fas ${weatherInfo.icon}`;
    elements.humidity.textContent = `${data.hourly.relativehumidity_2m[0]}%`;
    elements.windSpeed.textContent = `${current.windspeed}km/h`;
    elements.rainProb.textContent = `${data.hourly.precipitation_probability[0]}%`;
    
    updateDetailedInfo(data);
    
    const now = new Date();
    elements.updateTime.textContent = `SYNC: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    generateAdvice(current, data.hourly.relativehumidity_2m[0], data.hourly.precipitation_probability[0]);
    renderForecast(data.daily);
    elements.weatherContent.classList.remove('hidden');
    elements.error.classList.add('hidden');
}

function updateDetailedInfo(data) {
    const rainProbs = data.hourly.precipitation_probability.slice(0, 12);
    const maxRainProb = Math.max(...rainProbs);
    if (maxRainProb >= 70) {
        elements.rainNews.textContent = `집중 강우 예상 (최대 ${maxRainProb}%) - 시설물 관리 철저`;
    } else if (maxRainProb >= 30) {
        elements.rainNews.textContent = `산발적 강우 가능성 (${maxRainProb}%) - 습도 조절 필요`;
    } else {
        elements.rainNews.textContent = '안정적 기상 유지 - 야외 작업 최적';
    }

    const windSpeed = data.current_weather.windspeed;
    let strength = '';
    if (windSpeed < 5) strength = '잔잔함 (미풍)';
    else if (windSpeed < 15) strength = '남실바람 (생육 양호)';
    else if (windSpeed < 30) strength = '산들바람 (통풍 양호)';
    else if (windSpeed < 50) strength = '된바람 (시설물 고정 요망)';
    else strength = '폭풍우급 (외출 자제 및 비상 대기)';
    elements.windStrength.textContent = `${strength} (${windSpeed}km/h)`;

    const maxUV = data.daily.uv_index_max[0];
    let uvLevel = '';
    if (maxUV < 3) uvLevel = '낮음 (안전)';
    else if (maxUV < 6) uvLevel = '보통 (광합성 적기)';
    else if (maxUV < 8) uvLevel = '높음 (일소 피해 주의)';
    else uvLevel = '위험 (차광막 운용 권장)';
    elements.uvIndex.textContent = `UV 지수: ${uvLevel} (${maxUV})`;
}

function generateAdvice(current, humidity, rainProb) {
    const temp = current.temperature;
    if (temp >= 15 && temp <= 25 && rainProb < 30) {
        elements.sowingAdvice.textContent = '생육 최적 온도입니다. 고품질 육성을 위한 영양제 살포와 전정 작업에 이상적입니다.';
    } else if (temp < 10) {
        elements.sowingAdvice.textContent = '저온에 따른 생육 지연이 우려됩니다. 보온재 점검 및 냉해 방지 대책을 수립하십시오.';
    } else {
        elements.sowingAdvice.textContent = '현재 기후는 작물별 특성에 따른 개별적 관리가 필요합니다. 수분 공급에 유의하십시오.';
    }

    if (humidity > 80 || (temp > 20 && rainProb > 50)) {
        elements.pestAdvice.textContent = '고온다습한 환경으로 인한 병해충 확산 위험이 매우 높습니다. 정밀 방제를 준비하십시오.';
    } else {
        elements.pestAdvice.textContent = '현재 병해충 위험도는 안정적입니다. 주기적인 모니터링을 통해 예방하십시오.';
    }

    if (rainProb > 60) {
        elements.workAdvice.textContent = '강우 전 배수로 점검과 약제 내우성 확보 작업을 우선적으로 권장합니다.';
    } else if (current.windspeed > 25) {
        elements.workAdvice.textContent = '강풍에 의한 과실 낙과와 시설물 파손이 우려됩니다. 지주대와 그물을 점검하십시오.';
    } else {
        elements.workAdvice.textContent = '안정적인 기상 조건입니다. 고품질 사과를 위한 적과나 잡초 관리 작업을 추천합니다.';
    }
}

function renderForecast(daily) {
    elements.forecastContainer.innerHTML = '';
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
        const dayName = days[date.getDay()];
        const info = weatherMap[daily.weathercode[i]] || { icon: 'fa-satellite' };
        const item = document.createElement('div');
        item.className = 'forecast-item';
        item.innerHTML = `
            <span class="day">${dayName}</span>
            <i class="fas ${info.icon}"></i>
            <div class="temps">
                <span class="max">${Math.round(daily.temperature_2m_max[i])}°</span>
                <span class="min">${Math.round(daily.temperature_2m_min[i])}°</span>
            </div>
        `;
        elements.forecastContainer.appendChild(item);
    }
}

function showLoading(show) {
    elements.loading.classList.toggle('hidden', !show);
    if (show) {
        elements.weatherContent.classList.add('hidden');
        elements.error.classList.add('hidden');
    }
}

function showError(show) {
    elements.error.classList.toggle('hidden', !show);
}

elements.searchBtn.addEventListener('click', () => {
    const city = elements.cityInput.value.trim();
    if (city) getWeatherData(city);
});

elements.cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = elements.cityInput.value.trim();
        if (city) getWeatherData(city);
    }
});

setInterval(() => {
    const currentCity = elements.cityName.textContent || 'Seoul';
    getWeatherData(currentCity);
}, 30 * 60 * 1000);

getWeatherData('Seoul');
