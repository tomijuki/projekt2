// register.js
document.getElementById('btnRegister').addEventListener("click", register);

function register() {
  const chkBrokenAuthentication = document.getElementById('chkBrokenAuthentication').checked;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const description = document.getElementById('description').value;
  const birthdate = document.getElementById('birthdate').value;
  const pin = document.getElementById('pin').value;

  // Validate the description length
  if (!chkBrokenAuthentication && description.length < 16) {
    displayError('Description must be at least 16 characters long');
    return;
  }

  // Prepare the data for the fetch request
  const requestData = {
    chkBrokenAuthentication: chkBrokenAuthentication,
    username: username,
    password: password,
    repeatPassword: password,
    description: description,
    birthdate: birthdate,
    pin: pin,
  };

  console.log(requestData);

  // Make the fetch request to register a new user
  fetch('/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requestData }),
  })
    .then(response => {
      if (response.ok) {
        // Registration successful
        alert('Registration successful');
        window.location.href = '/';
        // You might want to redirect to the login page or perform other actions
      } else {
        // Registration failed
        return response.text().then(errorMessage => {
          displayError(errorMessage);
        });
      }
    })
    .catch(error => {
      console.error('Error during registration:', error);
      alert('Registration failed: Please try again later');
    });
}

function displayError(errorMessage) {
  document.getElementById('content').innerHTML = errorMessage;
}