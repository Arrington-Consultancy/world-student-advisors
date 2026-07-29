import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
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
} from "lucide-react";

type InterviewType = "cas" | "ukvi" | "university" | "course";

const INTERVIEW_TYPES: { id: InterviewType; label: string; description: string }[] = [
  { id: "cas", label: "CAS Interview", description: "Pre-CAS interview with your chosen university" },
  { id: "ukvi", label: "UKVI Credibility Interview", description: "UK student visa credibility interview" },
  { id: "university", label: "University Interview", description: "General admissions interview" },
  { id: "course", label: "Course-Specific Interview", description: "Subject-focused academic interview" },
];

type Stage = "setup" | "answering" | "evaluating" | "results";

interface Evaluation {
  score: number;
  passed: boolean;
  weaknesses: string[];
  strengths: string[];
  researchRecommendations: string[];
  summary: string;
}

export default function InterviewCoach() {
  const [, navigate] = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("portal_token") || "" : "";

  const [stage, setStage] = useState<Stage>("setup");
  const [interviewType, setInterviewType] = useState<InterviewType>("cas");
  const [courseOrSubject, setCourseOrSubject] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const generateMutation = trpc.interviewCoach.generateQuestions.useMutation({
    onSuccess: (data) => {
      if (data.success && data.questions) {
        setQuestions(data.questions);
        setAnswers(new Array(data.questions.length).fill(""));
        setCurrentIndex(0);
        setStage("answering");
        setErrorMsg("");
      } else {
        setErrorMsg("Could not start the practice session. Please try again.");
      }
    },
    onError: () => setErrorMsg("Could not start the practice session. Please try again."),
  });

  const evaluateMutation = trpc.interviewCoach.evaluate.useMutation({
    onSuccess: (data) => {
      if (data.success && data.result) {
        setEvaluation(data.result);
        setStage("results");
        setErrorMsg("");
      } else {
        setErrorMsg("Could not mark your interview. Please try again.");
        setStage("answering");
      }
    },
    onError: () => {
      setErrorMsg("Could not mark your interview. Please try again.");
      setStage("answering");
    },
  });

  // Open access (28 Jul 2026): no login wall — the coach is available to every visitor.

  const startSession = () => {
    setErrorMsg("");
    generateMutation.mutate({
      token: token || undefined,
      interviewType,
      courseOrSubject: courseOrSubject.trim() || undefined,
      count: 5,
    });
  };

  const submitForMarking = () => {
    setStage("evaluating");
    evaluateMutation.mutate({
      token: token || undefined,
      interviewType,
      courseOrSubject: courseOrSubject.trim() || undefined,
      qa: questions.map((q, i) => ({ question: q, answer: answers[i] || "" })),
    });
  };

  const reset = () => {
    setStage("setup");
    setQuestions([]);
    setAnswers([]);
    setCurrentIndex(0);
    setEvaluation(null);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link href="/portal" className="inline-flex items-center text-sm text-gray-600 hover:text-wsa-navy mb-8">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Portal
        </Link>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-wsa-navy px-8 py-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center shrink-0">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Interview Coach</h1>
              <p className="text-white/70 text-sm">Practise. Get marked. Pass mark: 85%.</p>
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
                    The coach marks your answers honestly against a <strong>pass mark of 85%</strong>. It explains where you are weak and what to research — it will <strong>never give you model answers</strong>, because interviewers can spot rehearsed scripts.
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-wsa-navy mb-4">Choose your interview type</h2>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {INTERVIEW_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setInterviewType(t.id)}
                      className={`text-left p-4 rounded-xl border transition-colors ${
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
                  Your course or subject <span className="text-gray-400 font-normal">(optional, improves question relevance)</span>
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
                  disabled={generateMutation.isPending}
                  className="bg-wsa-red hover:bg-wsa-red/90 text-white px-8 py-3 h-auto"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparing your questions…
                    </>
                  ) : (
                    <>
                      Start practice session <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {stage === "answering" && questions.length > 0 && (
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
                          i === currentIndex ? "bg-wsa-red" : answers[i]?.trim() ? "bg-wsa-navy" : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-wsa-navy mb-4 leading-snug">{questions[currentIndex]}</h2>
                <Textarea
                  value={answers[currentIndex] || ""}
                  onChange={(e) => {
                    const next = [...answers];
                    next[currentIndex] = e.target.value;
                    setAnswers(next);
                  }}
                  placeholder="Answer aloud first if you can, then type your answer here as you would say it…"
                  className="min-h-[160px] mb-6"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="outline"
                    disabled={currentIndex === 0}
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Previous
                  </Button>
                  {currentIndex < questions.length - 1 ? (
                    <Button
                      className="bg-wsa-navy hover:bg-wsa-navy/90 text-white"
                      onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                    >
                      Next question <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  ) : (
                    <Button
                      className="bg-wsa-red hover:bg-wsa-red/90 text-white"
                      onClick={submitForMarking}
                      disabled={answers.every((a) => !a.trim())}
                    >
                      Submit for marking <CheckCircle className="w-4 h-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {stage === "evaluating" && (
              <div className="py-16 text-center">
                <Loader2 className="w-10 h-10 text-wsa-red animate-spin mx-auto mb-4" />
                <p className="text-wsa-navy font-medium">Marking your interview…</p>
                <p className="text-sm text-gray-500 mt-1">Assessing content, credibility, and communication.</p>
              </div>
            )}

            {stage === "results" && evaluation && (
              <div>
                <div
                  className={`rounded-xl p-6 mb-8 border ${
                    evaluation.passed ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {evaluation.passed ? (
                      <CheckCircle className="w-10 h-10 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="w-10 h-10 text-amber-600 shrink-0" />
                    )}
                    <div>
                      <p className="text-3xl font-bold text-wsa-navy">
                        {evaluation.score}% <span className="text-base font-medium text-gray-500">(pass mark 85%)</span>
                      </p>
                      <p className={`font-medium ${evaluation.passed ? "text-green-700" : "text-amber-700"}`}>
                        {evaluation.passed ? "Pass — well done. Keep practising to stay sharp." : "Not yet at pass standard — see why below."}
                      </p>
                    </div>
                  </div>
                  {evaluation.summary && <p className="text-sm text-gray-700 mt-4">{evaluation.summary}</p>}
                </div>

                {evaluation.weaknesses.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-wsa-navy mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" /> Where you were weak, and why
                    </h3>
                    <div className="space-y-3">
                      {evaluation.weaknesses.map((w, i) => (
                        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                          {w}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evaluation.strengths.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-wsa-navy mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" /> What worked well
                    </h3>
                    <div className="space-y-3">
                      {evaluation.strengths.map((s, i) => (
                        <div key={i} className="bg-green-50/60 border border-green-100 rounded-lg p-4 text-sm text-gray-700">
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {evaluation.researchRecommendations.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-wsa-navy mb-3 flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-wsa-navy" /> Recommended further research
                    </h3>
                    <div className="space-y-3">
                      {evaluation.researchRecommendations.map((r, i) => (
                        <div key={i} className="bg-blue-50/60 border border-blue-100 rounded-lg p-4 text-sm text-gray-700">
                          {r}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-gray-500 mb-6">
                  The coach never provides model answers. Genuine, personal answers are what interviewers — and visa officers — are listening for.
                </p>

                <Button onClick={reset} variant="outline" className="mr-3">
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Practise again
                </Button>
                <Link href="/portal">
                  <Button className="bg-wsa-navy hover:bg-wsa-navy/90 text-white">Back to Portal</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
