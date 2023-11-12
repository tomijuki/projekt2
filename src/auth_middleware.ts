//auth_middleware.ts
import { Express, Request, Response, NextFunction } from 'express'
import session from 'express-session'
import dotenv from 'dotenv'

dotenv.config();

declare module 'express-session' {
  interface SessionData {
    user? : {
      username : string
    }
  }
}

var _loginUrl : string;
function initSessionAuth(app : Express, loginUrl : string) {
  _loginUrl = loginUrl;
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'yourSecretKey',
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(setUserInfo);
}

function setUserInfo(req: Request, res: Response, next: NextFunction) {
  const username = req.session?.user?.username;

  if (username) {
    req.session.user = {
      username,
    };
  }
  next();
}

function requiresAuthentication(req : Request, res : Response, next : NextFunction) {  
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect(302, `${_loginUrl}?returnUrl=${req.url}`);
  }           
}
  
export { initSessionAuth, requiresAuthentication };