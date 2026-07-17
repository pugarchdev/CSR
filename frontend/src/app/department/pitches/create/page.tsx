// Create Pitch Form Page
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Layers,
  ChevronLeft,
  Save,
  Send,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";

import { DashboardLayout } from "@/components/layout";
import { PageHeader } from "@/components/layout";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, TextArea, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { label: "Dashboard", href: "/department/dashboard", icon: Layers },
  { label: "Create Pitch", href: "/department/pitches/create", icon: Building2 },
  { label: "My Pitches", href: "/department/pitches", icon: Building2 },
];

const districts = [
  { value: "", label: "Select District" },
  { value: "mumbai", label: "Mumbai" },
  { value: "pune", label: "Pune" },
  { value: "thane", label: "Thane" },
  { value: "nashik", label: "Nashik" },
  { value: "nagpur", label: "Nagpur" },
  { value: "aurangabad", label: "Aurangabad" },
];

const sectors = [
  { value: "", label: "Select Sector" },
  { value: "education", label: "Education" },
  { value: "health", label: "Health" },
  { value: "environment", label: "Environment" },
  { value: "livelihood", label: "Livelihood" },
  { value: "rural_development", label: "Rural Development" },
  { value: "infrastructure", label: "Infrastructure" },
];

const budgetRanges = [
  { value: "", label: "Select Budget Range" },
  { value: "under_10l", label: "Under ₹10 Lakhs" },
  { value: "10l_to_50l", label: "₹10 Lakhs - ₹50 Lakhs" },
  { value: "50l_to_1cr", label: "₹50 Lakhs - ₹1 Crore" },
  { value: "1cr_to_5cr", label: "₹1 Crore - ₹5 Crore" },
  { value: "above_5cr", label: "Above ₹5 Crore" },
];

interface FormData {
  title: string;
  description: string;
  district: string;
  sector: string;
  budgetRange: string;
  estimatedCost: string;
  duration: string;
  beneficiaries: string;
  location: string;
  documents: File[];
}

interface FormErrors {
  [key: string]: string;
}

export default function CreatePitchPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    district: "",
    sector: "",
    budgetRange: "",
    estimatedCost: "",
    duration: "",
    beneficiaries: "",
    location: "",
    documents: [],
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};
    
    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = "Title is required";
      if (!formData.description.trim()) newErrors.description = "Description is required";
      if (formData.description.length < 50) newErrors.description = "Description must be at least 50 characters";
    }
    
    if (step === 2) {
      if (!formData.district) newErrors.district = "District is required";
      if (!formData.sector) newErrors.sector = "Sector is required";
      if (!formData.location.trim()) newErrors.location = "Location is required";
    }
    
    if (step === 3) {
      if (!formData.budgetRange) newErrors.budgetRange = "Budget range is required";
      if (!formData.estimatedCost.trim()) newErrors.estimatedCost = "Estimated cost is required";
      if (!formData.duration.trim()) newErrors.duration = "Duration is required";
      if (!formData.beneficiaries.trim()) newErrors.beneficiaries = "Beneficiaries count is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleChange = (field: keyof FormData, value: string | File[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setShowSuccess(true);
    
    // Redirect after showing success
    setTimeout(() => {
      router.push("/department/pitches");
    }, 2000);
  };

  const steps = [
    { number: 1, title: "Basic Information", description: "Enter pitch details" },
    { number: 2, title: "Location & Sector", description: "Specify location and sector" },
    { number: 3, title: "Budget & Timeline", description: "Set budget and duration" },
    { number: 4, title: "Review & Submit", description: "Review and submit pitch" },
  ];

  return (
    <DashboardLayout
      userRole="Department Officer"
      userName="Department Officer"
      userEmail="officer@dept.gov.in"
      sidebarItems={sidebarItems}
    >
      <PageHeader
        title="Create Development Pitch"
        description="Submit a new development need for CSR funding"
        breadcrumbs={[
          { label: "Dashboard", href: "/department/dashboard" },
          { label: "My Pitches", href: "/department/pitches" },
          { label: "Create Pitch" },
        ]}
      />

      {/* Success Message */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6"
          >
            <div className="bg-success-50 border border-success-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center text-success-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-success-900">Pitch Submitted Successfully!</h3>
                <p className="text-sm text-success-700">
                  Your pitch has been submitted with ID: PIT-2026-0056. Redirecting...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stepper */}
      <Card className="mb-6" hover={false}>
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors",
                      currentStep === step.number
                        ? "bg-primary-600 text-white"
                        : currentStep > step.number
                        ? "bg-success-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        currentStep >= step.number ? "text-gray-900" : "text-gray-400"
                      )}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-16 sm:w-24 h-0.5 mx-2 sm:mx-4",
                      currentStep > step.number ? "bg-success-500" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card hover={false}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900">
            {steps[currentStep - 1].title}
          </h3>
          <p className="text-sm text-gray-500">{steps[currentStep - 1].description}</p>
        </CardHeader>
        
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <Input
                    label="Pitch Title"
                    required
                    placeholder="e.g., School Infrastructure Development"
                    value={formData.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                    error={touched.title ? errors.title : undefined}
                  />
                  
                  <TextArea
                    label="Description"
                    required
                    rows={5}
                    placeholder="Describe the development need in detail..."
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    error={touched.description ? errors.description : undefined}
                    help="Minimum 50 characters"
                  />

                  <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Info size={18} className="text-primary-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-primary-900">Tips for a good pitch</p>
                        <ul className="text-sm text-primary-700 mt-1 list-disc list-inside">
                          <li>Be specific about the development need</li>
                          <li>Include expected outcomes and beneficiaries</li>
                          <li>Mention any previous CSR work in the area</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Location & Sector */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                      label="District"
                      required
                      options={districts}
                      value={formData.district}
                      onChange={(e) => handleChange("district", e.target.value)}
                      error={touched.district ? errors.district : undefined}
                    />
                    
                    <Select
                      label="Sector"
                      required
                      options={sectors}
                      value={formData.sector}
                      onChange={(e) => handleChange("sector", e.target.value)}
                      error={touched.sector ? errors.sector : undefined}
                    />
                  </div>
                  
                  <Input
                    label="Specific Location"
                    required
                    placeholder="e.g., Village XYZ, Taluka ABC"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    error={touched.location ? errors.location : undefined}
                  />

                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <MapPin size={32} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Map integration placeholder</p>
                      <p className="text-xs text-gray-400">Pin exact location on map</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Budget & Timeline */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                      label="Budget Range"
                      required
                      options={budgetRanges}
                      value={formData.budgetRange}
                      onChange={(e) => handleChange("budgetRange", e.target.value)}
                      error={touched.budgetRange ? errors.budgetRange : undefined}
                    />
                    
                    <Input
                      label="Estimated Cost (₹)"
                      required
                      type="number"
                      placeholder="e.g., 2500000"
                      value={formData.estimatedCost}
                      onChange={(e) => handleChange("estimatedCost", e.target.value)}
                      error={touched.estimatedCost ? errors.estimatedCost : undefined}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Project Duration (in months)"
                      required
                      type="number"
                      placeholder="e.g., 12"
                      value={formData.duration}
                      onChange={(e) => handleChange("duration", e.target.value)}
                      error={touched.duration ? errors.duration : undefined}
                    />
                    
                    <Input
                      label="Expected Beneficiaries"
                      required
                      type="number"
                      placeholder="e.g., 500"
                      value={formData.beneficiaries}
                      onChange={(e) => handleChange("beneficiaries", e.target.value)}
                      error={touched.beneficiaries ? errors.beneficiaries : undefined}
                    />
                  </div>

                  <div className="bg-warning-50 border border-warning-100 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={18} className="text-warning-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-warning-900">Budget Guidelines</p>
                        <p className="text-sm text-warning-700 mt-1">
                          Ensure your budget aligns with CSR Rules 2014 and Schedule VII activities. 
                          Large budgets may require additional documentation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review & Submit */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Pitch Summary</h4>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm text-gray-500">Title</dt>
                        <dd className="font-medium text-gray-900">{formData.title}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Sector</dt>
                        <dd className="font-medium text-gray-900">
                          {sectors.find(s => s.value === formData.sector)?.label}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">District</dt>
                        <dd className="font-medium text-gray-900">
                          {districts.find(d => d.value === formData.district)?.label}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Estimated Cost</dt>
                        <dd className="font-medium text-gray-900">
                          ₹{Number(formData.estimatedCost).toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Duration</dt>
                        <dd className="font-medium text-gray-900">{formData.duration} months</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-gray-500">Beneficiaries</dt>
                        <dd className="font-medium text-gray-900">{formData.beneficiaries}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <dt className="text-sm text-gray-500 mb-2">Description</dt>
                      <dd className="text-sm text-gray-700">{formData.description}</dd>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload size={32} className="text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-700">Upload Supporting Documents</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Drag and drop files here, or click to browse
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      Supported: PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
                    </p>
                  </div>

                  <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-success-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-success-900">Ready to Submit</p>
                        <p className="text-sm text-success-700 mt-1">
                          By submitting, you confirm that all information provided is accurate and 
                          the pitch aligns with your department's development priorities.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>

        <CardFooter className="flex justify-between border-t border-gray-100 pt-6">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                <ChevronLeft size={16} className="mr-1" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/department/pitches")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            
            {currentStep < 4 ? (
              <Button onClick={handleNext}>
                Next Step
                <ChevronLeft size={16} className="ml-1 rotate-180" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                loading={isSubmitting}
              >
                <Send size={16} className="mr-2" />
                Submit Pitch
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
}
