export const facultyDepartments: Record<string, string[]> = {
  'Faculty of Computer & Information Technology': ['Computer Science', 'Information Technology', 'Software Engineering'],
  'Faculty of Engineering': ['Civil Engineering', 'Electrical Engineering'],
  'Faculty of Medicine & Health Sciences': ['Medicine', 'Public Health'],
  'Faculty of Economics & Management': ['Business Administration', 'Accounting'],
  'Faculty of Veterinary & Agricultural Sciences': ['Veterinary Medicine', 'Agriculture'],
  'Faculty of Education': ['Education', 'Languages'],
};

export const semesters = Array.from({ length: 10 }, (_, index) => `Semester ${index + 1}`);
