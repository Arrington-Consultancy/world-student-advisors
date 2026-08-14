import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import CookieConsent from "./components/CookieConsent";
import SeoHead from "./components/SeoHead";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Header from "./components/Header";
import Footer from "./components/Footer";
import About from "./pages/About";
import StudyOptions from "./pages/StudyOptions";
import Counsellors from "./pages/Counsellors";
import LearningHub from "./pages/LearningHub";
import Events from "./pages/Events";
import Partners from "./pages/Partners";
import Contact from "./pages/Contact";
import SportPathways from "./pages/SportPathways";
import OnlineLearning from "./pages/OnlineLearning";
import Podcasts from "./pages/Podcasts";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import ALevels from "./pages/ALevels";
import InternationalFoundation from "./pages/InternationalFoundation";
import InternationalYearOne from "./pages/InternationalYearOne";
import UndergraduateDegrees from "./pages/UndergraduateDegrees";
import PreMasters from "./pages/PreMasters";
import MastersDoctoral from "./pages/MastersDoctoral";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import CodeOfConduct from "./pages/CodeOfConduct";
import AntiBribery from "./pages/AntiBribery";
import DataProtectionConsent from "./pages/DataProtectionConsent";
import SubSaharanPolicy from "./pages/SubSaharanPolicy";
import Compliance from "./pages/Compliance";
import TrainingWorkshops from "./pages/TrainingWorkshops";
import PortalLogin from "./pages/PortalLogin";
import PortalSetPassword from "./pages/PortalSetPassword";
import PortalResetPassword from "./pages/PortalResetPassword";
import Portal from "./pages/Portal";
import PortalResources from "./pages/PortalResources";
import PortalLibrary from "./pages/PortalLibrary";
import InterviewCoach from "./pages/InterviewCoach";
import CVUniversityApplication from "./pages/CVUniversityApplication";
import WebUKVisa from "./pages/WebUKVisa";


function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/about"} component={About} />
      <Route path={"/study-options"} component={StudyOptions} />
      <Route path={"/a-levels"} component={ALevels} />
      <Route path={"/international-foundation-programme"} component={InternationalFoundation} />
      <Route path={"/international-year-one"} component={InternationalYearOne} />
      <Route path={"/undergraduate-degrees"} component={UndergraduateDegrees} />
      <Route path={"/pre-masters-top-up-degrees"} component={PreMasters} />
      <Route path={"/masters-doctoral-degrees"} component={MastersDoctoral} />
      <Route path={"/sport-pathways"} component={SportPathways} />
      <Route path={"/online-learning"} component={OnlineLearning} />
      <Route path={"/study-options/sport-pathways"} component={SportPathways} />
      <Route path={"/study-options/online-learning"} component={OnlineLearning} />
      <Route path={"/study-options/a-levels"} component={ALevels} />
      <Route path={"/study-options/international-foundation-programme"} component={InternationalFoundation} />
      <Route path={"/study-options/international-year-one"} component={InternationalYearOne} />
      <Route path={"/study-options/undergraduate-degrees"} component={UndergraduateDegrees} />
      <Route path={"/study-options/pre-masters-top-up-degrees"} component={PreMasters} />
      <Route path={"/study-options/masters-doctoral-degrees"} component={MastersDoctoral} />
      <Route path={"/counsellors"} component={Counsellors} />
      <Route path={"/learning-hub"} component={LearningHub} />
      <Route path={"/learning-hub/podcasts"} component={Podcasts} />
      <Route path={"/learning-hub/cv-university-application"} component={CVUniversityApplication} />
      <Route path={"/training-workshops"} component={TrainingWorkshops} />
      <Route path={"/events"} component={Events} />
      <Route path={"/partners"} component={Partners} />
      <Route path={"/our-global-education-partners"} component={Partners} />
      <Route path={"/podcasts"} component={Podcasts} />
      <Route path={"/contact"} component={Contact} />
      <Route path={"/privacy"} component={PrivacyPolicy} />
      <Route path={"/privacy-policy"} component={PrivacyPolicy} />
      <Route path={"/terms"} component={Terms} />
      <Route path={"/compliance"} component={Compliance} />
      <Route path={"/code-of-conduct"} component={CodeOfConduct} />
      <Route path={"/anti-bribery-and-anti-corruption-policy"} component={AntiBribery} />
      <Route path={"/data-protection-consent"} component={DataProtectionConsent} />
      <Route path={"/sub-saharan-regional-office-policy"} component={SubSaharanPolicy} />
      <Route path={"/portal/login"} component={PortalLogin} />
      <Route path={"/portal/set-password"} component={PortalSetPassword} />
      <Route path={"/portal/reset-password"} component={PortalResetPassword} />
      <Route path={"/portal/resources"} component={PortalResources} />
      <Route path={"/portal/library"} component={PortalLibrary} />
      <Route path={"/portal/interview-coach"} component={InterviewCoach} />
      <Route path={"/portal"} component={Portal} />
      <Route path={"/WebUKVisa"} component={WebUKVisa} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <ScrollToTop />
          <SeoHead />
          <Header />
          <main>
            <Router />
          </main>
          <Footer />
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
