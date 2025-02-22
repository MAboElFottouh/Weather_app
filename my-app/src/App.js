import { useState, useEffect } from 'react';
import Select from 'react-select';
import './App.css';

function App() {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [city, setCity] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const WEATHER_API_KEY = 'bb062c11a3d646c3301394be069d9475';

  useEffect(() => {
    fetch('https://restcountries.com/v3.1/all')
      .then(response => response.json())
      .then(data => {
        const options = data
          .sort((a, b) => a.name.common.localeCompare(b.name.common))
          .map(country => ({
            value: country.cca2,
            label: country.name.common,
            flag: country.flags.svg
          }));
        setCountries(options);
      })
      .catch(error => console.error('Error fetching countries:', error));
  }, []);

  const handleCountryChange = (selectedOption) => {
    setSelectedCountry(selectedOption);
    setCity('');
    setSuggestions([]);
    setWeather(null);
    setShowErrorModal(false);
  };

  const handleCityChange = (e) => {
    const value = e.target.value;
    setCity(value);
    setSuggestions([]);
    setWeather(null);
    setShowErrorModal(false);
  };

  const verifyCity = async () => {
    if (!city || !selectedCountry) return;

    setLoading(true);
    setSuggestions([]);
    setWeather(null);
    setShowErrorModal(false);

    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city},${selectedCountry.value}&appid=${WEATHER_API_KEY}&units=metric`
      );

      if (weatherResponse.ok) {
        const weatherData = await weatherResponse.json();
        setWeather(weatherData);
        return;
      }

      // If exact city not found, search for suggestions
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${WEATHER_API_KEY}`
      );

      if (!response.ok) throw new Error('Search error');

      const data = await response.json();
      
      if (data.length === 0) {
        setErrorMessage('City not found. Please check the spelling.');
        setShowErrorModal(true);
        return;
      }

      // Filter suggestions for selected country
      const countrySuggestions = data.filter(
        city => city.country === selectedCountry.value
      );

      if (countrySuggestions.length === 0) {
        setErrorMessage(`"${city}" was not found in ${selectedCountry.label}. Please check the city name.`);
        setShowErrorModal(true);
        return;
      }

      setSuggestions(countrySuggestions);
    } catch (err) {
      setErrorMessage('Error verifying city');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion) => {
    setCity(suggestion.name);
    setSuggestions([]);
    
    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${suggestion.lat}&lon=${suggestion.lon}&appid=${WEATHER_API_KEY}&units=metric`
      );

      if (!response.ok) throw new Error('Weather data not available');

      const weatherData = await response.json();
      setWeather(weatherData);
    } catch (err) {
      setErrorMessage('Error fetching weather data');
      setShowErrorModal(true);
    }
  };

  const handleReset = () => {
    setCity('');
    setSelectedCountry(null);
    setSuggestions([]);
    setWeather(null);
    setShowErrorModal(false);
  };

  const customOption = ({ label, flag }) => (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <img 
        src={flag} 
        alt={`${label} flag`}
        style={{ width: '20px', marginRight: '10px' }}
      />
      <span>{label}</span>
    </div>
  );

  const ErrorModal = ({ message, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Error</h3>
        <p>{message}</p>
        <button className="modal-close-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );

  return (
    <div className="App">
      <div className="container">
        <h1>Select Country and City</h1>
        <Select
          value={selectedCountry}
          onChange={handleCountryChange}
          options={countries}
          className="country-select-container"
          classNamePrefix="country-select"
          placeholder="Search for a country..."
          noOptionsMessage={() => "No results found"}
          formatOptionLabel={customOption}
          isSearchable={true}
        />
        
        {selectedCountry && (
          <div className="city-input-container">
            <div className="city-search-container">
              <input
                type="text"
                value={city}
                onChange={handleCityChange}
                placeholder="Enter city name"
                className="city-input"
              />
              <div className="buttons-container">
                <button 
                  onClick={verifyCity}
                  disabled={!city || loading}
                  className="get-weather-button"
                >
                  {loading ? 'Loading...' : 'Get Weather'}
                </button>
                <button 
                  onClick={handleReset}
                  className="reset-button"
                  title="Clear all"
                >
                  ×
                </button>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="suggestions-container">
                <p>Did you mean:</p>
                <ul className="suggestions-list">
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="suggestion-item"
                    >
                      {suggestion.name}, {suggestion.state || suggestion.country}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {weather && (
              <div className="weather-container">
                <h2>{weather.name}</h2>
                <div className="weather-info">
                  <img 
                    src={`http://openweathermap.org/img/w/${weather.weather[0].icon}.png`}
                    alt={weather.weather[0].description}
                  />
                  <p className="temperature">{Math.round(weather.main.temp)}°C</p>
                  <p className="description">{weather.weather[0].description}</p>
                  <div className="details">
                    <p>Humidity: {weather.main.humidity}%</p>
                    <p>Wind: {weather.wind.speed} m/s</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showErrorModal && (
          <ErrorModal 
            message={errorMessage} 
            onClose={() => setShowErrorModal(false)} 
          />
        )}
      </div>
    </div>
  );
}

export default App;
