import { usePreferences } from '../context/PreferencesContext';

const en = {
  nav: {
    discover: 'DISCOVER', home: 'Home', browse: 'Browse events', vote: 'Vote', myEvents: 'My events', about: 'About JUTSA', adminPanel: 'Admin panel',
    joinText: 'Join JUTSA to save events and manage your attendance.', join: 'Join JUTSA', signIn: 'Sign in', logout: 'Log out', profile: 'Profile', menu: 'Toggle navigation',
    roles: { STUDENT: 'Student', STAFF: 'Staff', ADMIN: 'Administrator', SUPER_ADMIN: 'Super Admin', ORGANIZER: 'Organizer' } as Record<string, string>,
    language: 'Language', theme: 'Theme',
  },
  bottom: { home: 'Home', explore: 'Explore', vote: 'Vote', myEvents: 'My events', profile: 'Profile' },
  footer: { tagline: 'Connecting students through meaningful learning, leadership and community events.', explore: 'Explore', upcoming: 'Upcoming seminars', myEvents: 'My events', about: 'About JUTSA', contact: 'Contact' },
  home: {
    titleA: 'Discover.', titleB: 'Learn.', titleC: 'Connect.',
    lead: 'Discover seminars, reserve your seat and connect with learning opportunities across JUTSA.',
    searchPlaceholder: 'Search seminars, topics or speakers', search: 'Search', explore: 'Explore seminars', myEvents: 'My events', createAccount: 'Create account',
    nextUp: 'NEXT UP', seatsLeft: (left: number, total: number) => `${left} of ${total} seats left`, full: 'Seminar full — waitlist open', reserve: 'Reserve my seat', view: 'View seminar',
    emptyTitle: 'New seminars are on the way', emptyText: 'Have an idea for the next one? Tell JUTSA what you want to learn.', voteCta: 'Vote for a seminar',
    upcomingStat: (n: number) => `upcoming seminar${n === 1 ? '' : 's'}`, seatsStat: (n: number) => `open seat${n === 1 ? '' : 's'}`, topicsStat: (n: number) => `topic${n === 1 ? '' : 's'} to explore`,
    topicsEyebrow: 'BROWSE BY TOPIC', topicsTitle: 'What do you want to learn?', seminarCount: (n: number) => `${n} seminar${n === 1 ? '' : 's'}`, comingSoon: 'Coming soon',
    upcomingEyebrow: 'UPCOMING SEMINARS', upcomingTitle: 'Find your next learning moment', viewAll: 'View all seminars',
    emptyUpcomingTitle: 'No upcoming seminars yet', emptyUpcomingText: 'New seminars will appear here as soon as JUTSA publishes them. Check back soon.', voteNext: 'Vote for the next seminar',
    howEyebrow: 'SIMPLE BY DESIGN', howTitle: 'From discovery to attendance',
    steps: [
      ['Find a seminar', 'Browse opportunities that match your interests and goals.'],
      ['Reserve your seat', 'Register in seconds using your JUTSA profile information.'],
      ['Show your QR pass', 'Check in smoothly and make the most of every event.'],
    ],
    aboutEyebrow: 'ABOUT JUTSA', aboutTitle: 'By students, for students',
    aboutText: 'Jamhuriya University Technology Students Association brings JUST students together through seminars, workshops and community events that build skills beyond the classroom.',
    learnMore: 'Learn more about JUTSA', ctaEyebrow: 'READY WHEN YOU ARE', ctaTitleA: 'Learning is better', ctaTitleB: 'when we grow together.', ctaFind: 'Find a seminar', ctaCreate: 'Create your account',
    topics: {} as Record<string, string>,
  },
};

const so: typeof en = {
  nav: {
    discover: 'SAHAN', home: 'Bogga hore', browse: 'Dhacdooyinka', vote: 'Codbixin', myEvents: 'Dhacdooyinkayga', about: 'Ku saabsan JUTSA', adminPanel: 'Maamulka',
    joinText: 'Ku biir JUTSA si aad u kaydsato dhacdooyinka oo u maamusho imaanshahaaga.', join: 'Ku biir JUTSA', signIn: 'Gal', logout: 'Ka bax', profile: 'Profile', menu: 'Fur menu-ga',
    roles: { STUDENT: 'Arday', STAFF: 'Shaqaale', ADMIN: 'Maamule', SUPER_ADMIN: 'Maamulaha Sare', ORGANIZER: 'Qabanqaabiye' },
    language: 'Luqadda', theme: 'Muuqaalka',
  },
  bottom: { home: 'Hore', explore: 'Sahan', vote: 'Codee', myEvents: 'Kuwayga', profile: 'Profile' },
  footer: { tagline: 'Isku xirka ardayda iyada oo loo marayo waxbarasho macno leh, hoggaamin iyo dhacdooyin bulsho.', explore: 'Sahan', upcoming: 'Seminar-yada soo socda', myEvents: 'Dhacdooyinkayga', about: 'Ku saabsan JUTSA', contact: 'La xiriir' },
  home: {
    titleA: 'Ogow.', titleB: 'Baro.', titleC: 'Xiriir.',
    lead: 'Hel seminar-yada, qabso kursigaaga oo la xiriir fursadaha waxbarasho ee JUTSA oo dhan.',
    searchPlaceholder: 'Raadi seminar, mawduuc ama khudbeeye', search: 'Raadi', explore: 'Daawo seminar-yada', myEvents: 'Dhacdooyinkayga', createAccount: 'Samee account',
    nextUp: 'KAN XIGA', seatsLeft: (left, total) => `${left} kursi oo ka mid ah ${total} ayaa bannaan`, full: 'Waa buuxaa — liiska sugitaanka waa furan yahay', reserve: 'Qabso kursigayga', view: 'Eeg seminar-ka',
    emptyTitle: 'Seminar-yo cusub ayaa soo socda', emptyText: 'Fikrad ma u haysaa kan xiga? U sheeg JUTSA waxa aad rabto inaad barato.', voteCta: 'U codee seminar',
    upcomingStat: () => 'seminar oo soo socda', seatsStat: () => 'kursi oo bannaan', topicsStat: () => 'mawduuc oo la baari karo',
    topicsEyebrow: 'KU RAADI MAWDUUC', topicsTitle: 'Maxaad rabtaa inaad barato?', seminarCount: (n) => `${n} seminar`, comingSoon: 'Dhowaan',
    upcomingEyebrow: 'SEMINAR-YADA SOO SOCDA', upcomingTitle: 'Hel fursaddaada waxbarasho ee xigta', viewAll: 'Eeg dhammaan seminar-yada',
    emptyUpcomingTitle: 'Weli ma jiraan seminar-yo soo socda', emptyUpcomingText: 'Seminar-yada cusub halkan ayay ka muuqan doonaan marka JUTSA daabaco. Dib u soo eeg.', voteNext: 'U codee seminar-ka xiga',
    howEyebrow: 'FUDUD OO CAD', howTitle: 'Laga bilaabo helitaanka ilaa imaanshaha',
    steps: [
      ['Hel seminar', 'Baadh fursadaha ku habboon xiisahaaga iyo hadafyadaada.'],
      ['Qabso kursigaaga', 'Is-diiwaangeli ilbiriqsiyo gudahood adigoo isticmaalaya profile-kaaga JUTSA.'],
      ['Tus QR pass-kaaga', 'Si fudud u gal oo ka faa’iidayso dhacdo kasta.'],
    ],
    aboutEyebrow: 'KU SAABSAN JUTSA', aboutTitle: 'Ardayda, ardayda u adeegta',
    aboutText: 'Ururka Ardayda Tiknoolajiyada ee Jaamacadda Jamhuriya wuxuu isu keenaa ardayda JUST iyada oo loo marayo seminar-yo, tababarro iyo dhacdooyin bulsho oo xirfado ka baxsan fasalka dhisa.',
    learnMore: 'Wax badan ka ogow JUTSA', ctaEyebrow: 'DIYAAR MARKAAD DIYAAR TAHAY', ctaTitleA: 'Waxbarashadu way fiican tahay', ctaTitleB: 'marka aan wada korno.', ctaFind: 'Hel seminar', ctaCreate: 'Samee account-kaaga',
    topics: { Technology: 'Tiknoolajiyad', Career: 'Shaqo', Education: 'Waxbarasho', Entrepreneurship: 'Ganacsi', Leadership: 'Hoggaamin', Health: 'Caafimaad', Research: 'Cilmi-baaris', Community: 'Bulsho', Other: 'Kale' },
  },
};

export function useSiteText() {
  const { language } = usePreferences();
  return language === 'so' ? so : en;
}
