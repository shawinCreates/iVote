"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  registerStage1, registerStage2, registerStage3, registerStage4,
  resumeRegistration, extractError,
} from "@/lib/api";
import { Input, PasswordInput, Select, FileUpload } from "@/components/ui/FormControls";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import StarField from "@/components/shared/StarField";
import Modal from "@/components/ui/Modal";
import { useCamera } from "@/hooks/useCamera";
import toast from "react-hot-toast";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

// ── Faculty → Program mapping ────────────────────────────────────────────────

// Programs offered at Bhaktapur Multiple Campus (TU constituent)
const FACULTY_PROGRAMS: Record<string, string[]> = {
  "Science and Technology": [
    "BIT", "B.Sc. CSIT",
    "B.Sc. Physics", "B.Sc. Biology", "MIT",
  ],
  "Management": ["BBS", "BBA", "BITM", "BBM", "MBA", "MBS", ],
  "Humanities and Social Science": [
    "BCA", "BA", "RD", "MA Sociology"
  ],
};

const FACULTIES = Object.keys(FACULTY_PROGRAMS);

// Year 1 → sem 1,2 · Year 2 → sem 3,4 · Year 3 → sem 5,6 · Year 4 → sem 7,8
const YEAR_SEMESTERS: Record<string, { value: string; label: string }[]> = {
  "1": [{ value: "1", label: "Semester 1" }, { value: "2", label: "Semester 2" }],
  "2": [{ value: "3", label: "Semester 3" }, { value: "4", label: "Semester 4" }],
  "3": [{ value: "5", label: "Semester 5" }, { value: "6", label: "Semester 6" }],
  "4": [{ value: "7", label: "Semester 7" }, { value: "8", label: "Semester 8" }],
};

const YEARS = [
  { value: "1", label: "Year 1" },
  { value: "2", label: "Year 2" },
  { value: "3", label: "Year 3" },
  { value: "4", label: "Year 4" },
];

const STEPS = ["Credentials", "Academic Info", "ID Card", "Photo"];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-7">
      {STEPS.map((_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold font-[var(--font-display)] border-[1.5px] transition-all
            ${i < current ? "bg-success border-success text-void" : i === current ? "bg-cyan-dim border-cyan text-cyan" : "bg-surface-2 border-border text-text-3"}`}>
            {i < current ? "✓" : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 h-0.5 ${i < current ? "bg-success" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function TermsContent() {
  return (
    <div className="space-y-5 text-sm text-text-2 leading-relaxed">
      <p className="text-text-3 text-xs">
        Please read these terms carefully before registering for Secure Online Voting System, the Tribhuvan University campus election system.
      </p>

      <section>
        <h3 className="font-[var(--font-display)] text-xs font-bold tracking-wider uppercase text-white mb-2">
          1. Eligibility
        </h3>
        <p>
          Only currently enrolled students of Tribhuvan University (TU) with a valid TU registration
          number may create an account and participate in elections conducted through Secure Online Voting System. Your
          enrollment status may be verified by the Election Head.
        </p>
      </section>

      <section>
        <h3 className="font-[var(--font-display)] text-xs font-bold tracking-wider uppercase text-white mb-2">
          2. One Account Per Student
        </h3>
        <p>
          Each student is permitted to register exactly one (1) account. Creating duplicate or
          fraudulent accounts is strictly prohibited and will result in permanent disqualification
          and reporting to university authorities.
        </p>
      </section>

      <section>
        <h3 className="font-[var(--font-display)] text-xs font-bold tracking-wider uppercase text-white mb-2">
          3. Accuracy of Information
        </h3>
        <p>
          You must provide truthful and accurate information during registration, including your TU
          registration number, full name, faculty, and program. Submitting false or misleading
          information is grounds for account rejection or termination without notice.
        </p>
      </section>

      <section>
        <h3 className="font-[var(--font-display)] text-xs font-bold tracking-wider uppercase text-white mb-2">
          4. Ballot Secrecy and Integrity
        </h3>
        <p>
          Your vote is secret and encrypted end-to-end using homomorphic encryption. You may cast
          your vote only once per election. Attempting to vote multiple times, coerce other voters,
          or tamper with the election system is strictly prohibited.
        </p>
      </section>

      <section>
        <h3 className="font-[var(--font-display)] text-xs font-bold tracking-wider uppercase text-white mb-2">
          5. Identity Verification
        </h3>
        <p>
          Secure Online Voting System uses face recognition to verify your identity before casting a vote. Your profile
          photo and university ID card, captured during registration, are stored securely and used
          solely for identity verification. They will not be shared with third parties.
        </p>
      </section>

      <section>
        <h3 className="font-[var(--font-display)] text-xs font-bold tracking-wider uppercase text-white mb-2">
          6. Data Privacy
        </h3>
        <p>
          Personal data collected (name, email, TU registration number, faculty, ID card, and
          photo) is used exclusively for managing student elections. Data is stored securely and
          not shared outside the university election administration.
        </p>
      </section>

      <section>
        <h3 className="font-[var(--font-display)] text-xs font-bold tracking-wider uppercase text-white mb-2">
          7. Account Verification
        </h3>
        <p>
          Your account must be verified by the Election Head before you can participate in any
          election. Verification includes reviewing your submitted ID card and profile photo. The
          Election Head reserves the right to reject accounts that do not meet eligibility
          requirements.
        </p>
      </section>

      <section>
        <h3 className="font-[var(--font-display)] text-xs font-bold tracking-wider uppercase text-white mb-2">
          8. Prohibited Conduct
        </h3>
        <ul className="list-disc ml-5 space-y-1">
          <li>Accessing or attempting to access another student's account</li>
          <li>Sharing login credentials with any other person</li>
          <li>Reverse-engineering or interfering with the election system</li>
          <li>Any form of electoral fraud, vote manipulation, or coercion</li>
        </ul>
        <p className="mt-2">
          Violations will be reported to university authorities and may result in disciplinary
          action under TU regulations.
        </p>
      </section>

      <section>
        <h3 className="font-[var(--font-display)] text-xs font-bold tracking-wider uppercase text-white mb-2">
          9. Acceptance
        </h3>
        <p>
          By checking the acceptance box on the registration form, you confirm that you have read,
          understood, and agree to abide by these Terms and Conditions in full.
        </p>
      </section>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageToken, setStageToken] = useState("");

  // T&C
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Step 1 — Credentials
  const [regNumber, setRegNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 — Academic Info
  const [fullName, setFullName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  // Step 3 — ID Card
  const [idCardFile, setIdCardFile] = useState<File | null>(null);

  // Step 4 — Photo
  const camera = useCamera();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  // Resume registration
  const [showResume, setShowResume] = useState(false);
  const [resumeEmail, setResumeEmail] = useState("");
  const [resumePassword, setResumePassword] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState("");

  // Derived options
  const programOptions = faculty ? (FACULTY_PROGRAMS[faculty] ?? []) : [];
  const semesterOptions = year ? (YEAR_SEMESTERS[year] ?? []) : [];

  const handleFacultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFaculty(e.target.value);
    setProgram("");
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(e.target.value);
    setSemester("");
  };

  // ── Stage handlers ───────────────────────────────────────────────────────

  const handleStage1 = async () => {
    if (!acceptedTerms) { setError("Please accept the Terms and Conditions to continue."); return; }
    if (!email.trim()) { setError("Please enter your email address."); return; }
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setError("Please enter a valid email address."); return;
    }
    if (!regNumber.trim()) { setError("Please enter your TU registration number."); return; }
    if (!/^\d{1,2}-\d{1,2}-\d{2,4}-\d{3,4}-\d{4}$/.test(regNumber.trim())) {
      setError("Invalid TU registration number. Expected format: 2-2-0101-234-2021"); return;
    }
    setError(""); setLoading(true);
    try {
      const res = await registerStage1(regNumber, email, password);
      setStageToken(res.stage_token ?? "");
      setStep(1);
    } catch (err) { setError(extractError(err)); }
    finally { setLoading(false); }
  };

  const handleStage2 = async () => {
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    if (/\d/.test(fullName)) { setError("Full name must not contain numbers."); return; }
    if (!faculty) { setError("Please select your faculty."); return; }
    if (!program) { setError("Please select your program."); return; }
    if (!year) { setError("Please select your year."); return; }
    setError(""); setLoading(true);
    try {
      const res = await registerStage2(stageToken, {
        full_name: fullName.trim(),
        faculty,
        program,
        year: parseInt(year),
        ...(semester ? { semester: parseInt(semester) } : {}),
      });

      if (res.stage_token) setStageToken(res.stage_token);
      setStep(2);
    } catch (err) { setError(extractError(err)); }
    finally { setLoading(false); }
  };

  const handleStage3 = async () => {
    if (!idCardFile) { setError("Please upload your ID card."); return; }
    setError(""); setLoading(true);
    try {
      const res = await registerStage3(stageToken, idCardFile);
      if (res.stage_token) setStageToken(res.stage_token);
      setStep(3);
    } catch (err) { setError(extractError(err)); }
    finally { setLoading(false); }
  };

  const handleCapture = async () => {
    setCapturing(true);
    try {
      const frames = await camera.captureFrames();
      setCapturedPhoto(frames[0]);
    } catch { setError("Failed to capture photo. Try again."); }
    setCapturing(false);
  };

  const handleStage4 = async () => {
    if (!capturedPhoto) { setError("Please capture your photo."); return; }
    setError(""); setLoading(true);
    try {
      await registerStage4(stageToken, capturedPhoto);
      camera.stopCamera();
      toast.success("Registration complete! Awaiting verification.");
      router.push("/");
    } catch (err) { setError(extractError(err)); }
    finally { setLoading(false); }
  };

  const handleResume = async () => {
    if (!resumeEmail || !resumePassword) { setResumeError("Enter your email and password."); return; }
    setResumeError(""); setResumeLoading(true);
    try {
      const res = await resumeRegistration(resumeEmail, resumePassword);
      setStageToken(res.token ?? "");
      if (res.full_name) setFullName(res.full_name);
      if (res.faculty) { setFaculty(res.faculty); setProgram(""); }
      if (res.program) setProgram(res.program);
      if (res.year) setYear(String(res.year));
      if (res.semester) setSemester(String(res.semester));
      const stageMap: Record<string, number> = { stage1: 1, stage2: 2, stage3: 3 };
      const nextStep = stageMap[res.stage as string] ?? 1;
      setShowResume(false);
      setStep(nextStep);
      toast.success("Resumed! Continue from where you left off.");
    } catch (err) { setResumeError(extractError(err)); }
    finally { setResumeLoading(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Modal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms and Conditions"
        size="lg"
        footer={
          <Button onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }}>
            Accept &amp; Close
          </Button>
        }
      >
        <TermsContent />
      </Modal>

      <div className="min-h-screen flex items-center justify-center bg-void relative p-4">
        <StarField />
        <div className="grain-overlay" />

        <div className="w-full max-w-[460px] relative z-10 space-y-3">

          {/* ── Main registration card ── */}
          <div className="bg-surface border border-border rounded-[var(--radius-xl)] p-7 animate-fade-up">

            <div className="text-center mb-4">
              <div className="font-[var(--font-display)] text-2xl font-black text-white">
                Secure <span className="text-gold">Online Voting System</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-text-3 font-[var(--font-display)] mt-1 mb-4">
                Student Registration
              </div>
            </div>

            <StepIndicator current={step} />

            {error && (
              <Alert type="danger" className="mb-4" onDismiss={() => setError("")}>{error}</Alert>
            )}

            {/* Step 1 — Credentials */}
            {step === 0 && (
              <div className="space-y-4">
                <Input
                  label="TU Registration Number"
                  name="reg"
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="1-2-34-567-2021"
                  required
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@tu.edu.np"
                  required
                />
                <PasswordInput
                  label="Password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters with uppercase and lowercase letters, numbers and symbols"
                  showStrength
                  required
                />

                {/* Terms and Conditions checkbox */}
                <div className="pt-1 border-t border-border">
                  <label className="flex items-start gap-3 cursor-pointer mt-3">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer accent-cyan"
                    />
                    <span className="text-xs text-text-2 leading-relaxed">
                      I have read and agree to the{" "}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-cyan hover:underline font-semibold bg-transparent border-none cursor-pointer p-0"
                      >
                        Terms and Conditions
                      </button>
                      {" "}for Secure Online Voting System.
                    </span>
                  </label>
                </div>

                <Button
                  onClick={handleStage1}
                  isLoading={loading}
                  disabled={!acceptedTerms}
                  className="w-full"
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2 — Academic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  name="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ram Bahadur Thapa"
                  required
                />
                <Select
                  label="Faculty"
                  name="faculty"
                  value={faculty}
                  onChange={handleFacultyChange}
                  options={FACULTIES}
                  placeholder="Select faculty"
                  required
                />
                <Select
                  label="Program"
                  name="program"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                  options={programOptions}
                  placeholder={faculty ? "Select program" : "Select faculty first"}
                  disabled={!faculty}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Year"
                    name="year"
                    value={year}
                    onChange={handleYearChange}
                    options={YEARS}
                    placeholder="Select year"
                    required
                  />
                  <Select
                    label="Semester"
                    name="semester"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    options={semesterOptions}
                    placeholder={year ? "Optional" : "Select year first"}
                    disabled={!year}
                    hint="Optional"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(0)} className="flex-1">Back</Button>
                  <Button onClick={handleStage2} isLoading={loading} className="flex-1">Continue</Button>
                </div>
              </div>
            )}

            {/* Step 3 — ID Card */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="text-center text-sm text-text-2 mb-2">
                  Upload a clear photo of your university ID card for verification.
                </div>
                <FileUpload
                  label="University ID Card"
                  accept="image/*"
                  maxSize={5 * 1024 * 1024}
                  onFile={setIdCardFile}
                  preview
                  hint="JPEG or PNG · Max 5 MB"
                />
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">Back</Button>
                  <Button onClick={handleStage3} isLoading={loading} className="flex-1">Continue</Button>
                </div>
              </div>
            )}

            {/* Step 4 — Camera Photo */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="text-center text-sm text-text-2 mb-2">
                  Take a selfie for face verification. Look directly at the camera.
                </div>

                <div className="relative bg-void rounded-[var(--radius-lg)] overflow-hidden aspect-[4/3]">
                  {capturedPhoto ? (
                    <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                  ) : (
                    <video ref={camera.videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                  )}
                  {capturing && (
                    <div className="absolute inset-0 bg-void/50 flex items-center justify-center">
                      <span className="text-cyan font-[var(--font-display)] text-sm font-bold animate-pulse">
                        Capturing...
                      </span>
                    </div>
                  )}
                </div>

                {camera.error && <Alert type="danger">{camera.error}</Alert>}

                <div className="flex gap-2">
                  {!camera.isActive && !capturedPhoto && (
                    <Button variant="primary-cyan" onClick={camera.startCamera} className="flex-1">
                      Start Camera
                    </Button>
                  )}
                  {camera.isActive && !capturedPhoto && (
                    <Button onClick={handleCapture} isLoading={capturing} className="flex-1">
                      Capture Photo
                    </Button>
                  )}
                  {capturedPhoto && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => { setCapturedPhoto(null); camera.startCamera(); }}
                        className="flex-1"
                      >
                        Retake
                      </Button>
                      <Button onClick={handleStage4} isLoading={loading} className="flex-1">
                        Complete Registration
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="ghost"
                  onClick={() => { camera.stopCamera(); setStep(2); }}
                  className="w-full"
                >
                  Back
                </Button>
              </div>
            )}

            <div className="text-center mt-5 text-sm text-text-3">
              Already have an account?{" "}
              <Link href="/" className="text-cyan font-semibold hover:underline">Sign In</Link>
            </div>
          </div>

          {/* ── Resume incomplete registration ── */}
          <div className="bg-surface border border-border rounded-[var(--radius-xl)] overflow-hidden animate-fade-up">
            <button
              type="button"
              onClick={() => { setShowResume((s) => !s); setResumeError(""); }}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-transparent border-none cursor-pointer text-text-2 hover:text-white hover:bg-surface-2 transition-colors"
            >
              <span className="font-[var(--font-display)] text-[10px] font-bold tracking-wider uppercase">
                Resume Incomplete Registration
              </span>
              {showResume ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
            </button>

            {showResume && (
              <div className="px-5 pb-5 pt-4 border-t border-border space-y-3">
                <p className="text-xs text-text-3 leading-relaxed">
                  If you started registration but didn&apos;t finish, enter your credentials to pick up where you left off.
                </p>
                {resumeError && (
                  <Alert type="danger" onDismiss={() => setResumeError("")}>{resumeError}</Alert>
                )}
                <Input
                  label="Email"
                  name="resumeEmail"
                  type="email"
                  value={resumeEmail}
                  onChange={(e) => setResumeEmail(e.target.value)}
                  placeholder="student@tu.edu.np"
                />
                <PasswordInput
                  label="Password"
                  name="resumePassword"
                  value={resumePassword}
                  onChange={(e) => setResumePassword(e.target.value)}
                  placeholder="Your password"
                />
                <Button onClick={handleResume} isLoading={resumeLoading} className="w-full">
                  Resume Registration
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
