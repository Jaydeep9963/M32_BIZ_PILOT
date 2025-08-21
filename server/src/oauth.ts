import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { UserModel } from './models';
import { signJwt } from './auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:4000';

console.log('[OAuth] Config check:', {
	GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID ? 'set' : 'missing',
	GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET ? 'set' : 'missing',
	CLIENT_URL,
	SERVER_URL,
});

passport.serializeUser((user: any, done) => {
  done(null, { id: user.id, email: user.email, name: user.name });
});

passport.deserializeUser((obj: any, done) => {
  done(null, obj);
});

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  const callbackURL = `${SERVER_URL}/api/auth/google/callback`;
  console.log('[OAuth] Initializing Google strategy with callbackURL:', callbackURL);
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL,
  }, async (_accessToken: string, _refreshToken: string, profile: Profile, done) => {
    try {
      console.log('[OAuth] Google verify callback profile:', {
        id: profile.id,
        displayName: profile.displayName,
        primaryEmail: profile.emails?.[0]?.value,
      });
      let email = profile.emails?.[0]?.value || (profile as any)?._json?.email;
      const name = profile.displayName || 'User';
      if (!email) {
        // Fallback to a synthetic email if Google does not share one
        email = `${profile.id}@googleuser.local`;
      }

      let user = await UserModel.findOne({ email });
      if (!user) {
        console.log('[OAuth] Creating new user for email:', email);
        user = await UserModel.create({ name, email, passwordHash: `google:${profile.id}` });
      } else {
        console.log('[OAuth] Found existing user:', { id: String(user._id), email: user.email });
      }
      const token = signJwt({ id: String(user._id), email: user.email });
      console.log('[OAuth] Issued JWT for user:', { id: String(user._id), email: user.email });
      return done(null, { id: String(user._id), name: user.name, email: user.email, token });
    } catch (e) {
      console.error('[OAuth] Verify callback error:', e);
      return done(e as any);
    }
  }));
} else {
  console.warn('[OAuth] Google credentials not set. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google OAuth.');
}

export {}; // module side-effects only


