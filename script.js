'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteBtn = document.getElementsByClassName('delete-btn');

// Classes
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.duration = duration; // in mins
    this.distance = distance; // in km
  }

  _description() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Running on April 14

    return `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()} `;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.pace();
    this.description = this._description();
  }

  pace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration);
    this.elevation = elevation;
    this.speed();
    this.description = this._description();
  }

  speed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const running = new Running([14, 12], 12, 2, 12);
// const cycling = new Cycling([14, 12], 12, 2, 12);
// console.log(running, cycling);

// Application Archtecture
class App {
  #map;
  #mapZoomLevel = 15;
  #mapEvent;
  #workout = [];

  constructor() {
    // Loading positions
    this._getPosition();

    // Getting data from local storage
    this._getDataFromLocalStorage();

    // Event Listeners
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleForm);

    containerWorkouts.addEventListener('click', this._goToPopup.bind(this));

    deleteBtn[0].addEventListener(
      'click',
      this._deleteSingleWorkout.bind(this)
    );
  }

  _getPosition() {
    if (navigator.geolocation) {
      // Using navigator API
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get the location. Please try again later');
        }
      );
    }
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    // assignning using desturcture
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    // creat a map
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling click on the map
    this.#map.on('click', this._showForm.bind(this));

    // Loading saved workouts to the map
    this.#workout.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // clearing inputs
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleForm() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Small helper function to check for if iputs are numbers or not
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // If workout is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Numbers need to be positive numbers');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If Workout is cycling, Create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Numbers need to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // Add new object to Workout array
    this.#workout.push(workout);
    // Render Workout on  map as marker
    this._renderWorkoutMarker(workout);
    // Render workout on list
    this._renderWorkout(workout);
    // Hide form + clear input fields
    this._hideForm();
    // Save workout to local storage
    this._saveDataToLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}, ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
     <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <button class="delete-btn">Delete</button>

          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            } </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  // _selectWorkout() {
  //   const workoutEl = e.target.closest('.workout');

  //   if (!workoutEl) return;

  //   const selectedWorkout = this.#workout.find(
  //     work => work.id === workoutEl.dataset.id
  //   );

  // }

  _deleteSingleWorkout(e) {
    console.log(e.target);

    const parent = e.target.closest('.workout');

    if (!parent) return;

    const selectedWorkout = this.#workout.find(
      work => work.id === parent.dataset.id
    );

    // delete workout from array
    this.#workout.splice(selectedWorkout, 1);
    console.log(this.#workout);
    // push array to local storage
    this._saveDataToLocalStorage();

    location.reload();
  }
  _goToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const selectedWorkout = this.#workout.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(selectedWorkout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }
  _saveDataToLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workout));
  }
  _getDataFromLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workout = data;

    this.#workout.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
