import { ArrowRight, MapPin, Phone, Mail, CheckCircle, Loader2 } from "lucide-react";
import CountrySelect from "@/components/CountrySelect";
import InternationalPhoneInput from "@/components/InternationalPhoneInput";
import ScrollReveal from "@/components/ScrollReveal";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";
import { useTurnstileSiteKey } from "@/hooks/useTurnstileSiteKey";
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

const offices = [
  {
    country: "United Kingdom",
    role: "Headquarters",
    address: "2 Newport Close, Clevedon, BS21 5DZ, England",
    whatsapp: "+44 791 479 7830",
    email: "UKHeadOffice@worldstudentadvisors.com",
  },
  {
    country: "Kenya",
    role: "Sub-Saharan Regional Office",
    address: "Waiyaki Way, Off Uthiru-Cooperation, Nafra Building, Nairobi, Kenya",
    phone: "+254 702 096 419",
    whatsapp: "+44 7470 689 849",
    email: "KenyaOffice@worldstudentadvisors.com",
  },
  {
    country: "Nigeria",
    role: "West Africa Office",
    address: "DSTV Complex, Along Akala Express Way, New Garage, Ibadan, Oyo State",
    phone: "+234 812 929 2769",
    whatsapp: "+234 812 929 2769",
    email: "NigeriaOffice@worldstudentadvisors.com",
  },
  {
    country: "Ghana",
    role: "West Africa Office",
    address: "Afotey Osapesua Avenue, Adjiringanor, East Legon, Accra",
    whatsapp: "+233 55 610 2870",
    email: "GhanaOffice@worldstudentadvisors.com",
  },
];

function StudentForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    passportNumber: "",
    phone: "",
    email: "",
    nationality: "",
    country: "",
    highestQualification: "",
    desiredLevel: "",
    areaOfStudy: "",
    preferredMode: "",
    preferredStartMonth: "",
    preferredDestination: "",
    educationFunding: "",
    promoCode: "",
    referredToWSA: "",
    referredByWhom: "",
    recommendedCounsellor: "",
    gdprConsent: false,
    website: "", // honeypot — real users never see or fill this field
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstileSiteKey = useTurnstileSiteKey();

  const mutation = trpc.contact.submitStudent.useMutation({
    onSuccess: result => {
      if (result.success) {
        setSubmitted(true);
      } else {
        setSubmitError(result.error);
        setTurnstileToken("");
        turnstileRef.current?.reset();
      }
    },
    onError: error => {
      setSubmitError(error.message || "Something went wrong. Please try again or contact us directly.");
      setTurnstileToken("");
      turnstileRef.current?.reset();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) newErrors.email = "Email address is required";
    if (!formData.gender) newErrors.gender = "Please select your gender";
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
    if (formData.phone && formData.phone.replace(/[^0-9]/g, "").length < 4) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (!formData.phone.trim()) newErrors.phone = "Mobile number is required";
    if (!formData.nationality) newErrors.nationality = "Please select your nationality";
    if (!formData.country) newErrors.country = "Please select your country of residence";
    if (!formData.highestQualification) newErrors.highestQualification = "Please select your highest qualification";
    if (!formData.desiredLevel) newErrors.desiredLevel = "Please select your desired level of study";
    if (!formData.areaOfStudy.trim()) newErrors.areaOfStudy = "Please enter your area of study interest";
    if (!formData.preferredMode) newErrors.preferredMode = "Please select your preferred mode of study";
    if (!formData.preferredStartMonth) newErrors.preferredStartMonth = "Please select your preferred start month";
    if (!formData.preferredDestination) newErrors.preferredDestination = "Please select your preferred study destination";
    if (!formData.educationFunding) newErrors.educationFunding = "Please select your education funding";
    if (!formData.gdprConsent) newErrors.gdprConsent = "You must consent to data processing to submit";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    if (mutation.isPending) return; // Prevent duplicate submissions
    if (!turnstileToken) {
      setSubmitError("Please complete the verification check below, then try again.");
      return;
    }
    mutation.mutate({ ...formData, turnstileToken });
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="mx-auto mb-4 text-green-600" size={48} />
        <h3 className="text-2xl font-semibold text-wsa-navy mb-3">Sign-up received</h3>
        <p className="text-muted-foreground text-[15px] max-w-md mx-auto">
          A Student Counsellor will be in touch within 48 hours. Check your email for a confirmation.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-muted-foreground mb-8 text-[15px]">
        Students or parents can apply. A Student Counsellor will follow up within 48 hours to understand your goals in more detail.
      </p>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <input
          type="text"
          name="website"
          value={formData.website}
          onChange={e => setFormData({ ...formData, website: e.target.value })}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] w-px h-px overflow-hidden"
        />
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">First Name *</label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => { setFormData({ ...formData, firstName: e.target.value }); setErrors((prev) => ({ ...prev, firstName: "" })); }}
            className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.firstName ? "border-red-400" : "border-border"}`}
          />
          {errors.firstName && <p className="text-xs text-red-600 mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">Middle Name (Optional)</label>
          <input
            type="text"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
            className="w-full px-4 py-3 border border-border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">Last Name *</label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => { setFormData({ ...formData, lastName: e.target.value }); setErrors((prev) => ({ ...prev, lastName: "" })); }}
            className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.lastName ? "border-red-400" : "border-border"}`}
          />
          {errors.lastName && <p className="text-xs text-red-600 mt-1">{errors.lastName}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Gender *</label>
            <select
              required
              value={formData.gender}
              onChange={(e) => { setFormData({ ...formData, gender: e.target.value }); setErrors((prev) => ({ ...prev, gender: "" })); }}
              className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.gender ? "border-red-400" : "border-border"}`}
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
            {errors.gender && <p className="text-xs text-red-600 mt-1">{errors.gender}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Date of Birth *</label>
            <input
              type="date"
              required
              value={formData.dateOfBirth}
              onChange={(e) => { setFormData({ ...formData, dateOfBirth: e.target.value }); setErrors((prev) => ({ ...prev, dateOfBirth: "" })); }}
              className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.dateOfBirth ? "border-red-400" : "border-border"}`}
            />
            {errors.dateOfBirth && <p className="text-xs text-red-600 mt-1">{errors.dateOfBirth}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">Passport Number</label>
          <input
            type="text"
            value={formData.passportNumber}
            onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
            className="w-full px-4 py-3 border border-border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors"
            placeholder="Optional — helps with visa processing later"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">Mobile Number *</label>
          <InternationalPhoneInput
            value={formData.phone}
            onChange={(phone) => { setFormData({ ...formData, phone }); setErrors((prev) => ({ ...prev, phone: "" })); }}
            error={errors.phone}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">Email Address *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors((prev) => ({ ...prev, email: "" })); }}
            className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.email ? "border-red-400" : "border-border"}`}
          />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Nationality *</label>
            <CountrySelect
              value={formData.nationality}
              onChange={(nationality) => { setFormData({ ...formData, nationality }); setErrors((prev) => ({ ...prev, nationality: "" })); }}
              required
              error={errors.nationality}
              hideLabel
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Country of Residence *</label>
            <CountrySelect
              value={formData.country}
              onChange={(country) => { setFormData({ ...formData, country }); setErrors((prev) => ({ ...prev, country: "" })); }}
              required
              error={errors.country}
              hideLabel
            />
          </div>
        </div>

        {/* Education Preferences Section */}
        <div className="pt-6 mt-6 border-t border-border/50">
          <h3 className="text-lg font-semibold text-wsa-navy mb-5">Education Preferences</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">Highest Qualification *</label>
          <select
            required
            value={formData.highestQualification}
            onChange={(e) => { setFormData({ ...formData, highestQualification: e.target.value }); setErrors((prev) => ({ ...prev, highestQualification: "" })); }}
            className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.highestQualification ? "border-red-400" : "border-border"}`}
          >
            <option value="">Select...</option>
            <option value="secondary">Secondary School (GCSE / O-Level equivalent)</option>
            <option value="a-level">A-Levels / IB / High School Diploma</option>
            <option value="diploma">Diploma / Foundation</option>
            <option value="hnd">HND</option>
            <option value="bachelors">Bachelor's Degree</option>
            <option value="masters">Master's Degree</option>
            <option value="doctorate">Doctorate / PhD</option>
            <option value="other">Other</option>
          </select>
          {errors.highestQualification && <p className="text-xs text-red-600 mt-1">{errors.highestQualification}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Desired Level of Study *</label>
            <select
              required
              value={formData.desiredLevel}
              onChange={(e) => { setFormData({ ...formData, desiredLevel: e.target.value }); setErrors((prev) => ({ ...prev, desiredLevel: "" })); }}
              className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.desiredLevel ? "border-red-400" : "border-border"}`}
            >
              <option value="">Select...</option>
              <option value="foundation">Foundation / Pathway</option>
              <option value="hnd">HND</option>
              <option value="undergraduate">Undergraduate (Bachelor's)</option>
              <option value="top-up">Top-up Degree</option>
              <option value="pre-masters">Pre-Master's</option>
              <option value="postgraduate">Postgraduate (Master's)</option>
              <option value="doctorate">Doctorate (PhD)</option>
              <option value="boarding">Boarding School</option>
              <option value="language">Language Programme</option>
              <option value="summer">Summer Programme</option>
              <option value="online">Online / Distance Learning</option>
              <option value="other">Other / Not Sure</option>
            </select>
            {errors.desiredLevel && <p className="text-xs text-red-600 mt-1">{errors.desiredLevel}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Preferred Mode of Study *</label>
            <select
              required
              value={formData.preferredMode}
              onChange={(e) => { setFormData({ ...formData, preferredMode: e.target.value }); setErrors((prev) => ({ ...prev, preferredMode: "" })); }}
              className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.preferredMode ? "border-red-400" : "border-border"}`}
            >
              <option value="">Select...</option>
              <option value="full-time">Full-time (on campus)</option>
              <option value="part-time">Part-time</option>
              <option value="online">Online / Distance</option>
              <option value="blended">Blended (online + campus)</option>
            </select>
            {errors.preferredMode && <p className="text-xs text-red-600 mt-1">{errors.preferredMode}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">Area of Study Interest *</label>
          <input
            type="text"
            required
            value={formData.areaOfStudy}
            onChange={(e) => { setFormData({ ...formData, areaOfStudy: e.target.value }); setErrors((prev) => ({ ...prev, areaOfStudy: "" })); }}
            className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.areaOfStudy ? "border-red-400" : "border-border"}`}
            placeholder="e.g. Business Management, Computer Science, Medicine..."
          />
          {errors.areaOfStudy && <p className="text-xs text-red-600 mt-1">{errors.areaOfStudy}</p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Preferred Start Month *</label>
            <select
              required
              value={formData.preferredStartMonth}
              onChange={(e) => { setFormData({ ...formData, preferredStartMonth: e.target.value }); setErrors((prev) => ({ ...prev, preferredStartMonth: "" })); }}
              className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.preferredStartMonth ? "border-red-400" : "border-border"}`}
            >
              <option value="">Select...</option>
              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {errors.preferredStartMonth && <p className="text-xs text-red-600 mt-1">{errors.preferredStartMonth}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Preferred Study Destination *</label>
            <select
              required
              value={formData.preferredDestination}
              onChange={(e) => { setFormData({ ...formData, preferredDestination: e.target.value }); setErrors((prev) => ({ ...prev, preferredDestination: "" })); }}
              className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.preferredDestination ? "border-red-400" : "border-border"}`}
            >
              <option value="">Select...</option>
              <option value="uk">United Kingdom</option>
              <option value="usa">United States</option>
              <option value="canada">Canada</option>
              <option value="europe">Europe</option>
              <option value="multiple">Multiple / Not sure</option>
            </select>
            {errors.preferredDestination && <p className="text-xs text-red-600 mt-1">{errors.preferredDestination}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">Education Funding *</label>
          <select
            required
            value={formData.educationFunding}
            onChange={(e) => { setFormData({ ...formData, educationFunding: e.target.value }); setErrors((prev) => ({ ...prev, educationFunding: "" })); }}
            className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.educationFunding ? "border-red-400" : "border-border"}`}
          >
            <option value="">Select...</option>
            <option value="self-funded">Self-funded / Family</option>
            <option value="scholarship">Scholarship</option>
            <option value="loan">Student Loan</option>
            <option value="sponsor">Sponsor / Employer</option>
            <option value="mixed">Mixed funding</option>
          </select>
          {errors.educationFunding && <p className="text-xs text-red-600 mt-1">{errors.educationFunding}</p>}
        </div>

        {/* Additional Section */}
        <div className="pt-6 mt-6 border-t border-border/50">
          <h3 className="text-lg font-semibold text-wsa-navy mb-5">Additional Information</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-wsa-navy mb-1.5">Promotional Code</label>
          <input
            type="text"
            value={formData.promoCode}
            onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
            className="w-full px-4 py-3 border border-border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors"
            placeholder="If you have a promotional code, enter it here"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Were you referred to WSA?</label>
            <select
              value={formData.referredToWSA}
              onChange={(e) => setFormData({ ...formData, referredToWSA: e.target.value, referredByWhom: e.target.value === "yes" ? formData.referredByWhom : "" })}
              className="w-full px-4 py-3 border border-border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors"
            >
              <option value="">Select...</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Recommended Student Counsellor?</label>
            <select
              value={formData.recommendedCounsellor}
              onChange={(e) => setFormData({ ...formData, recommendedCounsellor: e.target.value })}
              className="w-full px-4 py-3 border border-border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors"
            >
              <option value="">Select...</option>
              <option value="eldah">Eldah Therone</option>
              <option value="glenice">Glenice Owino</option>
              <option value="manet">Manet Khamayo</option>
              <option value="sarafina">Sarafina Kihumbu</option>
              <option value="help-me-choose">Help me choose</option>
            </select>
          </div>
        </div>
        {formData.referredToWSA === "yes" && (
          <div>
            <label className="block text-sm font-medium text-wsa-navy mb-1.5">Referred by whom?</label>
            <input
              type="text"
              value={formData.referredByWhom}
              onChange={(e) => setFormData({ ...formData, referredByWhom: e.target.value })}
              className="w-full px-4 py-3 border border-border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors"
              placeholder="Name of the person or organisation who referred you"
            />
          </div>
        )}

        {/* GDPR Consent */}
        <div className="pt-4">
          <label className={`flex items-start gap-3 cursor-pointer ${errors.gdprConsent ? "text-red-600" : ""}`}>
            <input
              type="checkbox"
              checked={formData.gdprConsent}
              onChange={(e) => { setFormData({ ...formData, gdprConsent: e.target.checked }); setErrors((prev) => ({ ...prev, gdprConsent: "" })); }}
              className="mt-1 w-4 h-4 accent-wsa-red"
            />
            <span className="text-sm text-muted-foreground leading-relaxed">
              I consent to WorldStudentAdvisors processing my personal data for the purpose of providing education guidance services. My data will be handled in accordance with the <a href="/privacy-policy" className="text-wsa-red underline">Privacy Policy</a> and GDPR regulations. *
            </span>
          </label>
          {errors.gdprConsent && <p className="text-xs text-red-600 mt-1">{errors.gdprConsent}</p>}
        </div>
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken("")}
          onError={() => setTurnstileToken("")}
        />
        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending || !turnstileToken}
          className="inline-flex items-center px-8 py-4 bg-wsa-red text-white font-semibold tracking-wide transition-all duration-200 hover:bg-wsa-red/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={18} />
              Submitting...
            </>
          ) : (
            <>
              Submit Enquiry
              <ArrowRight className="ml-2.5" size={18} />
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          No fees. No obligation. Your counsellor will be in touch within 48 hours.
        </p>
      </form>
    </div>
  );
}

export default function Contact() {
  return (
    <div className="min-h-screen">
      <section className="pt-32 lg:pt-40 pb-20 lg:pb-28">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.2em] uppercase text-wsa-red mb-5">Get in touch</p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-semibold text-wsa-navy leading-[1.1] mb-8">
                Your counsellor is ready when you are
              </h1>
             <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Students, parents, and partner institutions are all welcome to get in touch. We respond personally, usually within one working day.
             </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Form + Offices */}
      <section className="pb-28 lg:pb-40">
        <div className="container">
          <div className="grid lg:grid-cols-5 gap-16 lg:gap-20">
            {/* Form */}
            <ScrollReveal className="lg:col-span-3">
              <div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-8 pb-3 border-b border-border/40">
                  Sign-up Form
                </h2>
                <StudentForm />
              </div>
            </ScrollReveal>

            {/* Office Details */}
            <ScrollReveal delay={100} className="lg:col-span-2">
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-6">Our offices</h2>
                <p className="text-muted-foreground mb-8 text-[15px]">
                  You can also contact your nearest office directly by phone, WhatsApp, or email.
                </p>
                <div className="space-y-6">
                  {offices.map((office) => (
                    <div key={office.country} className="border-t border-border/40 pt-5">
                      <h3 className="text-base font-semibold text-wsa-navy mb-0.5">{office.country}</h3>
                      <p className="text-xs font-medium tracking-wide uppercase text-wsa-red/70 mb-3">{office.role}</p>
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <MapPin size={13} className="mt-0.5 flex-shrink-0 text-muted-foreground/50" />
                          <span>{office.address}</span>
                        </div>
                        {office.phone && (
                          <div className="flex items-center gap-2">
                            <Phone size={13} className="flex-shrink-0 text-muted-foreground/50" />
                            <a href={`tel:${office.phone}`} className="hover:text-wsa-red transition-colors">{office.phone}</a>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="flex-shrink-0 text-muted-foreground/50" />
                          <a href={`https://wa.me/${office.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition-colors">WhatsApp: {office.whatsapp}</a>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={13} className="flex-shrink-0 text-muted-foreground/50" />
                          <a href={`mailto:${office.email}`} className="hover:text-wsa-red transition-colors break-all">{office.email}</a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Reassurance */}
      <section className="py-20 lg:py-24 bg-wsa-cream">
        <div className="container">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-wsa-navy leading-[1.2] mb-5">
                What happens after you apply?
              </h2>
              <p className="text-[17px] text-muted-foreground leading-relaxed">
                A named Student Counsellor will contact you within 48 hours. They'll listen to your goals, answer your questions, and explain how WSA can help. There's no commitment at this stage, just a conversation. If WSA isn't the right fit, they'll tell you honestly.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
