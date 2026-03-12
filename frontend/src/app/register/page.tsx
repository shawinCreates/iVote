"use client";
import { useState } from "react";
import {
  FaLock,
  FaCheckCircle,
  FaEnvelope,
  FaUserGraduate,
  FaIdCard,
  FaUser,
} from "react-icons/fa";
import { MdOutlineSchool } from "react-icons/md";
import TypewriterBanner from "../reusable_components/TypewriterBanner";

export default function SignupPage(): JSX.Element {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [faculty, setFaculty] = useState("");
  const [semester, setSemester] = useState("");
  const [idCard, setIdCard] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    faculty?: string;
    semester?: string;
    idCard?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name) newErrors.name = "Name is required.";
    if (!email) newErrors.email = "Email is required.";
    else if (!emailRegex.test(email)) newErrors.email = "Enter a valid email.";
    if (!password || password.length < 6) newErrors.password = "Password must be at least 6 characters.";
    if (!faculty) newErrors.faculty = "Faculty is required.";
    if (!semester) newErrors.semester = "Year / Semester is required.";
    if (!idCard) newErrors.idCard = "Student ID card upload is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, idCard: "Only JPG or PNG files allowed." }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, idCard: "File must be smaller than 2MB." }));
      return;
    }
    setErrors((prev) => ({ ...prev, idCard: undefined }));
    setIdCard(file);

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("password", password);
      formData.append("faculty", faculty);
      formData.append("semester", semester);
      if (idCard) formData.append("idCard", idCard);

      const res = await fetch("http://127.0.0.1:8000/signup", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Signup failed: ${res.statusText}`);
      const data = await res.json();
      alert(data.message);

      // Reset form
      setName(""); setEmail(""); setPassword("");
      setFaculty(""); setSemester(""); setIdCard(null); setPreview(null); setErrors({});
    } catch (error) {
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center text-foreground px-4"
      style={{
        backgroundImage: `radial-gradient(circle at center, #000 1px, transparent 1px),
                          linear-gradient(135deg, #ffffff 0%, #f0f0f0 50%, #dcdcdc 100%)`,
        backgroundSize: "20px 20px, cover",
      }}
    >
      <div className="relative w-full max-w-lg">
        {/* Pattern block */}
        <div
          className="absolute inset-0 translate-x-6 translate-y-6 rounded-tr-[60px] rounded-bl-[60px]"
          style={{
            backgroundImage: `repeating-linear-gradient(
                                45deg,
                                rgba(255,255,255,0.1) 0px,
                                rgba(255,255,255,0.1) 2px,
                                transparent 2px,
                                transparent 6px
                              ),
                              linear-gradient(to bottom right, #000000, #333333)`,
            backgroundSize: "12px 12px, cover",
            zIndex: 0,
          }}
        ></div>

        {/* Form */}
        <div
          className="relative w-full rounded-xl p-8 text-center transition-all duration-500 hover:scale-[1.01]"
          style={{
            background: "linear-gradient(to bottom right, #ffffff, #f9f9f9)",
            border: "2px solid rgba(0,0,0,0.2)",
            zIndex: 1,
          }}
        >
          <img src="/vote.png" alt="Vote Emblem" className="absolute -top-10 -right-10 h-20 w-20 opacity-90 animate-pulse" />
          <img src="/university-logo.png" alt="University Logo" className="mx-auto mb-4 h-16 w-16 transition-transform duration-300 hover:scale-110" />

          <h2 className="mb-4 text-2xl font-semibold tracking-wide">Faculty Sign Up</h2>
          <TypewriterBanner message="Register to vote securely" speed={120} pause={1500} />

          {/* Unique grid layout */}
          <form onSubmit={handleSignup} className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            {/* Name */}
            <div className="flex flex-col">
              <div className="flex items-center border-b-2 border-foreground/50 focus-within:border-foreground rounded-tr-lg">
                <FaUser className="mr-2" />
                <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-transparent p-2 text-sm outline-none" />
              </div>
              {errors.name && <span className="text-xs text-red-600 mt-1">{errors.name}</span>}
            </div>

            {/* Email */}
            <div className="flex flex-col">
              <div className="flex items-center border-b-2 border-foreground/50 focus-within:border-foreground rounded-bl-lg">
                <FaEnvelope className="mr-2" />
                <input type="email" placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-transparent p-2 text-sm outline-none" />
              </div>
              {errors.email && <span className="text-xs text-red-600 mt-1">{errors.email}</span>}
            </div>

            {/* Password */}
            <div className="flex flex-col">
              <div className="flex items-center border-b-2 border-foreground/50 focus-within:border-foreground rounded-tl-lg">
                <FaLock className="mr-2" />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-transparent p-2 text-sm outline-none" />
              </div>
              {errors.password && <span className="text-xs text-red-600 mt-1">{errors.password}</span>}
            </div>

            {/* Faculty */}
            <div className="flex flex-col">
              <div className="flex items-center border-b-2 border-foreground/50 focus-within:border-foreground rounded-br-lg">
                <FaUserGraduate className="mr-2" />
                <input type="text" placeholder="Faculty" value={faculty} onChange={(e) => setFaculty(e.target.value)} className="w-full bg-transparent p-2 text-sm outline-none" />
              </div>
              {errors.faculty && <span className="text-xs text-red-600 mt-1">{errors.faculty}</span>}
            </div>

                        {/* Semester */}
            <div className="flex flex-col col-span-2">
              <div className="flex items-center border-b-2 border-foreground/50 focus-within:border-foreground rounded-lg">
                <MdOutlineSchool className="mr-2" />
                <input
                  type="text"
                  placeholder="Year / Semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full bg-transparent p-2 text-sm outline-none"
                />
              </div>
              {errors.semester && (
                <span className="text-xs text-red-600 mt-1">{errors.semester}</span>
              )}
            </div>

            {/* ID Card Upload */}
            <div className="flex flex-col col-span-2">
              <div className="flex items-center border-b-2 border-foreground/50 focus-within:border-foreground rounded-lg">
                <FaIdCard className="mr-2" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    handleFileChange(e.target.files ? e.target.files[0] : null)
                  }
                  className="w-full p-2 text-sm"
                />
              </div>

              {preview && (
                <img
                  src={preview}
                  alt="ID Preview"
                  className="mt-3 mx-auto h-24 rounded shadow"
                />
              )}

              {errors.idCard && (
                <span className="text-xs text-red-600 mt-1">{errors.idCard}</span>
              )}
            </div>

            {/* Submit */}
            <div className="col-span-2">
              <button
                type="submit"
                className="w-full rounded-lg bg-foreground py-2 font-semibold text-background transition-transform duration-300 hover:scale-105 hover:bg-black"
              >
                SIGN UP & REGISTER
              </button>
            </div>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-sm">
            Already registered?{" "}
            <a href="/login" className="font-semibold hover:underline">
              Login
            </a>
          </p>

          {/* Trust Badge */}
          <div className="mt-4 text-xs font-bold flex items-center justify-center gap-2">
            <FaCheckCircle className="text-green-600" />
            Verified by Student Election Commission
          </div>
        </div>
      </div>
    </div>
  );
}