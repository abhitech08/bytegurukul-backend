const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { User } = require('../models');

// 1. Serialize: Save User ID to Session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// 2. Deserialize: Fetch User from DB using ID
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// --- GOOGLE STRATEGY ---
if (process.env.GOOGLE_CLIENT_ID) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      scope: ['profile', 'email'] // ADDED: Explicitly ask for email
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Safe check for email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (!email) {
            return done(new Error("No email found from Google"), null);
        }

        // Find existing user by Email
        let user = await User.findOne({ where: { email: email } });

        if (!user) {
          // Create new user if not exists
          user = await User.create({
            username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
            name: profile.displayName,
            email: email,
            password: 'null', // String 'null' as placeholder
            role: 'student', // Default to student for new social logins
            authProvider: 'google'
          });
        }
        // If user exists, keep their existing role (could be instructor, admin, etc.)
        return done(null, user);
      } catch (err) {
        console.error("Google Auth Error:", err);
        return done(err, null);
      }
    }
  ));
}

// --- GITHUB STRATEGY ---
if (process.env.GITHUB_CLIENT_ID) {
  passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: "/api/auth/github/callback",
      scope: ['user:email'] // Request email permission
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Safe check for email (Handle private emails)
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        
        if (!email) {
            return done(new Error("No public email found on GitHub. Please make your email public."), null);
        }

        // Find existing user by Email
        let user = await User.findOne({ where: { email: email } });

        if (!user) {
          user = await User.create({
            username: profile.username, // GitHub username is usually unique enough
            name: profile.displayName || profile.username,
            email: email,
            password: 'null',
            role: 'student',
            authProvider: 'github'
          });
        }
        return done(null, user);
      } catch (err) {
        console.error("GitHub Auth Error:", err);
        return done(err, null);
      }
    }
  ));
}

module.exports = passport;