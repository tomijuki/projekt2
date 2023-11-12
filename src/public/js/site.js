//site.js
document.getElementById('btnSQLInjection').addEventListener("click", readData);
document.getElementById('btnLogout').addEventListener("click", logout);
document.getElementById('btnLogin').addEventListener("click", login);

function showLoginForm() {
    axios.get('/authenticated').then((res) => {
      const authenticated = res.data.authenticated;
  
      if (authenticated) {
        document.getElementById('registerlink').style.display = 'none';
        document.getElementsByClassName('login-form')[0].style.display = 'none';
        document.getElementById('btnLogout').style.display = 'block';
        document.getElementsByClassName('input-form')[0].style.display = 'block';
      } else {
        document.getElementById('registerlink').style.display = 'block';
        document.getElementsByClassName('login-form')[0].style.display = 'block';
        document.getElementById('btnLogout').style.display = 'none';
        document.getElementsByClassName('input-form')[0].style.display = 'none';
      }
    });
  }
  
  // Call showLoginForm to initially set the form visibility based on the session
  showLoginForm();


  function logout() {
    document.getElementById('content').innerHTML = '';
    return axios.post('logout')
      .then(res => {
        showLoginForm(true);
        location.reload(); // Reload the page after logout
      });
  }

function login() {
    document.getElementById('content').innerHTML = '';
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const chkBrokenAuthentication = document.getElementById('chkBrokenAuthentication').checked;
    return axios.post('login', {username, password, chkBrokenAuthentication}) 
                    .then(res => {                        
                       showLoginForm(false)
                    })
                    .catch(function (error) {            
                        document.getElementById('content').innerHTML = error;           
                    });  
}


function escapeSpecialCharacters(input) {
    // Define the characters you want to escape
    const charactersToEscape = ['"', '\'', '\\'];
  
    // Escape special characters in the regular expression
    const escapedCharacters = charactersToEscape.map(char => char.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1"));
  
    // Create a regular expression pattern to match any of the characters
    const pattern = new RegExp(`[${escapedCharacters.join('')}]`, 'g');
  
    // Replace matched characters with their escaped counterparts
    return input.replace(pattern, match => `\\${match}`);
  }

function readData() {
    document.getElementById('content').innerHTML = '';
    const description = document.getElementById('description').value;
    const isSqlInjectionEnabled = document.getElementById('chkSQLInjection').checked;
    const pinSQLInjection = document.getElementById('pinSQLInjection').value;
    const escapedDescription = isSqlInjectionEnabled ? escapeSpecialCharacters(description) : description;
    const requestData = {
        escapedDescription,
        isSqlInjectionEnabled,
        pinSQLInjection
    };
    console.log(requestData);
    fetch('/records', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({requestData})
    }).then(res => res.json())
    .then(data => {
        document.getElementById('content').innerHTML = JSON.stringify(data); 
        console.log(data);       
    })
    .catch(function (error) {            
        document.getElementById('content').innerHTML = error;           
    });
}


