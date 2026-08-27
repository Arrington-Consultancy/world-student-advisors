import { ArrowRight, MapPin, Phone, Mail, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import CountrySelect from "@/components/CountrySelect";
import InternationalPhoneInput from "@/components/InternationalPhoneInput";
import ScrollReveal from "@/components/ScrollReveal";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";
import { useTurnstileSiteKey } from "@/hooks/useTurnstileSiteKey";
import { useRef, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { getStoredAdClickIds } from "@/lib/adClickIds";
import { reportSignupConversion } from "@/lib/googleAdsConversion";
import { SPONSOR_STATUS_OPTIONS, SCHOLARSHIP_STATUS_OPTIONS } from "@shared/fundingStatus";

/**
 * Every field this form asks for when Education Funding is sponsor,
 * scholarship, or mixed, blanked out when clearing/switching away from that
 * option. Keeping this as one object makes "reset everything not relevant
 * to the newly selected type" a single spread rather than eight separate
 * setters.
 */
const BLANK_FUNDING_DETAILS = {
  sponsorName: "",
  sponsorStatus: "",
  scholarshipName: "",
  scholarshipStatus: "",
  scholarshipCoverage: "",
  mixedFundingSources: "",
  mixedFundingConfirmedAmount: "",
  mixedFundingRemaining: "",
};

/** Navigates to the Google OAuth start endpoint with flow=signup. */
function startGoogleSignup() {
  const origin = window.location.origin;
  window.location.href = `/api/portal/auth/google?origin=${encodeURIComponent(origin)}&flow=signup`;
}

/**
 * Decode a JWT payload without verifying the signature — for display/pre-fill
 * only. The server verifies the token at submission time via verifySignupPrefillToken.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

const offices = [
  {
    country: "United Kingdom",
    role: "Head Office",
    name: "Timothy J. Hunt",
    title: "Managing Director",
    address: "2 Newport Close, Clevedon, BS21 5DZ, England, UK",
    whatsapp: "+44 7914 797830",
    email: "UKHeadOffice@worldstudentadvisors.com",
  },
  {
    country: "Kenya",
    role: "Sub-Saharan Africa Regional Office",
    name: "Eldah Therone",
    title: "Team Leader",
    photo: "/manus-storage/eldah_therone_6c167959.jpg",
    address: "Waiyaki Way, Off Uthiru-Cooperation, Nafra Building, Nairobi, Kenya",
    phone: "+254 702 096 419",
    whatsapp: "+44 7470 689 849",
    email: "KenyaOffice@worldstudentadvisors.com",
  },
  {
    country: "Nigeria",
    role: "Nigeria Office",
    name: "Babatunde Abdulia Azeez",
    title: "Senior Director for Nigeria",
    address: "DSTV Complex, Along Akala Express Way, New Garage, Ibadan, Oyo State, Nigeria",
    phone: "+234 812 929 2769",
    whatsapp: "+234 812 929 2769",
    email: "NigeriaOffice@worldstudentadvisors.com",
  },
  {
    country: "Ghana",
    role: "Ghana Office",
    name: "Gladys Naadi",
    title: "Director for Ghana",
    address: "Afotey Osapesua Avenue, Adjiringanor, East Legon, Accra, Ghana",
    whatsapp: "+233 55 610 2870",
    email: "GhanaOffice@worldstudentadvisors.com",
  },
  {
    country: "Angola",
    role: "Angola Office",
    name: "Pedro Bezerra",
    title: "Director for Angola",
    address: "Município da Ingombota, Edifício Escom, Rua Marechal Brós Tito, 35/37, 10.º Piso, Fração D, Luanda, Angola",
    phone: "+44 7512 055 433",
    email: "beezapy@hotmail.com",
  },
  {
    country: "Cameroon",
    role: "Central Africa Regional Office",
    name: "Lamango Enow Magdaline Esq.",
    title: "Exclusive Regional Representative, Central Africa",
    address: "Carrefour Ministre via 10ème arrêt Bitotol, PO Box 863, Yaoundé, Cameroon",
    phone: "+237 699 93 10 86",
    whatsapp: "+237 699 93 10 86",
    email: "Lamango.enow@worldstudentadvisors.com",
  },
];

/**
 * When set, StudentForm is being completed by an already-authenticated
 * portal member (light signup or Google, already signed in) rather than a
 * public visitor: identity is pre-filled and locked from the verified
 * session, the Google-signup button/copy is skipped, submission goes to
 * portal.submitApplication (which links this exact account) instead of
 * contact.submitStudent, and there's no "check your email" step afterwards
 * — onSuccess is called directly since the student is already signed in.
 */
interface PortalModeProps {
  token: string;
  firstName: string;
  lastName: string;
  email: string;
  onSuccess: () => void;
}

export function StudentForm({ portalMode }: { portalMode?: PortalModeProps } = {}) {
  const [formData, setFormData] = useState({
    firstName: portalMode?.firstName ?? "",
    middleName: "",
    lastName: portalMode?.lastName ?? "",
    gender: "",
    dateOfBirth: "",
    passportNumber: "",
    phone: "",
    email: portalMode?.email ?? "",
    nationality: "",
    country: "",
    highestQualification: "",
    desiredLevel: "",
    areaOfStudy: "",
    preferredMode: "",
    preferredStartMonth: "",
    preferredDestination: "",
    educationFunding: "",
    ...BLANK_FUNDING_DETAILS,
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

  // Google signup prefill state — googleVerified doubles as "identity is
  // known and locked" for portal mode too (starts true there, whatever got
  // them signed in), even though no Google flow runs on this page in that
  // case; see the banner JSX below for the portal-mode-specific copy.
  const [googlePrefillToken, setGooglePrefillToken] = useState("");
  const [googleVerified, setGoogleVerified] = useState(!!portalMode);

  // On mount, read the ?gpt= param left by the Google OAuth signup callback.
  // The payload is decoded client-side for display only; the server verifies
  // the signature at submission time.
  useEffect(() => {
    if (portalMode) return;
    const params = new URLSearchParams(window.location.search);
    const gpt = params.get("gpt");
    if (!gpt) return;
    const payload = decodeJwtPayload(gpt);
    if (!payload || payload.purpose !== "signup_prefill") return;
    setGooglePrefillToken(gpt);
    setGoogleVerified(true);
    setFormData(prev => ({
      ...prev,
      firstName: typeof payload.firstName === "string" ? payload.firstName : prev.firstName,
      lastName: typeof payload.lastName === "string" ? payload.lastName : prev.lastName,
      email: typeof payload.email === "string" ? payload.email : prev.email,
    }));
    // Remove the token from the URL so it isn't bookmarked or shared
    const url = new URL(window.location.href);
    url.searchParams.delete("gpt");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const submitMutation = trpc.contact.submitStudent.useMutation({
    onSuccess: result => {
      if (result.success) {
        setSubmitted(true);
        // The honeypot bypass also returns success:true (with an empty
        // leadId) so bots get no signal they were caught — only report a
        // conversion for a submission that actually reached Pipedrive.
        if (result.leadId) reportSignupConversion();
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

  // Portal mode's counterpart to submitMutation: links the caller's own
  // already-signed-in account directly, no email/activation step needed.
  const applyMutation = trpc.portal.submitApplication.useMutation({
    onSuccess: result => {
      if (result.success) {
        portalMode?.onSuccess();
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

  const mutation = portalMode ? applyMutation : submitMutation;

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
    if (formData.educationFunding === "sponsor") {
      if (!formData.sponsorName.trim()) newErrors.sponsorName = "Please tell us who your sponsor is";
      if (!formData.sponsorStatus) newErrors.sponsorStatus = "Please select the funding status";
    }
    if (formData.educationFunding === "scholarship") {
      if (!formData.scholarshipName.trim()) newErrors.scholarshipName = "Please tell us which scholarship";
      if (!formData.scholarshipStatus) newErrors.scholarshipStatus = "Please select the funding status";
    }
    if (formData.educationFunding === "mixed") {
      if (!formData.mixedFundingSources.trim()) newErrors.mixedFundingSources = "Please describe your funding sources";
      if (!formData.mixedFundingConfirmedAmount.trim()) newErrors.mixedFundingConfirmedAmount = "Please tell us what's already confirmed";
      if (!formData.mixedFundingRemaining.trim()) newErrors.mixedFundingRemaining = "Please tell us what still depends on approval";
    }
    if (!formData.gdprConsent) newErrors.gdprConsent = "You must consent to data processing to submit";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    if (mutation.isPending) return; // Prevent duplicate submissions
    if (!turnstileToken) {
      setSubmitError("Please complete the verification check below, then try again.");
      return;
    }
    if (portalMode) {
      applyMutation.mutate({ ...formData, token: portalMode.token, turnstileToken });
    } else {
      submitMutation.mutate({ ...formData, turnstileToken, googlePrefillToken, ...getStoredAdClickIds() });
    }
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
        Students and parents are welcome to complete this form. We will normally contact you within 48 hours.
      </p>

      {/* Google sign-up */}
      {!googleVerified && (
        <>
          <button
            type="button"
            onClick={() => startGoogleSignup()}
            className="w-full h-11 flex items-center justify-center gap-3 border border-gray-300 bg-white hover:bg-gray-50 transition-colors rounded-none mb-4 text-sm font-medium text-gray-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">or continue with your details</span>
            </div>
          </div>
        </>
      )}

      {googleVerified && portalMode && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Signed in.</strong> Name and email are already on file for your account. Please complete the fields below to finish your application.
          </span>
        </div>
      )}

      {googleVerified && !portalMode && (
        <div className="flex items-center gap-2 mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          <span>
            <strong>Signed in with Google.</strong> Name and email are verified and locked. Please complete the remaining fields below.
          </span>
        </div>
      )}

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
            readOnly={googleVerified}
            onChange={(e) => { if (!googleVerified) { setFormData({ ...formData, firstName: e.target.value }); setErrors((prev) => ({ ...prev, firstName: "" })); } }}
            className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${googleVerified ? "bg-gray-50 cursor-default" : ""} ${errors.firstName ? "border-red-400" : "border-border"}`}
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
            readOnly={googleVerified}
            onChange={(e) => { if (!googleVerified) { setFormData({ ...formData, lastName: e.target.value }); setErrors((prev) => ({ ...prev, lastName: "" })); } }}
            className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${googleVerified ? "bg-gray-50 cursor-default" : ""} ${errors.lastName ? "border-red-400" : "border-border"}`}
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
            placeholder="Optional: helps with visa processing later"
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
            readOnly={googleVerified}
            onChange={(e) => { if (!googleVerified) { setFormData({ ...formData, email: e.target.value }); setErrors((prev) => ({ ...prev, email: "" })); } }}
            className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${googleVerified ? "bg-gray-50 cursor-default" : ""} ${errors.email ? "border-red-400" : "border-border"}`}
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
            onChange={(e) => {
              const value = e.target.value;
              setFormData({ ...formData, educationFunding: value, ...BLANK_FUNDING_DETAILS });
              setErrors((prev) => ({ ...prev, educationFunding: "", ...Object.fromEntries(Object.keys(BLANK_FUNDING_DETAILS).map((key) => [key, ""])) }));
            }}
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
        {formData.educationFunding === "sponsor" && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-wsa-navy mb-1.5">Sponsor name *</label>
              <input
                type="text"
                required
                value={formData.sponsorName}
                onChange={(e) => { setFormData({ ...formData, sponsorName: e.target.value }); setErrors((prev) => ({ ...prev, sponsorName: "" })); }}
                className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.sponsorName ? "border-red-400" : "border-border"}`}
                placeholder="e.g. employer, government scheme, or family member"
              />
              {errors.sponsorName && <p className="text-xs text-red-600 mt-1">{errors.sponsorName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-wsa-navy mb-1.5">Funding status *</label>
              <select
                required
                value={formData.sponsorStatus}
                onChange={(e) => { setFormData({ ...formData, sponsorStatus: e.target.value }); setErrors((prev) => ({ ...prev, sponsorStatus: "" })); }}
                className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.sponsorStatus ? "border-red-400" : "border-border"}`}
              >
                <option value="">Select...</option>
                {SPONSOR_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.sponsorStatus && <p className="text-xs text-red-600 mt-1">{errors.sponsorStatus}</p>}
            </div>
          </div>
        )}
        {formData.educationFunding === "scholarship" && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-wsa-navy mb-1.5">Scholarship name *</label>
                <input
                  type="text"
                  required
                  value={formData.scholarshipName}
                  onChange={(e) => { setFormData({ ...formData, scholarshipName: e.target.value }); setErrors((prev) => ({ ...prev, scholarshipName: "" })); }}
                  className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.scholarshipName ? "border-red-400" : "border-border"}`}
                  placeholder="Name of the scholarship or fund"
                />
                {errors.scholarshipName && <p className="text-xs text-red-600 mt-1">{errors.scholarshipName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-wsa-navy mb-1.5">Funding status *</label>
                <select
                  required
                  value={formData.scholarshipStatus}
                  onChange={(e) => { setFormData({ ...formData, scholarshipStatus: e.target.value }); setErrors((prev) => ({ ...prev, scholarshipStatus: "" })); }}
                  className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.scholarshipStatus ? "border-red-400" : "border-border"}`}
                >
                  <option value="">Select...</option>
                  {SCHOLARSHIP_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {errors.scholarshipStatus && <p className="text-xs text-red-600 mt-1">{errors.scholarshipStatus}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-wsa-navy mb-1.5">What it covers (if known)</label>
              <input
                type="text"
                value={formData.scholarshipCoverage}
                onChange={(e) => setFormData({ ...formData, scholarshipCoverage: e.target.value })}
                className="w-full px-4 py-3 border border-border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors"
                placeholder="e.g. full tuition, partial tuition, tuition and living costs"
              />
            </div>
          </>
        )}
        {formData.educationFunding === "mixed" && (
          <>
            <div>
              <label className="block text-sm font-medium text-wsa-navy mb-1.5">Funding sources *</label>
              <input
                type="text"
                required
                value={formData.mixedFundingSources}
                onChange={(e) => { setFormData({ ...formData, mixedFundingSources: e.target.value }); setErrors((prev) => ({ ...prev, mixedFundingSources: "" })); }}
                className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.mixedFundingSources ? "border-red-400" : "border-border"}`}
                placeholder="e.g. self-funded plus a sponsor, or a partial scholarship plus a loan"
              />
              {errors.mixedFundingSources && <p className="text-xs text-red-600 mt-1">{errors.mixedFundingSources}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-wsa-navy mb-1.5">Amount or proportion already confirmed *</label>
              <input
                type="text"
                required
                value={formData.mixedFundingConfirmedAmount}
                onChange={(e) => { setFormData({ ...formData, mixedFundingConfirmedAmount: e.target.value }); setErrors((prev) => ({ ...prev, mixedFundingConfirmedAmount: "" })); }}
                className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.mixedFundingConfirmedAmount ? "border-red-400" : "border-border"}`}
                placeholder="e.g. 50% self-funded and confirmed, or £10,000 already available"
              />
              {errors.mixedFundingConfirmedAmount && <p className="text-xs text-red-600 mt-1">{errors.mixedFundingConfirmedAmount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-wsa-navy mb-1.5">What remains dependent on approval *</label>
              <input
                type="text"
                required
                value={formData.mixedFundingRemaining}
                onChange={(e) => { setFormData({ ...formData, mixedFundingRemaining: e.target.value }); setErrors((prev) => ({ ...prev, mixedFundingRemaining: "" })); }}
                className={`w-full px-4 py-3 border bg-white focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red transition-colors ${errors.mixedFundingRemaining ? "border-red-400" : "border-border"}`}
                placeholder="e.g. remaining balance depends on a pending scholarship decision"
              />
              {errors.mixedFundingRemaining && <p className="text-xs text-red-600 mt-1">{errors.mixedFundingRemaining}</p>}
            </div>
          </>
        )}

        {/* Additional Section */}
        <div className="pt-6 mt-6 border-t border-border/50">
          <h3 className="text-lg font-semibold text-wsa-navy mb-5">Additional Information</h3>
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
              I consent to WorldStudentAdvisors processing my personal data to provide education guidance and application support. Your information will be handled securely in accordance with our <a href="/privacy-policy" className="text-wsa-red underline">Privacy Policy</a>. *
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
              {portalMode ? "Complete Your Application" : "Start Your Application"}
              <ArrowRight className="ml-2.5" size={18} />
            </>
          )}
        </button>
        <p className="text-xs text-muted-foreground mt-3">
          Our student support service is completely free. Your Student Counsellor will normally contact you within 48 hours.
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
                Ready to Study Abroad?
              </h1>
             <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                Complete the form below and one of our Student Counsellors will contact you personally to discuss your plans and help you take the next step.
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
                  Start Your Application
                </h2>
                <StudentForm />
              </div>
            </ScrollReveal>

            {/* Office Details */}
            <ScrollReveal delay={100} className="lg:col-span-2">
              <div>
                <h2 className="text-2xl font-semibold text-wsa-navy mb-6">WSA Regional Offices</h2>
                <p className="text-muted-foreground mb-8 text-[15px]">
                  You're always welcome to contact your nearest WSA office directly. Our team will be happy to help by phone, WhatsApp or email.
                </p>
                <div className="space-y-6">
                  {offices.map((office) => (
                    <div key={office.country} className="border-t border-border/40 pt-5">
                      <h3 className="text-base font-semibold text-wsa-navy mb-0.5">{office.country}</h3>
                      <p className="text-xs font-medium tracking-wide uppercase text-wsa-red/70 mb-3">{office.role}</p>
                      <div className="flex items-center gap-3 mb-3">
                        {office.photo && (
                          <img
                            src={office.photo}
                            alt={office.name}
                            className="w-10 h-10 rounded-full object-cover object-top flex-shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-wsa-navy">{office.name}</p>
                          <p className="text-xs text-muted-foreground">{office.title}</p>
                        </div>
                      </div>
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
                        {office.whatsapp && (
                          <div className="flex items-center gap-2">
                            <Phone size={13} className="flex-shrink-0 text-muted-foreground/50" />
                            <a href={`https://wa.me/${office.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-green-600 transition-colors">WhatsApp: {office.whatsapp}</a>
                          </div>
                        )}
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
                A named Student Counsellor will contact you personally within 48 hours. They'll listen to your study abroad plans, answer your questions and help you explore the right options for you. Your counsellor will support you from your first conversation through application, admission, visa and enrolment.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
