export interface Seminar {
  id: string;
  slug: string;
  title: string;
  category: string;
  date: string;
  time: string;
  venue: string;
  capacity: number;
  reserved: number;
  registered?: number;
  /** Supplied by the API; local preview data can calculate it from capacity. */
  remainingSeats?: number;
  speaker: string;
  speakerPosition: string;
  description: string;
  shortDescription?: string;
  image: string;
  coverImage?: string;
  speakerPhoto?: string;
  featured?: boolean;
  status?: string;
  organizer?: string;
  startDateTime?: string;
  endDateTime?: string;
  registrationCloseAt?: string;
  cancellationCloseAt?: string;
  waitlistEnabled?: boolean;
  myRegistration?: { id: string; status: string } | null;
  waitlisted?: number;
}

export const categories = ['Technology', 'Career', 'Education', 'Entrepreneurship', 'Leadership', 'Health', 'Research', 'Community', 'Other'];
