"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { 
  Mic, 
  MicOff, 
  FileText, 
  AlertCircle, 
  CheckCircle,
  Calendar,
  MapPin,
  Users,
  Upload,
  X,
  Loader2,
  ArrowLeft,
  Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

type CasePriority = "low" | "medium" | "high" | "urgent";

const categories = [
  "Wage & Hour",
  "Safety",
  "Scheduling",
  "Discrimination",
  "Harassment",
  "Benefits",
  "Grievance",
  "Working Conditions",
  "Other"
];

export default function NewClaimPage() {
  const router = useRouter();
  const { user } = useUser();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium" as CasePriority,
    location: "",
    date: "",
    witnesses: "",
    documents: [] as File[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Voice recording simulation
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordingTime(0);
      // TODO: Process voice recording and convert to text
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, ...newFiles]
      }));
    }
  };

  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.category) newErrors.category = "Category is required";
    if (!formData.date) newErrors.date = "Date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Map form category to claim type enum
      const categoryToClaimType: Record<string, string> = {
        "Wage & Hour": "grievance_pay",
        "Safety": "workplace_safety",
        "Scheduling": "grievance_schedule",
        "Discrimination": "discrimination_other",
        "Harassment": "harassment_verbal",
        "Benefits": "contract_dispute",
        "Grievance": "grievance_discipline",
        "Working Conditions": "workplace_safety",
        "Other": "other"
      };

      const claimData = {
        claimType: categoryToClaimType[formData.category] || "other",
        incidentDate: formData.date,
        location: formData.location || "Not specified",
        description: formData.description,
        desiredOutcome: `Resolution requested for: ${formData.title}`,
        priority: formData.priority,
        witnessesPresent: !!formData.witnesses,
        witnessDetails: formData.witnesses || null,
        previouslyReported: false,
        isAnonymous: true,
      };

      // Create claim
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(claimData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create claim");
      }

      const result = await response.json();
      const claimId = result.claim.claimId;

      // Upload files if any
      if (formData.documents.length > 0) {
        const uploadPromises = formData.documents.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("claimId", claimId);

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            console.error(`Failed to upload ${file.name}`);
          }
        });

        await Promise.all(uploadPromises);
      }

      setIsSubmitting(false);
      setShowSuccess(true);

      // Redirect after success
      setTimeout(() => {
        router.push("/dashboard/claims");
      }, 2000);
    } catch (error) {
      console.error("Error submitting claim:", error);
      setIsSubmitting(false);
      alert(error instanceof Error ? error.message : "Failed to submit claim");
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6 md:p-10 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle size={48} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Case Submitted Successfully!</h2>
          <p className="text-gray-600 mb-2">Your case has been received and will be reviewed shortly.</p>
          <p className="text-sm text-gray-500">Redirecting to your cases...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link href="/dashboard/claims">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
              <ArrowLeft size={20} />
              Back to My Cases
            </button>
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Submit a New Case</h1>
          <p className="text-gray-600 text-lg">Tell us what happened - use voice or type it out</p>
        </motion.div>

        {/* Voice Recording Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-white/50 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardContent className="p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Recording (Optional)</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Click the microphone to record your case description. We&apos;ll transcribe it for you.
                </p>
                
                <motion.button
                  onClick={toggleRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`inline-flex items-center justify-center w-20 h-20 rounded-full shadow-lg transition-all ${
                    isRecording 
                      ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                      : "bg-gradient-to-br from-blue-600 to-blue-700 hover:shadow-xl"
                  }`}
                >
                  {isRecording ? (
                    <MicOff size={32} className="text-white" />
                  ) : (
                    <Mic size={32} className="text-white" />
                  )}
                </motion.button>

                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4"
                  >
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full font-mono text-lg font-semibold">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      Recording: {formatTime(recordingTime)}
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Case Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-white/50 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} className="text-blue-600" />
                Case Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Case Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Brief summary of your case"
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.title ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Category and Priority */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.category ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select a category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {errors.category}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Priority *
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as CasePriority }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Detailed Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what happened in detail..."
                    rows={6}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.description ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle size={14} />
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Date and Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <Calendar size={16} className="inline mr-1" />
                      When did this occur? *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.date ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.date && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={14} />
                        {errors.date}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <MapPin size={16} className="inline mr-1" />
                      Location (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Section B, Floor 2"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Witnesses */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    <Users size={16} className="inline mr-1" />
                    Witnesses (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.witnesses}
                    onChange={(e) => setFormData(prev => ({ ...prev, witnesses: e.target.value }))}
                    placeholder="Names of any witnesses"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    <Upload size={16} className="inline mr-1" />
                    Supporting Documents (Optional)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PDF, DOC, JPG, PNG up to 10MB
                      </p>
                    </label>
                  </div>

                  {/* File List */}
                  {formData.documents.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.documents.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="ml-2 p-1 hover:bg-blue-200 rounded transition-colors"
                          >
                            <X size={16} className="text-gray-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Help Box */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">What to include:</h4>
                      <ul className="space-y-1 text-sm text-blue-800">
                        <li>• What happened and when it occurred</li>
                        <li>• Who was involved (names, positions)</li>
                        <li>• Where it took place</li>
                        <li>• Any witnesses or supporting documentation</li>
                        <li>• How this affected you or others</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4 pt-4">
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} />
                        Submit Case
                      </>
                    )}
                  </motion.button>

                  <Link href="/dashboard/claims" className="flex-shrink-0">
                    <button
                      type="button"
                      className="px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Privacy Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-6 text-center text-sm text-gray-500"
        >
          <p>
            Your case will be reviewed confidentially by your union steward.
            You&apos;ll receive updates via email at <strong>{user?.primaryEmailAddress?.emailAddress}</strong>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
