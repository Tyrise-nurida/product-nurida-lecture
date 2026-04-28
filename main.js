const API_GEO = 'https://nominatim.openstreetmap.org/search?format=json&q=';
const API_WEATHER = 'https://api.open-meteo.com/v1/forecast';

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
    themeToggle: document.getElementById('themeToggle')
};

// Theme Toggle Logic
elements.themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    elements.themeToggle.textContent = isDark ? 'LIGHT MODE' : 'DARK MODE';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    // Reset Disqus to apply theme change
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

// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    elements.themeToggle.textContent = 'LIGHT MODE';
}

// Weather codes mapping to icons and descriptions
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
        // 1. Geocoding
        const geoRes = await fetch(API_GEO + encodeURIComponent(city));
        const geoData = await geoRes.json();
        
        if (geoData.length === 0) throw new Error('City not found');
        
        const { lat, lon, display_name } = geoData[0];
        const shortName = display_name.split(',')[0];

        // 2. Weather Data
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
    
    // Get latest humidity and rain prob from hourly data
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
    
    // 파종/심기 조언
    if (temp >= 15 && temp <= 25 && rainProb < 30) {
        elements.sowingAdvice.textContent = '기온이 적당하고 비 소식이 없어 파종과 모종 심기에 아주 좋은 날씨입니다.';
    } else if (temp < 10) {
        elements.sowingAdvice.textContent = '기온이 낮아 냉해 피해가 우려되니 보온에 유의하고 파종을 미루는 것을 권장합니다.';
    } else {
        elements.sowingAdvice.textContent = '현재 기온이나 습도를 고려하여 작물별 적정 환경을 확인 후 작업하세요.';
    }

    // 병해충 조언
    if (humidity > 80 || (temp > 20 && rainProb > 50)) {
        elements.pestAdvice.textContent = '고온 다습하여 곰팡이병이나 탄저병 발생 위험이 높습니다. 방제 작업에 신경 쓰세요.';
    } else {
        elements.pestAdvice.textContent = '현재 병해충 발생 위험은 보통 수준입니다. 주기적인 예찰을 권장합니다.';
    }

    // 농작업 추천
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

// Initial load for Seoul
getWeatherData('Seoul');
