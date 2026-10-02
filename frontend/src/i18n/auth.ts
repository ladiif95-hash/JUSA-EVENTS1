import type { Language } from '../context/PreferencesContext';

const en = {
  settings: 'Settings', language: 'Language', english: 'English', somali: 'Soomaali', dark: 'Dark', light: 'Light', appearance: 'Appearance',
  loginTitle: 'Welcome Back', loginSubtitle: 'Sign in to manage your seminars, vote and reserve seats.',
  registerTitle: 'Create Your Account', registerSubtitle: 'To get started with JUTSA Events, create your account.',
  google: 'Continue with Google', or: 'OR',
  fullName: 'Full Name', fullNamePlaceholder: 'Enter full name', email: 'Email', emailPlaceholder: 'you@example.com',
  country: 'Country', phone: 'Phone Number', phonePlaceholder: '61 000 0000',
  password: 'Password', passwordPlaceholder: 'Enter your password', newPasswordPlaceholder: 'At least 8 characters',
  confirmPassword: 'Confirm Password', confirmPlaceholder: 'Repeat your password', show: 'Show password', hide: 'Hide password',
  terms: 'Terms and Conditions', termsNote: 'By continuing, you agree to JUTSA Events', termsLink: 'terms of use',
  signIn: 'Sign In', signingIn: 'Signing in…', signUp: 'Sign Up', signingUp: 'Creating account…',
  forgot: 'Forgot password?', noAccount: "Don't have an account?", createAccount: 'Create account', haveAccount: 'Already have an account?', about: 'About', aboutName: 'JUTSA',
  failed: 'Failed', success: 'Success', warning: 'Attention', okay: 'Okay',
  invalidEmail: 'Enter a valid email address.', passwordRequired: 'Password is required.', passwordShort: 'Password must be at least 8 characters.',
  mismatch: 'Passwords do not match.', invalidCredentials: 'Invalid login credentials.', emailTaken: 'An account already exists with this email. Please sign in instead.',
  suspended: 'This account has been suspended. Please contact JUTSA.', network: 'Unable to reach the server. Check your connection and try again.',
  forgotTitle: 'Reset Your Password', forgotSubtitle: 'Enter your email and we will send you a secure reset link.', sendLink: 'Send reset link', sending: 'Sending…',
  linkSent: 'If an account exists for that email, a reset link has been sent.', backToSignIn: 'Back to sign in',
  resetTitle: 'Choose a New Password', resetSubtitle: 'Your new password must be at least 8 characters.', updatePassword: 'Update password', updating: 'Updating…',
  passwordUpdated: 'Your password has been updated. You can now sign in.', invalidLink: 'This reset link is invalid or has expired.',
  registerHeading: 'Register', registerLead: 'Sign up now and get full access to JUTSA Events.', firstName: 'First name', lastName: 'Last name',
  uploadPhoto: 'Click to upload image', photoHint: 'PNG or JPG · optional', changePhoto: 'Change photo', removePhoto: 'Remove photo', nameRequired: 'Enter your first and last name.',
};

const so: typeof en = {
  settings: 'Dejinta', language: 'Luqadda', english: 'English', somali: 'Soomaali', dark: 'Habeen', light: 'Maalin', appearance: 'Muuqaalka',
  loginTitle: 'Ku Soo Dhawoow', loginSubtitle: 'Gal si aad u maamusho seminar-yadaada, u codeyso oo kursi u qabsato.',
  registerTitle: 'Samee Account-kaaga', registerSubtitle: 'Si aad u bilowdo JUTSA Events, samee account-kaaga.',
  google: 'Ku sii wad Google', or: 'AMA',
  fullName: 'Magaca oo Buuxa', fullNamePlaceholder: 'Geli magacaaga oo buuxa', email: 'Email', emailPlaceholder: 'you@example.com',
  country: 'Dalka', phone: 'Lambarka Telefoonka', phonePlaceholder: '61 000 0000',
  password: 'Password', passwordPlaceholder: 'Geli password-kaaga', newPasswordPlaceholder: 'Ugu yaraan 8 xaraf',
  confirmPassword: 'Xaqiiji Password-ka', confirmPlaceholder: 'Ku celi password-ka', show: 'Muuji password-ka', hide: 'Qari password-ka',
  terms: 'Shuruudaha iyo Xaaladaha', termsNote: 'Markaad sii wado, waxaad aqbashay', termsLink: 'shuruudaha isticmaalka JUTSA Events',
  signIn: 'Gal', signingIn: 'Waa la galayaa…', signUp: 'Is-diiwaangeli', signingUp: 'Account-ka waa la samaynayaa…',
  forgot: 'Password-ka ma ilowday?', noAccount: 'Account ma lihid?', createAccount: 'Samee account', haveAccount: 'Account ma leedahay?', about: 'Ku saabsan', aboutName: 'JUTSA',
  failed: 'Waa Fashilmay', success: 'Guul', warning: 'Digniin', okay: 'Hagaag',
  invalidEmail: 'Geli email sax ah.', passwordRequired: 'Password-ka waa loo baahan yahay.', passwordShort: 'Password-ku waa inuu ahaadaa ugu yaraan 8 xaraf.',
  mismatch: 'Labada password isma laha.', invalidCredentials: 'Email-ka ama password-ka waa khalad.', emailTaken: 'Email-kan account ayaa horay ugu diiwaangashan. Fadlan gal.',
  suspended: 'Account-kan waa la hakiyay. Fadlan la xiriir JUTSA.', network: 'Server-ka lama gaari karo. Hubi internet-ka oo isku day mar kale.',
  forgotTitle: 'Dib u Deji Password-ka', forgotSubtitle: 'Geli email-kaaga, waxaan kuu soo diri doonaa link ammaan ah.', sendLink: 'Dir link-ga', sending: 'Waa la dirayaa…',
  linkSent: 'Haddii email-kaas account leeyahay, link ayaa loo diray.', backToSignIn: 'Ku noqo galitaanka',
  resetTitle: 'Dooro Password Cusub', resetSubtitle: 'Password-ka cusubi waa inuu ahaadaa ugu yaraan 8 xaraf.', updatePassword: 'Cusboonaysii password-ka', updating: 'Waa la cusboonaysiinayaa…',
  passwordUpdated: 'Password-kaaga waa la beddelay. Hadda waad geli kartaa.', invalidLink: 'Link-gan waa khalad ama wakhtigiisii waa dhacay.',
  registerHeading: 'Is-diiwaangeli', registerLead: 'Is-diiwaangeli hadda oo hel adeegga buuxa ee JUTSA Events.', firstName: 'Magaca koowaad', lastName: 'Magaca dambe',
  uploadPhoto: 'Guji si aad sawir u soo geliso', photoHint: 'PNG ama JPG · ikhtiyaari', changePhoto: 'Beddel sawirka', removePhoto: 'Ka saar sawirka', nameRequired: 'Geli magacaaga koowaad iyo kan dambe.',
};

export const authText = { en, so };
export const useAuthText = (language: Language) => authText[language];

// Translate the API's English errors into the selected language.
export function friendlyAuthError(message: string, t: typeof en) {
  if (/invalid email or password/i.test(message)) return t.invalidCredentials;
  if (/already registered|already exists/i.test(message)) return t.emailTaken;
  if (/suspended/i.test(message)) return t.suspended;
  if (/failed to fetch|network|unable to reach/i.test(message)) return t.network;
  if (/invalid or expired/i.test(message)) return t.invalidLink;
  return message;
}
