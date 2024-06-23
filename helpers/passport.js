const passport = require('passport');
const googleUser = require('../models/googleModel')
const googleStrategy = require('passport-google-oauth2').Strategy;
require('dotenv').config();

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

passport.use(new googleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:5000/userVerification/google",
    passReqToCallback: true
}, async (request, accessToken, refreshToken, profile, done) => {

    try {
        let  user = await googleUser.findOne({ googleId: profile.id });
        
        if (!user) {
            // If the user doesn't exist, create a new user record
            user = new googleUser({
                googleId: profile.id,
                email: profile.email,
                name: profile.displayName,
                // You can add other fields as needed
            });

            await user.save();
        }

        return done(null, { user, email: profile.email });
    } catch (error) {
        return done(error);
    }
}));

module.exports = passport;

