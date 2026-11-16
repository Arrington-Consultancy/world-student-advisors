import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import TurnstileWidget, { type TurnstileWidgetHandle } from "@/components/TurnstileWidget";
import { useTurnstileSiteKey } from "@/hooks/useTurnstileSiteKey";
import {
  Mic,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BookOpen,
  RefreshCw,
  ShieldCheck,
  MessageCircleQuestion,
  LogIn,
} from "lucide-react";

type InterviewType = "cas" | "ukvi" | "university" | "course";

const INTERVIEW_TYPES: { id: InterviewType; label: string; description: string }[] = [
  { id: "cas", label: "CAS Interview Preparation", description: "Pre-CAS interview with your chosen university" },
  { id: "ukvi", label: "UKVI Credibility Interview Preparation", description: "UK student visa credibility interview" },
  { id: "university", label: "University Interview Preparation", description: "General admissions interview" },
  { id: "course", label: "Course-Specific Interview Preparation", description: "Subject-focused academic interview" },
];

function isInterviewType(value: string | null): value is InterviewType {
  return value === "cas" || value === "ukvi" || value === "university" || value === "course";
}

type Stage = "setup" | "answering" | "followup" | "assessing" | "question-result" | "summary";

interface QuestionResult {
  question: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingInformation: string[];
  researchHomework: string[];
}

export default function InterviewCoach() {
  const [stage, setStage] = useState<Stage>("setup");
  const [portalToken, setPortalToken] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState<InterviewType>("cas");
  const [courseOrSubject, setCourseOrSubject] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [currentResult, setCurrentResult] = useState<QuestionResult | null>(null);
  const [summary, setSummary] = useState<{ averageScore: number; passed: boolean; readyForMockInterview: boolean } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);
  const turnstileSiteKey = useTurnstileSiteKey();

  const startMutation = trpc.interviewCoach.startSession.useMutation();
  const submitMutation = trpc.interviewCoach.submitAnswer.useMutation();
  const finishMutation = trpc.interviewCoach.finishSession.useMutation();

  // Applicant tool: reading the same portal_token Portal.tsx stores, so
  // signing in once covers both. Not a hard redirect — an unauthenticated
  // visitor still sees what the four tools are and why they're useful
  // (below), just not the practice session itself. A ?mode= query param
  // lets the portal dashboard link straight into a specific mode.
  useEffect(() => {
    setPortalToken(localStorage.getItem("portal_token"));
    const requestedMode = new URLSearchParams(window.location.search).get("mode");
    if (isInterviewType(requestedMode)) {
      setInterviewType(requestedMode);
    }
  }, []);

  // Every protected call consumes the current token and immediately forces
  // a fresh one for whatever comes next — a token is never reused across
  // two submissions, whether the previous call succeeded or failed.
  const consumeTurnstileToken = () => {
    setTurnstileToken("");
    turnstileRef.current?.reset();
  };

  const startSession = () => {
    if (!portalToken) {
      setErrorMsg("Please sign in to your Student Portal account to begin.");
      return;
    }
    if (!turnstileToken) {
      setErrorMsg("Please complete the verification check below, then try again.");
      return;
    }
    setErrorMsg("");
    const token = turnstileToken;
    consumeTurnstileToken();
    startMutation.mutate(
      { token: portalToken, interviewType, courseOrSubject: courseOrSubject.trim() || undefined, count: 5, turnstileToken: token },
      {
        onSuccess: (data) => {
          if (data.success && data.questions.length > 0) {
            setQuestions(data.questions);
            setCurrentIndex(0);
            setResults([]);
            setCurrentResult(null);
            setAnswer("");
            setStage("answering");
          } else {
            setErrorMsg("Could not start the practice session. Please try again.");
          }
        },
        onError: (error) => setErrorMsg(error.message || "Could not start the practice session. Please try again."),
      }
    );
  };

  const finalizeQuestion = (a: { score: number; strengths: string[]; weaknesses: string[]; missingInformation: string[]; researchHomework: string[] }) => {
    const result: QuestionResult = {
      question: questions[currentIndex],
      score: a.score,
      strengths: a.strengths,
      weaknesses: a.weaknesses,
      missingInformation: a.missingInformation,
      researchHomework: a.researchHomework,
    };
    setCurrentResult(result);
    setResults((prev) => [...prev, result]);
    setStage("question-result");
  };

  const submitFirstAnswer = () => {
    if (!turnstileToken) {
      setErrorMsg("Verification check is still preparing. Please wait a moment and try again.");
      return;
    }
    setErrorMsg("");
    setStage("assessing");
    const token = turnstileToken;
    consumeTurnstileToken();
    submitMutation.mutate(
      {
        token: portalToken ?? "",
        interviewType,
        courseOrSubject: courseOrSubject.trim() || undefined,
        question: questions[currentIndex],
        answer,
        turnstileToken: token,
      },
      {
        onSuccess: (data) => {
          if (!data.success) {
            setErrorMsg("Could not assess your answer. Please try again.");
            setStage("answering");
            return;
          }
          if (data.assessment.needsFollowUp) {
            setFollowUpQuestion(data.assessment.followUpQuestion);
            setFollowUpAnswer("");
            setStage("followup");
          } else {
            finalizeQuestion(data.assessment);
          }
        },
        onError: (error) => {
          setErrorMsg(error.message || "Could not assess your answer. Please try again.");
          setStage("answering");
        },
      }
    );
  };

  const submitFollowUpAnswer = () => {
    if (!turnstileToken) {
      setErrorMsg("Verification check is still preparing. Please wait a moment and try again.");
      return;
    }
    setErrorMsg("");
    setStage("assessing");
    const token = turnstileToken;
    consumeTurnstileToken();
    submitMutation.mutate(
      {
        token: portalToken ?? "",
        interviewType,
        courseOrSubject: courseOrSubject.trim() || undefined,
        question: questions[currentIndex],
        answer,
        followUp: { question: followUpQuestion, answer: followUpAnswer },
        turnstileToken: token,
      },
      {
        onSuccess: (data) => {
          if (!data.success) {
            setErrorMsg("Could not assess your answer. Please try again.");
            setStage("followup");
            return;
          }
          finalizeQuestion(data.assessment);
        },
        onError: (error) => {
          setErrorMsg(error.message || "Could not assess your answer. Please try again.");
          setStage("followup");
        },
      }
    );
  };

  const continueToNext = () => {
    setErrorMsg("");
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setAnswer("");
      setFollowUpQuestion("");
      setFollowUpAnswer("");
      setCurrentResult(null);
      setStage("answering");
      return;
    }

    if (!turnstileToken) {
      setErrorMsg("Verification check is still preparing. Please wait a moment and try again.");
      return;
    }
    setStage("assessing");
    const token = turnstileToken;
    consumeTurnstileToken();
    finishMutation.mutate(
      {
        token: portalToken ?? "",
        interviewType,
        courseOrSubject: courseOrSubject.trim() || undefined,
        results: results.map((r) => ({ question: r.question, score: r.score })),
        turnstileToken: token,
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            setSummary(data.summary);
            setStage("summary");
          } else {
            setErrorMsg("Could not finalise your results. Please try again.");
            setStage("question-result");
          }
        },
        onError: (error) => {
          setErrorMsg(error.message || "Could not finalise your results. Please try again.");
          setStage("question-result");
        },
      }
    );
  };

  const reset = () => {
    setStage("setup");
    setQuestions([]);
    setCurrentIndex(0);
    setAnswer("");
    setFollowUpQuestion("");
    setFollowUpAnswer("");
    setResults([]);
    setCurrentResult(null);
    setSummary(null);
    consumeTurnstileToken();
    setErrorMsg("");
  };

  const isBusy = startMutation.isPending || submitMutation.isPending || finishMutation.isPending;

  // Public preview: anyone can see what the four tools are and why they're
  // useful, but using one requires a valid, active Student Portal account.
  // Deliberately no "have we checked localStorage yet" gate before this:
  // this page is build-time server-rendered for prerendering
  // (scripts/prerender.ts, via react-dom/server), and useEffect never runs
  // during that SSR pass — no portal_token can ever be read then. Waiting
  // for a check-complete flag would prerender a blank page instead of this
  // marketing content, defeating the whole point of making the four tools
  // publicly discoverable. An already-authenticated visitor sees this for
  // one client-side render before the effect above finds their real token
  // and swaps to the practice UI below — the same brief hydration flash
  // Portal.tsx already accepts for its own auth check.
  if (!portalToken) {
    return (
      <div className="min-h-screen bg-wsa-warm-white pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="container max-w-3xl">
          <p className="mb-5 text-sm font-medium tracking-[0.2em] uppercase text-wsa-red">Interview Readiness Coach</p>
          <h1 className="mb-5 text-4xl font-semibold leading-[1.08] text-wsa-navy md:text-5xl">
            AI-powered practice for the interview you're actually facing.
          </h1>
          <p className="mb-8 max-w-2xl text-lg leading-8 text-gray-600">
            WSA applicants get structured AI feedback before the real interview. One question at a time, marked honestly, never a rehearsed script to memorise.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {INTERVIEW_TYPES.map((t) => (
              <div key={t.id} className="p-4 rounded-md border border-gray-200 bg-white">
                <p className="font-semibold text-wsa-navy text-sm">{t.label}</p>
                <p className="text-xs text-gray-500 mt-1">{t.description}</p>
              </div>
            ))}
          </div>
          <div className="bg-white shadow-[0_18px_60px_rgba(15,23,42,0.06)] border border-border/70 rounded-lg p-6 mb-8">
            <p className="text-sm text-gray-600 leading-relaxed">
              These tools use AI to generate practice questions and assess your answers. They don't replace official visa or admissions guidance, and they don't guarantee any outcome. Available to WSA applicants through the Student Portal once your application is in.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/portal/login">
              <Button className="bg-wsa-red hover:bg-wsa-red/90 text-white">
                <LogIn className="w-4 h-4 mr-1.5" /> Sign in to your Student Portal
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="border-wsa-navy/20 text-wsa-navy hover:border-wsa-red hover:text-wsa-red">
                Apply now to get started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wsa-warm-white pt-32 pb-20 lg:pt-40 lg:pb-28">
      <div className="container">
        <Link href="/portal" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-wsa-red mb-8">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Portal
        </Link>

        {/* No "Apply Now" here: reaching this render at all already means
            portalToken is set (see the gate above) — an authenticated
            applicant, not a prospect. */}
        <div className="mb-8">
          <p className="mb-5 text-sm font-medium tracking-[0.2em] uppercase text-wsa-red">Interview Readiness Coach</p>
          <h1 className="mb-5 text-4xl font-semibold leading-[1.08] text-wsa-navy md:text-5xl">
            Practise before your live mock interview.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-gray-600">
            Prepare for CAS, UKVI, university and course interviews with honest feedback that supports your WSA counsellor sessions.
          </p>
        </div>

        <div className="bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] border border-border/70 overflow-hidden">
          <div className="bg-wsa-navy px-6 py-6 flex items-center gap-4 md:px-8">
            <div className="w-12 h-12 bg-white/10 flex items-center justify-center shrink-0">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">AI Interview Coach</h2>
              <p className="text-white/70 text-sm">One question at a time. Marked honestly. Pass mark: 85%.</p>
            </div>
          </div>

          <div className="p-8">
            {errorMsg && (
              <div className="mb-6 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {errorMsg}
              </div>
            )}

            {stage === "setup" && (
              <div>
                <div className="mb-6 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    The coach asks one question at a time and marks honestly against a <strong>pass mark of 85%</strong>. If an answer is vague or too short, it will ask a follow-up before scoring. It will <strong>never give you model answers</strong>, because interviewers can spot rehearsed scripts. This prepares you for a live mock interview with your Student Counsellor. It doesn't replace one.
                  </span>
                </div>
                <div className="mb-6 text-xs text-gray-500 leading-relaxed">
                  Your answers are sent to our AI provider to generate a score and feedback for this session only. The full text of your answers isn't kept afterwards. We keep a short completion record (interview type, your score, pass/fail, and the date) linked to your Student Portal account. When you finish a session, a summary is also emailed, covering your score and each question's score but not your answer text, to the WSA team. This tool doesn't create or update your Pipedrive application record.
                </div>
                <h2 className="text-lg font-semibold text-wsa-navy mb-4">Choose your interview type</h2>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {INTERVIEW_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setInterviewType(t.id)}
                    className={`text-left p-4 rounded-md border transition-colors ${
                        interviewType === t.id
                          ? "border-wsa-red bg-wsa-red/5 ring-1 ring-wsa-red"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <p className="font-semibold text-wsa-navy text-sm">{t.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                    </button>
                  ))}
                </div>
                <label className="block text-sm font-medium text-wsa-navy mb-1.5">
                  Your course or university <span className="text-gray-400 font-normal">(optional, improves question relevance)</span>
                </label>
                <input
                  type="text"
                  value={courseOrSubject}
                  onChange={(e) => setCourseOrSubject(e.target.value)}
                  placeholder="e.g. MSc International Business at University of Greenwich"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-wsa-red/20 focus:border-wsa-red"
                />
                <Button
                  onClick={startSession}
                  disabled={startMutation.isPending || !turnstileToken}
                  className="bg-wsa-red hover:bg-wsa-red/90 text-white px-8 py-3 h-auto"
                >
                  {startMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing your first question…
                    </>
                  ) : (
                    <>
                      Start practice session <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {(stage === "answering" || stage === "followup") && questions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm font-medium text-gray-500">
                    Question {currentIndex + 1} of {questions.length}
                  </p>
                  <div className="flex gap-1.5">
                    {questions.map((_, i) => (
                      <span
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          i === currentIndex ? "bg-wsa-red" : i < results.length ? "bg-wsa-navy" : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-wsa-navy mb-4 leading-snug">{questions[currentIndex]}</h2>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={stage === "followup"}
                  placeholder="Answer aloud first if you can, then type your answer here as you would say it…"
                  className="min-h-[140px] mb-4"
                />

                {stage === "followup" && (
                  <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-2 mb-3">
                      <MessageCircleQuestion className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                      <p className="text-sm text-amber-900 font-medium">
                        That needs more detail before it can be marked. Follow-up:
                      </p>
                    </div>
                    <p className="text-wsa-navy font-semibold mb-3">{followUpQuestion}</p>
                    <Textarea
                      value={followUpAnswer}
                      onChange={(e) => setFollowUpAnswer(e.target.value)}
                      placeholder="Answer the follow-up question…"
                      className="min-h-[120px] bg-white"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {stage === "answering" ? (
                    <Button
                      className="bg-wsa-red hover:bg-wsa-red/90 text-white"
                      onClick={submitFirstAnswer}
                      disabled={!answer.trim() || isBusy || !turnstileToken}
                    >
                      Submit answer <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  ) : (
                    <Button
                      className="bg-wsa-red hover:bg-wsa-red/90 text-white"
                      onClick={submitFollowUpAnswer}
                      disabled={!followUpAnswer.trim() || isBusy || !turnstileToken}
                    >
                      Submit follow-up answer <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {stage === "assessing" && (
              <div className="py-16 text-center">
                <Loader2 className="w-10 h-10 text-wsa-red animate-spin mx-auto mb-4" />
                <p className="text-wsa-navy font-medium">Assessing your answer…</p>
                <p className="text-sm text-gray-500 mt-1">Checking content, credibility, and communication.</p>
              </div>
            )}

            {stage === "question-result" && currentResult && (
              <div>
                <div
                  className={`rounded-md p-6 mb-6 border ${
                    currentResult.score >= 85 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {currentResult.score >= 85 ? (
                      <CheckCircle className="w-8 h-8 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="w-8 h-8 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <p className="text-2xl font-bold text-wsa-navy">
                        {currentResult.score}% <span className="text-sm font-medium text-gray-500">for this question (pass mark 85%)</span>
                      </p>
                    </div>
                  </div>
                </div>

                {currentResult.strengths.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-wsa-navy mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" /> What worked well
                    </h3>
                    <div className="space-y-2">
                      {currentResult.strengths.map((s, i) => (
                        <div key={i} className="bg-green-50/60 border border-green-100 rounded-lg p-3 text-sm text-gray-700">{s}</div>
                      ))}
                    </div>
                  </div>
                )}

                {currentResult.weaknesses.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-wsa-navy mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Where this was weak, and why
                    </h3>
                    <div className="space-y-2">
                      {currentResult.weaknesses.map((w, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">{w}</div>
                      ))}
                    </div>
                  </div>
                )}

                {currentResult.missingInformation.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-wsa-navy mb-2 flex items-center gap-2">
                      <MessageCircleQuestion className="w-4 h-4 text-wsa-red" /> What was missing
                    </h3>
                    <div className="space-y-2">
                      {currentResult.missingInformation.map((m, i) => (
                        <div key={i} className="bg-red-50/60 border border-red-100 rounded-lg p-3 text-sm text-gray-700">{m}</div>
                      ))}
                    </div>
                  </div>
                )}

                {currentResult.researchHomework.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-sm font-semibold text-wsa-navy mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-wsa-navy" /> Research or homework before your next attempt
                    </h3>
                    <div className="space-y-2">
                      {currentResult.researchHomework.map((r, i) => (
                        <div key={i} className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-sm text-gray-700">{r}</div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={continueToNext}
                  disabled={isBusy || (currentIndex + 1 >= questions.length && !turnstileToken)}
                  className="bg-wsa-navy hover:bg-wsa-navy/90 text-white"
                >
                  {currentIndex + 1 < questions.length ? (
                    <>Next question <ArrowRight className="w-4 h-4 ml-1.5" /></>
                  ) : (
                    <>See your final results <ArrowRight className="w-4 h-4 ml-1.5" /></>
                  )}
                </Button>
              </div>
            )}

            {stage === "summary" && summary && (
              <div>
                <div
                  className={`rounded-md p-6 mb-8 border ${
                    summary.passed ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {summary.passed ? (
                      <CheckCircle className="w-10 h-10 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="w-10 h-10 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <p className="text-3xl font-bold text-wsa-navy">
                        {summary.averageScore}% <span className="text-base font-medium text-gray-500">average (pass mark 85%)</span>
                      </p>
                      <p className={`font-medium ${summary.passed ? "text-green-700" : "text-amber-700"}`}>
                        {summary.readyForMockInterview
                          ? "Pass: you're ready for a live mock interview with your Student Counsellor."
                          : "Not yet at pass standard: review the research tasks below, then try again."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-8 space-y-4">
                  {results.map((r, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <p className="text-sm font-medium text-wsa-navy">{r.question}</p>
                        <span className={`shrink-0 text-sm font-semibold ${r.score >= 85 ? "text-green-600" : "text-amber-600"}`}>{r.score}%</span>
                      </div>
                      {r.researchHomework.length > 0 && (
                        <ul className="mt-2 text-xs text-gray-600 list-disc list-inside space-y-0.5">
                          {r.researchHomework.map((h, j) => (
                            <li key={j}>{h}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500 mb-6">
                  The coach never provides model answers. Genuine, personal answers are what interviewers (and visa officers) are listening for. This tool prepares you; it doesn't replace a live mock interview with your Student Counsellor.
                </p>

                <Button onClick={reset} variant="outline" className="mr-3">
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Practise again
                </Button>
                <Link href="/portal">
                  <Button className="bg-wsa-navy hover:bg-wsa-navy/90 text-white">Back to Portal</Button>
                </Link>
              </div>
            )}

            {stage !== "summary" && (
              <TurnstileWidget
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
                onError={() => setTurnstileToken("")}
                className="mt-6"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
