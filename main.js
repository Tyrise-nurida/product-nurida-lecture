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
    weatherIcon: document.getElementById('weatherIcon'),
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
    // New detailed weather elements
    rainNews: document.getElementById('rainNews'),
    windStrength: document.getElementById('windStrength'),
    uvIndex: document.getElementById('uvIndex')
};

// --- Theme Toggle Logic ---
elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    elements.themeToggle.textContent = isDark ? 'LIGHT MODE' : 'DARK MODE';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    if (typeof DISQUS !== 'undefined') {
        DISQUS.reset({
            reload: true,
            config: function () {
                this.page.url = window.location.href;
                this.page.identifier = window.location.pathname;
            }
        });
    }
});

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    elements.themeToggle.textContent = 'LIGHT MODE';
}

// --- AI Diagnosis Logic (File Upload Version) ---
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

    // Show preview
    const reader = new FileReader();
    reader.onload = async (event) => {
        elements.imagePreview.src = event.target.result;
        elements.imagePreview.classList.remove('hidden');
        elements.uploadPlaceholder.classList.add('hidden');
        
        // Start Diagnosis
        await runDiagnosis();
    };
    reader.readAsDataURL(file);
});

async function runDiagnosis() {
    elements.uploadBtn.disabled = true;
    elements.uploadBtn.textContent = "분석 중...";
    
    try {
        await loadModel();
        const prediction = await aiModel.predict(elements.imagePreview);
        
        // Sort by probability
        prediction.sort((a, b) => b.probability - a.probability);
        
        const topResult = prediction[0];
        elements.resultLabel.textContent = `진단 결과: ${topResult.className} (${Math.round(topResult.probability * 100)}%)`;
        elements.diagnosisResult.classList.remove('hidden');

        // Advice
        if (topResult.probability > 0.5) {
            if (topResult.className.includes("탄저병")) {
                elements.resultDesc.textContent = "탄저병 증상이 의심됩니다. 발생 초기에 등록 약제를 살포하고, 병든 열매는 즉시 제거하여 소각하세요.";
            } else if (topResult.className.includes("겹무늬썩음병")) {
                elements.resultDesc.textContent = "겹무늬썩음병 증상이 보입니다. 통풍과 채광이 잘 되도록 관리하고 비 오기 전후로 방제 작업을 수행하세요.";
            } else {
                elements.resultDesc.textContent = "정상 상태이거나 판단이 어렵습니다. 다른 사진으로 시도해 보세요.";
            }
        } else {
            elements.resultDesc.textContent = "확률이 낮아 정확한 진단이 어렵습니다. 환부를 더 가깝고 선명하게 찍어주세요.";
        }

        // Progress bars
        elements.labelContainer.innerHTML = '';
        prediction.forEach(p => {
            const bar = document.createElement('div');
            bar.className = 'prediction-bar';
            bar.innerHTML = `
                <span>${p.className}</span>
                <div class="progress"><div class="fill" style="width: ${p.probability * 100}%"></div></div>
            `;
            elements.labelContainer.appendChild(bar);
        });
    } catch (err) {
        console.error(err);
        alert("진단 중 오류가 발생했습니다.");
    } finally {
        elements.uploadBtn.disabled = false;
        elements.uploadBtn.textContent = "사진 선택 및 진단";
    }
}

// --- Weather Logic ---
const weatherMap = {
    0: { desc: '맑음', icon: 'fa-sun' },
    1: { desc: '대체로 맑음', icon: 'fa-cloud-sun' },
    2: { desc: '구름 조금', icon: 'fa-cloud' },
    3: { desc: '흐림', icon: 'fa-cloud' },
    45: { desc: '안개', icon: 'fa-smog' },
    48: { desc: '안개', icon: 'fa-smog' },
    51: { desc: '이슬비', icon: 'fa-cloud-rain' },
    61: { desc: '약한 비', icon: 'fa-cloud-showers-heavy' },
    63: { desc: '보통 비', icon: 'fa-cloud-showers-heavy' },
    65: { desc: '강한 비', icon: 'fa-cloud-showers-heavy' },
    71: { desc: '약한 눈', icon: 'fa-snowflake' },
    95: { desc: '뇌우', icon: 'fa-bolt' }
};

async function getWeatherData(city) {
    try {
        showLoading(true);
        const geoRes = await fetch(API_GEO + encodeURIComponent(city));
        const geoData = await geoRes.json();
        if (geoData.length === 0) throw new Error('City not found');
        const { lat, lon, display_name } = geoData[0];
        const shortName = display_name.split(',')[0];
        // Added uv_index_max to daily
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
    const weatherInfo = weatherMap[current.weathercode] || { desc: '정보 없음', icon: 'fa-question' };
    elements.cityName.textContent = city;
    elements.currentTemp.textContent = Math.round(current.temperature);
    elements.weatherDesc.textContent = weatherInfo.desc;
    elements.weatherIcon.className = `fas ${weatherInfo.icon}`;
    elements.humidity.textContent = `${data.hourly.relativehumidity_2m[0]}%`;
    elements.windSpeed.textContent = `${current.windspeed}km/h`;
    elements.rainProb.textContent = `${data.hourly.precipitation_probability[0]}%`;
    
    // Detailed Weather Info
    updateDetailedInfo(data);
    
    generateAdvice(current, data.hourly.relativehumidity_2m[0], data.hourly.precipitation_probability[0]);
    renderForecast(data.daily);
    elements.weatherContent.classList.remove('hidden');
    elements.error.classList.add('hidden');
}

function updateDetailedInfo(data) {
    // 1. Rain News (based on next 12 hours)
    const rainProbs = data.hourly.precipitation_probability.slice(0, 12);
    const maxRainProb = Math.max(...rainProbs);
    if (maxRainProb >= 70) {
        elements.rainNews.textContent = `비 소식 있음 (최대 ${maxRainProb}%) - 우산 필수`;
    } else if (maxRainProb >= 30) {
        elements.rainNews.textContent = `강수 확률 있음 (${maxRainProb}%) - 흐린 날씨 주의`;
    } else {
        elements.rainNews.textContent = '당분간 비 소식 없음 - 맑은 날씨 지속';
    }

    // 2. Wind Strength (km/h)
    const windSpeed = data.current_weather.windspeed;
    let strength = '';
    if (windSpeed < 5) strength = '잔잔함 (미풍)';
    else if (windSpeed < 15) strength = '약함 (남실바람)';
    else if (windSpeed < 30) strength = '보통 (산들바람)';
    else if (windSpeed < 50) strength = '강함 (된바람) - 시설물 주의';
    else strength = '매우 강함 (폭풍) - 외출 자제';
    elements.windStrength.textContent = `${strength} (${windSpeed}km/h)`;

    // 3. UV Index
    const maxUV = data.daily.uv_index_max[0];
    let uvLevel = '';
    if (maxUV < 3) uvLevel = '낮음 (안전)';
    else if (maxUV < 6) uvLevel = '보통 (자외선 차단 권장)';
    else if (maxUV < 8) uvLevel = '높음 (모자, 선글라스 필수)';
    else uvLevel = '매우 높음 (장시간 노출 위험)';
    elements.uvIndex.textContent = `자외선 지수: ${uvLevel} (${maxUV})`;
}

function generateAdvice(current, humidity, rainProb) {
    const temp = current.temperature;
    if (temp >= 15 && temp <= 25 && rainProb < 30) {
        elements.sowingAdvice.textContent = '기온이 적당하고 비 소식이 없어 파종과 모종 심기에 아주 좋은 날씨입니다.';
    } else if (temp < 10) {
        elements.sowingAdvice.textContent = '기온이 낮아 냉해 피해가 우려되니 보온에 유의하고 파종을 미루는 것을 권장합니다.';
    } else {
        elements.sowingAdvice.textContent = '현재 기온이나 습도를 고려하여 작물별 적정 환경을 확인 후 작업하세요.';
    }
    if (humidity > 80 || (temp > 20 && rainProb > 50)) {
        elements.pestAdvice.textContent = '고온 다습하여 곰팡이병이나 탄저병 발생 위험이 높습니다. 방제 작업에 신경 쓰세요.';
    } else {
        elements.pestAdvice.textContent = '현재 병해충 발생 위험은 보통 수준입니다. 주기적인 예찰을 권장합니다.';
    }
    if (rainProb > 60) {
        elements.workAdvice.textContent = '비가 예상되니 배수로 정비와 시설물 점검을 우선적으로 수행하세요.';
    } else if (current.windspeed > 20) {
        elements.workAdvice.textContent = '강풍이 불고 있으니 비닐하우스 등 시설 고정 상태를 점검하세요.';
    } else {
        elements.workAdvice.textContent = '야외 농작업을 하기 좋은 날씨입니다. 웃거름 주기나 잡초 제거를 추천합니다.';
    }
}

function renderForecast(daily) {
    elements.forecastContainer.innerHTML = '';
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 0; i < 7; i++) {
        const date = new Date(daily.time[i]);
        const dayName = days[date.getDay()];
        const info = weatherMap[daily.weathercode[i]] || { icon: 'fa-question' };
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

getWeatherData('Seoul');
