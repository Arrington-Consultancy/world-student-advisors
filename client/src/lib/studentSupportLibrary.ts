/**
 * Student Support Library — Stage 1 content.
 *
 * Titles and URLs are taken verbatim from the "PODCAST PAGE 21 August 2026"
 * source document. Some resources deliberately appear in more than one
 * category (a student may reasonably look for the same resource at several
 * stages of their journey) — do not deduplicate.
 */

export interface LibraryResource {
  title: string;
  url: string;
}

export interface LibraryCategory {
  title: string;
  resources: LibraryResource[];
}

export const STUDENT_SUPPORT_LIBRARY: LibraryCategory[] = [
  {
    title: "Getting Started",
    resources: [
      { title: "Code of Conduct", url: "https://www.youtube.com/watch?v=4Qh-fbvTPYY" },
      { title: "Cost of Studying Abroad", url: "https://www.youtube.com/watch?v=7hEjR19N4O8" },
      { title: "PhD Support", url: "https://www.youtube.com/watch?v=Jo4cT1dC2tc" },
      { title: "Undergraduate Course Advice", url: "https://www.youtube.com/watch?v=WqNU_CRy_p8" },
      { title: "Why Choose WSA", url: "https://www.youtube.com/watch?v=aiSXhUTgMKw" },
      { title: "Working While Studying", url: "https://www.youtube.com/watch?v=qx2yZo3UrM0" },
      { title: "WSA USP and the Student Journey", url: "https://www.youtube.com/watch?v=ADQ1h0Ofhik" },
    ],
  },
  {
    title: "Preparing Your Application",
    resources: [
      { title: "Canadian PhD", url: "https://youtu.be/cTSBETNEi3g" },
      { title: "Canadian Undergraduate Degree", url: "https://youtu.be/78btZP_mH0Q" },
      { title: "Cost of Studying Abroad", url: "https://www.youtube.com/watch?v=7hEjR19N4O8" },
      { title: "Personal Statement Guide", url: "https://www.youtube.com/watch?v=Uwz3OWh8rWA" },
      { title: "PhD Support", url: "https://www.youtube.com/watch?v=Jo4cT1dC2tc" },
      { title: "Reference Guidelines", url: "https://www.youtube.com/watch?v=N7UOMcN7iiA" },
      { title: "Selecting a Canadian Masters", url: "https://youtu.be/EF2e349JboM" },
      { title: "Undergraduate Course Advice", url: "https://www.youtube.com/watch?v=WqNU_CRy_p8" },
    ],
  },
  {
    title: "Your University Application",
    resources: [
      { title: "Aberystwyth University", url: "https://www.youtube.com/watch?v=r5Dv1BN9G1E" },
      { title: "Aberystwyth University UFP", url: "https://www.youtube.com/watch?v=Kr2zXcyrumQ" },
      { title: "Canada an International Study Destination", url: "https://youtu.be/cTbVrV5Kwls" },
      { title: "Canadian Courses Community/Technical Institutes", url: "https://youtu.be/CXGwd0apOeg" },
      { title: "Canadian PhD", url: "https://youtu.be/cTSBETNEi3g" },
      { title: "Canadian Undergraduate Degree", url: "https://youtu.be/78btZP_mH0Q" },
      { title: "Cost of Studying Abroad", url: "https://www.youtube.com/watch?v=7hEjR19N4O8" },
      { title: "Cyprus West University", url: "https://youtu.be/xlJOfunvQYM" },
      { title: "Introduction to Canadian Universities", url: "https://youtu.be/ed1eRvpTmX8" },
      { title: "Personal Statement Guide", url: "https://www.youtube.com/watch?v=Uwz3OWh8rWA" },
      { title: "PhD Support", url: "https://www.youtube.com/watch?v=Jo4cT1dC2tc" },
      { title: "Reference Guidelines", url: "https://www.youtube.com/watch?v=N7UOMcN7iiA" },
      { title: "Selecting a Canadian Masters", url: "https://youtu.be/EF2e349JboM" },
      { title: "The Canadian Education System", url: "https://youtu.be/RqOQ6WCRb5o" },
      { title: "UCLan Cyprus, The British University", url: "https://youtu.be/MchRH2L-Ulg" },
      { title: "Undergraduate Course Advice", url: "https://www.youtube.com/watch?v=WqNU_CRy_p8" },
      { title: "University of Debrecen", url: "https://www.youtube.com/watch?v=cSEZdgQQR4o" },
      { title: "University of Lincoln", url: "https://youtu.be/zm35CMrUAy4" },
    ],
  },
  {
    title: "Interview Preparation",
    resources: [
      { title: "CAS and UKVI Credibility Interview", url: "https://www.youtube.com/watch?v=jqaNY_UTekc" },
      { title: "CAS Shield", url: "https://www.youtube.com/watch?v=ebDntBQEgsQ" },
      { title: "Personal Statement Guide", url: "https://www.youtube.com/watch?v=Uwz3OWh8rWA" },
      { title: "PhD Support", url: "https://www.youtube.com/watch?v=Jo4cT1dC2tc" },
      { title: "UK Student Visa Essentials", url: "https://www.youtube.com/watch?v=-l-HNsIcqUY" },
      { title: "UK University Credibility Interview", url: "https://youtu.be/kYb7iXC2vb4" },
    ],
  },
  {
    title: "CAS, Student Visas and Study Permits",
    resources: [
      { title: "Canadian Student (Visa) Permit", url: "https://youtu.be/X1zs-QROHBk" },
      { title: "CAS and UKVI Credibility Interview", url: "https://www.youtube.com/watch?v=jqaNY_UTekc" },
      { title: "CAS Shield", url: "https://www.youtube.com/watch?v=ebDntBQEgsQ" },
      { title: "Child Visa UK", url: "https://youtu.be/j1kMkJaUip8" },
      { title: "Cost of Studying Abroad", url: "https://www.youtube.com/watch?v=7hEjR19N4O8" },
      { title: "UK Student Visa Essentials", url: "https://www.youtube.com/watch?v=-l-HNsIcqUY" },
      { title: "UK University Credibility Interview", url: "https://youtu.be/kYb7iXC2vb4" },
      { title: "Visitors Visa UK, Under 18 Years and Over", url: "https://youtu.be/JgJuzfEDJNo" },
    ],
  },
  {
    title: "Preparing to Travel",
    resources: [
      { title: "Canadian Student (Visa) Permit", url: "https://youtu.be/X1zs-QROHBk" },
      { title: "Child Visa UK", url: "https://youtu.be/j1kMkJaUip8" },
      { title: "Cost of Studying Abroad", url: "https://www.youtube.com/watch?v=7hEjR19N4O8" },
      { title: "Pre-Departure by Glenice Owino", url: "https://youtu.be/xnwa_eJPBZ0" },
      { title: "Pre-Departure – Eldah Therone", url: "https://youtu.be/DoQbDGZUwqo" },
      { title: "Student Accommodation", url: "https://www.youtube.com/watch?v=H_4_Rh96akc" },
      { title: "UK Student Visa Essentials", url: "https://www.youtube.com/watch?v=-l-HNsIcqUY" },
      { title: "UK University Scholarships", url: "https://youtu.be/MzIk7sdNO9k" },
      { title: "Visitors Visa UK, Under 18 Years and Over", url: "https://youtu.be/JgJuzfEDJNo" },
      { title: "Working While Studying", url: "https://www.youtube.com/watch?v=qx2yZo3UrM0" },
    ],
  },
  {
    title: "Arriving and Studying Abroad",
    resources: [
      { title: "Code of Conduct", url: "https://www.youtube.com/watch?v=4Qh-fbvTPYY" },
      { title: "Pre-Departure by Glenice Owino", url: "https://youtu.be/xnwa_eJPBZ0" },
      { title: "Pre-Departure – Eldah Therone", url: "https://youtu.be/DoQbDGZUwqo" },
      { title: "Student Accommodation", url: "https://www.youtube.com/watch?v=H_4_Rh96akc" },
      { title: "Working While Studying", url: "https://www.youtube.com/watch?v=qx2yZo3UrM0" },
      { title: "WSA USP and the Student Journey", url: "https://www.youtube.com/watch?v=ADQ1h0Ofhik" },
    ],
  },
  {
    title: "The WSA Student Journey",
    resources: [
      { title: "Eldah Therone, Team Leader WSA", url: "https://www.youtube.com/watch?v=_VvWRjVXsEg" },
      { title: "Glenice Owino, Senior Student Counsellor", url: "https://www.youtube.com/shorts/e6-bf2vKoao" },
      { title: "Juliet Nnajiofor-Uyi, Lagos, Nigeria", url: "https://www.youtube.com/watch?v=SZjjr2T3qTU" },
      { title: "Madalitso Dube, Director for Malawi", url: "https://www.youtube.com/watch?v=bAKpWI_DH8Q" },
      { title: "Manet Khamayo, Student Counsellor NONUK", url: "https://www.youtube.com/watch?v=oGFf6-IHt5A" },
      { title: "Pre-Departure by Glenice Owino", url: "https://youtu.be/xnwa_eJPBZ0" },
      { title: "Pre-Departure – Eldah Therone", url: "https://youtu.be/DoQbDGZUwqo" },
      { title: "Ten Steps to UK University Success", url: "https://youtu.be/6a7do5dlbOI" },
      { title: "Why Choose WSA", url: "https://www.youtube.com/watch?v=aiSXhUTgMKw" },
      { title: "WSA USP and the Student Journey", url: "https://www.youtube.com/watch?v=ADQ1h0Ofhik" },
    ],
  },
  {
    title: "Meet WSA",
    resources: [
      { title: "Eldah Therone, Team Leader WSA", url: "https://www.youtube.com/watch?v=_VvWRjVXsEg" },
      { title: "Glenice Owino, Senior Student Counsellor", url: "https://www.youtube.com/shorts/e6-bf2vKoao" },
      { title: "Juliet Nnajiofor-Uyi, Lagos, Nigeria", url: "https://www.youtube.com/watch?v=SZjjr2T3qTU" },
      { title: "Madalitso Dube, Director for Malawi", url: "https://www.youtube.com/watch?v=bAKpWI_DH8Q" },
      { title: "Manet Khamayo, Student Counsellor NONUK", url: "https://www.youtube.com/watch?v=oGFf6-IHt5A" },
    ],
  },
];
