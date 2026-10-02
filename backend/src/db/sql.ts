// Uploaded images can be megabytes of base64; queries return a cacheable API path instead of the image itself.
const imageSql = (table: string, column: string, path: string) => `CASE WHEN ${table}.${column} LIKE 'data:%' THEN '/seminars/' || ${table}.id || '/${path}?v=' || floor(extract(epoch from ${table}.updated_at))::bigint ELSE ${table}.${column} END AS ${column}`;

const seminarColumnNames = ['id', 'title', 'slug', 'short_description', 'description', 'category', 'speaker', 'speaker_position', 'organizer', 'venue', 'start_date_time', 'end_date_time', 'capacity', 'registration_open_at', 'registration_close_at', 'cancellation_close_at', 'waitlist_enabled', 'reminder_enabled', 'featured', 'status', 'created_by', 'created_at', 'updated_at'];

export const seminarColumns = (table: string) => `${seminarColumnNames.map((column) => `${table}.${column}`).join(', ')}, ${imageSql(table, 'cover_image', 'cover')}, ${imageSql(table, 'speaker_photo', 'speaker-photo')}`;

// The edit form echoes these generated URLs back when an image was not changed.
export const isOwnImageUrl = (value: unknown) => /\/seminars\/[^/]+\/(cover|speaker-photo)/.test(String(value || ''));
