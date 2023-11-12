import * as auth from './auth_middleware';
import express from 'express';
import path from 'path';
import { Pool } from 'pg';
import http from 'http';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(express.json());
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

const pool = new Pool({
    user: process.env.DB_USER,
    host: 'frankfurt-postgres.render.com',
    database: 'tjukic_tournament',
    password: process.env.DB_PASSWORD,
    port: 5432,
    ssl: {
      rejectUnauthorized: false // Add this line if your SSL certificate is self-signed or not fully trusted
    }
  });

auth.initSessionAuth(app, 'login');

app.get('/',  function (req, res) {
    res.render('index', {user : req.session.user});
});

app.get('/login', function (req, res) {
    res.render('login');
});

function isSafeInput(input: string): boolean {
    // Implement your validation logic here
    // For example, you can check if the input contains only alphanumeric characters
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    return alphanumericRegex.test(input);
  }

  app.post("/records", async (request, response) => {
    try {
      const data = request.body.requestData;
      console.log(data);
      if (data.isSqlInjectionEnabled === true) {
        let queryString = data.escapedDescription.replace(/\\/g, '');
        const query = `SELECT * FROM users WHERE description = '${queryString}'`;
        console.log(query);
        pool.query(query, (error, result) => {
          if (error) {
            console.error(error);
            response.status(500).send("Internal Server Error");
            return;
          }
          console.log(result.rows);
          response.json(result.rows);
        });
      } else {
        try {
          const pinquery = `SELECT pin FROM users WHERE username = $1`;
          const username = request.session.user ? request.session.user.username : null;
          console.log(username);
          const result1 = await pool.query(pinquery, [username]);
          console.log(result1.rows[0].pin);
          if (data.pinSQLInjection.toString() === result1.rows[0].pin.toString()) {
            if (isSafeInput(data.escapedDescription)) {
              const query = `SELECT * FROM users WHERE description = $1`;
              const result = await pool.query(query, [data.escapedDescription]);
  
              if (username === result.rows[0].username.toString()) {
                response.json(result.rows);
              } else {
                response.status(400).send("Bad request");
              }
            } else {
              response.status(400).send("Bad request");
            }
          } else {
            response.status(400).send("Bad request");
          }
        } catch (error) {
          response.status(400).send("Bad request");
        }
      }
    } catch (e) {
      response.status(400).send("Bad request");
    }
  });

  app.get('/register', function (req, res) {
    if (req.session.user) {
      res.redirect('/');
      return;
    }
    res.render('register');
  });
  
  
  app.post('/register', async function (req, res) {
    const data = req.body.requestData;
    const chkBrokenAuthentication = data.chkBrokenAuthentication;
    const username = data.username;
    const password = data.password;
    const repeatPassword = data.repeatPassword;
    const description = data.description;
    const birthdate = data.birthdate;
    const pin = data.pin;
  
    if(chkBrokenAuthentication){
      try {
        // Check if the username already exists in the database
        const checkUserQuery = 'SELECT * FROM users WHERE username = $1';
        const userResult = await pool.query(checkUserQuery, [username]);
    
        if (userResult.rows.length > 0) {
          res.status(400).send('Username already exists');
          return;
        }
        
    
        // Insert the new user into the database
        const insertUserQuery = 'INSERT INTO users(username, password, description, birthdate, pin,isadmin) VALUES ($1, $2, $3, $4, $5, false)';
        await pool.query(insertUserQuery, [username, password, description, birthdate, pin]);
        
        req.session.user = { username };
        res.sendStatus(204);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    } else {
      try {
        // Check if the username already exists in the database
        const checkUserQuery = 'SELECT * FROM users WHERE username = $1';
        const userResult = await pool.query(checkUserQuery, [username]);

        if (password !== repeatPassword) {
          res.status(400).send('Passwords do not match');
          return;
        }
    
        if (userResult.rows.length > 0) {
          res.status(400).send('Username already exists');
          return;
        }
    
        // Validate username (single word with only alphanumeric characters and underscore)
        const usernameRegex = /^[a-zA-Z0-9_]+$/;
        if (!usernameRegex.test(username)) {
          res.status(400).send('Invalid username format');
          return;
        }
    
        // Validate password (over 12 characters, at least 1 capital letter, 1 number, and 1 special character)
        const passwordRegex = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}$/;
        if (!passwordRegex.test(password) && !data.brokenAuthentication) {
          res.status(400).send('Invalid password format');
          return;
        }
    
        // Validate pin (6-digit number)
        const pinRegex = /^\d{6}$/;
        if (!pinRegex.test(pin)) {
          res.status(400).send('Invalid PIN format');
          return;
        }
    
        // Insert the new user into the database
        const insertUserQuery = 'INSERT INTO users(username, password, description, birthdate, pin, isadmin) VALUES ($1, $2, $3, $4, $5, false)';
        await pool.query(insertUserQuery, [username, password, description, birthdate, pin]);
    
        req.session.user = { username };
        res.sendStatus(204);
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
    }
  });

const loginLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts from this IP, please try again later.',
});

// Apply the rate limiter middleware to the login route
app.post('/login', (req, res, next) => {
  const chkBrokenAuthentication = req.body.chkBrokenAuthentication;

  if (chkBrokenAuthentication) {     
    next(); // Skip the rate limiter and proceed to the login logic
  } else {
    loginLimiter(req, res, next); // Apply the rate limiter
  }
}, async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  try {
    // Check if the username and password match a record in the database
    const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
    const result = await pool.query(query, [username, password]);

    if (result.rows.length === 0) {
      // Increase the login attempts count for this IP
      return res.status(401).send('Invalid username or password');
    }

    // Set user information in the session
    req.session.user = { username };
    res.sendStatus(204);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
  
  app.post('/logout', function (req, res) {
    // Clear user information from the session
    req.session.destroy(() => {
      res.sendStatus(204);
    });
  });


app.get('/authenticated', function (req, res) {
    res.json({ authenticated: !!req.session.user });
  });
  

http.createServer(app).listen(process.env.PORT || 3000, () => {
    console.log(`Server started on port ${process.env.PORT || 3000}`);
  });