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
    startAiBtn: document.getElementById('startAiBtn'),
    webcamContainer: document.getElementById('webcam-container'),
    labelContainer: document.getElementById('label-container'),
    diagnosisResult: document.getElementById('diagnosis-result'),
    resultLabel: document.getElementById('result-label'),
    resultDesc: document.getElementById('result-desc')
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

// --- AI Diagnosis Logic ---
let aiModel, webcam, maxPredictions;

async function initAi() {
    elements.startAiBtn.disabled = true;
    elements.startAiBtn.textContent = "모델 로딩 중...";

    const modelURL = AI_MODEL_URL + "model.json";
    const metadataURL = AI_MODEL_URL + "metadata.json";

    aiModel = await tmImage.load(modelURL, metadataURL);
    maxPredictions = aiModel.getTotalClasses();

    const flip = true;
    webcam = new tmImage.Webcam(300, 300, flip);
    await webcam.setup();
    await webcam.play();
    window.requestAnimationFrame(loopAi);

    elements.webcamContainer.appendChild(webcam.canvas);
    elements.diagnosisResult.classList.remove('hidden');
    elements.startAiBtn.classList.add('hidden');
}

async function loopAi() {
    webcam.update();
    await predictAi();
    window.requestAnimationFrame(loopAi);
}

async function predictAi() {
    const prediction = await aiModel.predict(webcam.canvas);

    // Sort by probability
    prediction.sort((a, b) => b.probability - a.probability);

    const topResult = prediction[0];
    elements.resultLabel.textContent = `진단 결과: ${topResult.className} (${Math.round(topResult.probability * 100)}%)`;

    // Provide specific advice based on result
    if (topResult.probability > 0.7) {
        if (topResult.className.includes("탄저병")) {
            elements.resultDesc.textContent = "탄저병 증상이 의심됩니다. 발생 초기에 등록 약제를 살포하고, 병든 열매는 즉시 제거하여 소각하세요.";
        } else if (topResult.className.includes("겹무늬썩음병")) {
            elements.resultDesc.textContent = "겹무늬썩음병 증상이 보입니다. 통풍과 채광이 잘 되도록 관리하고 비 오기 전후로 방제 작업을 수행하세요.";
        } else {
            elements.resultDesc.textContent = "상태가 양호해 보입니다. 지속적인 관찰을 유지해 주세요.";
        }
    } else {
        elements.resultDesc.textContent = "분석 중입니다. 카메라를 환부 가까이 가져다주세요.";
    }

    // Update progress bars or labels
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
}

elements.startAiBtn.addEventListener('click', initAi);

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
        const weatherRes = await fetch(`${API_WEATHER}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,precipitation_probability&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
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
    generateAdvice(current, data.hourly.relativehumidity_2m[0], data.hourly.precipitation_probability[0]);
    renderForecast(data.daily);
    elements.weatherContent.classList.remove('hidden');
    elements.error.classList.add('hidden');
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

