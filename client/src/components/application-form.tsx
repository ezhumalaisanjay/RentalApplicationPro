import React from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SignaturePad } from "@/components/ui/signature-pad";
import { DatePicker } from "@/components/ui/date-picker";
import { FinancialSection } from "./financial-section";
import { DocumentSection } from "./document-section";
import { LegalQuestions } from "./legal-questions";
import { SupportingDocuments } from "./supporting-documents";
import { PDFGenerator } from "@/lib/pdf-generator";
import { Download, FileText, Save, Users, UserCheck, CalendarDays, Shield, FolderOpen, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ApplicationInstructions from "./application-instructions";
import { useRef } from "react";
import { type EncryptedFile, validateEncryptedData, createEncryptedDataSummary } from "@/lib/file-encryption";

const applicationSchema = z.object({
  // Application Info
  buildingAddress: z.string().optional(),
  apartmentNumber: z.string().optional(),
  moveInDate: z.date().optional(),
  monthlyRent: z.number().optional(),
  apartmentType: z.string().optional(),
  howDidYouHear: z.string().optional(),

  // Primary Applicant
  applicantName: z.string().optional(),
  applicantDob: z.date().optional(),
  applicantSsn: z.string().min(9, 'SSN is required').regex(/^\d{3}-\d{2}-\d{4}$/, 'Invalid SSN format (XXX-XX-XXXX)'),
  applicantPhone: z.string().min(10, 'Phone is required').regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Invalid phone format ((XXX) XXX-XXXX)'),
  applicantEmail: z.string().optional(),
  applicantLicense: z.string().optional(),
  applicantLicenseState: z.string().optional(),
  applicantAddress: z.string().optional(),
  applicantCity: z.string().optional(),
  applicantState: z.string().optional(),
  applicantZip: z.string().optional(),
  applicantLengthAtAddress: z.string().optional(),
  applicantLandlordName: z.string().optional(),
  applicantCurrentRent: z.number().optional(),
  applicantReasonForMoving: z.string().optional(),

  // Conditional fields
  hasCoApplicant: z.boolean().default(false),
  hasGuarantor: z.boolean().default(false),

  // Legal Questions
  hasBankruptcy: z.boolean().default(false),
  bankruptcyDetails: z.string().optional(),
  hasEviction: z.boolean().default(false),
  evictionDetails: z.string().optional(),
  hasCriminalHistory: z.boolean().default(false),
  criminalHistoryDetails: z.string().optional(),
  hasPets: z.boolean().default(false),
  petDetails: z.string().optional(),
  smokingStatus: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

const STEPS = [
  { id: 0, title: "Instructions" },
  { id: 1, title: "Application Info", icon: FileText },
  { id: 2, title: "Primary Applicant", icon: UserCheck },
  { id: 3, title: "Financial Info", icon: CalendarDays },
  { id: 4, title: "Documents", icon: FolderOpen },
  { id: 5, title: "Other Occupants", icon: Users }, // New dedicated step
  { id: 6, title: "Additional People", icon: Users },
  { id: 7, title: "Legal Questions", icon: Shield },
  { id: 8, title: "Digital Signatures", icon: Check },
];

export function ApplicationForm() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({
    application: {},
    applicant: {},
    coApplicant: {},
    guarantor: {},
    occupants: [], // Each occupant: { name, relationship, dob, ssn, age, sex }
  });
  const [signatures, setSignatures] = useState<any>({});
  const [documents, setDocuments] = useState<any>({});
  const [encryptedDocuments, setEncryptedDocuments] = useState<any>({});
  const [hasCoApplicant, setHasCoApplicant] = useState(false);
  const [hasGuarantor, setHasGuarantor] = useState(false);
  const [sameAddressCoApplicant, setSameAddressCoApplicant] = useState(false);
  const [sameAddressGuarantor, setSameAddressGuarantor] = useState(false);
  const pdfContentRef = useRef<HTMLDivElement>(null);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      // Application Info
      buildingAddress: "",
      apartmentNumber: "",
      moveInDate: undefined as any,
      monthlyRent: 0,
      apartmentType: "",
      howDidYouHear: "",

      // Primary Applicant
      applicantName: "",
      applicantDob: undefined as any,
      applicantSsn: "",
      applicantPhone: "",
      applicantEmail: "",
      applicantLicense: "",
      applicantLicenseState: "",
      applicantAddress: "",
      applicantCity: "",
      applicantState: "",
      applicantZip: "",
      applicantLengthAtAddress: "",
      applicantLandlordName: "",
      applicantCurrentRent: 0,
      applicantReasonForMoving: "",

      // Conditional fields
      hasCoApplicant: false,
      hasGuarantor: false,

      // Legal Questions
      hasBankruptcy: false,
      bankruptcyDetails: "",
      hasEviction: false,
      evictionDetails: "",
      hasCriminalHistory: false,
      criminalHistoryDetails: "",
      hasPets: false,
      petDetails: "",
      smokingStatus: "",
    },
  });

  const updateFormData = (section: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleDocumentChange = (person: string, documentType: string, files: File[]) => {
    setDocuments((prev: any) => ({
      ...prev,
      [person]: {
        ...prev[person],
        [documentType]: files,
      },
    }));
  };

  const handleEncryptedDocumentChange = (person: string, documentType: string, encryptedFiles: EncryptedFile[]) => {
    setEncryptedDocuments((prev: any) => ({
      ...prev,
      [person]: {
        ...prev[person],
        [documentType]: encryptedFiles,
      },
    }));
  };

  const handleSignatureChange = (person: string, signature: string) => {
    setSignatures((prev: any) => ({
      ...prev,
      [person]: signature,
    }));
  };

  const generatePDF = () => {
    const pdfGenerator = new PDFGenerator();
    const pdfData = pdfGenerator.generatePDF({
      application: formData.application,
      applicant: formData.applicant,
      coApplicant: hasCoApplicant ? formData.coApplicant : undefined,
      guarantor: hasGuarantor ? formData.guarantor : undefined,
      signatures,
    });
    const link = document.createElement('a');
    link.href = pdfData;
    link.download = `rental-application-${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    toast({
      title: "PDF Generated",
      description: "Your rental application PDF has been downloaded.",
    });
  };

  const saveDraft = () => {
    localStorage.setItem('rentalApplicationDraft', JSON.stringify({
      formData,
      signatures,
      hasCoApplicant,
      hasGuarantor,
      sameAddressCoApplicant,
      sameAddressGuarantor,
      currentStep,
    }));

    toast({
      title: "Draft Saved",
      description: "Your application has been saved as a draft.",
    });
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const uploadEncryptedFiles = async (encryptedFiles: EncryptedFile[]) => {
    try {

      
      const response = await fetch('/api/upload-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: encryptedFiles,
          applicationId: Date.now(), // You can use actual application ID when available
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response error:', response.status, response.statusText);
        console.error('Error response body:', errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Files uploaded successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to upload files:', error);
      throw error;
    }
  };

  const onSubmit = async (data: ApplicationFormData) => {
    // Ensure all required fields are present and valid
    const requiredFields: (keyof ApplicationFormData)[] = [
      'buildingAddress',
      'apartmentNumber',
      'monthlyRent',
      'apartmentType',
      'applicantName',
      'applicantSsn', // now required
      'applicantPhone', // now required
      'applicantEmail',
      'applicantAddress',
      'applicantCity',
      'applicantState',
      'applicantZip',
    ];
    let missingFields = [];
    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        (typeof data[field] === 'string' && data[field].trim() === '') ||
        (field === 'monthlyRent' && (!data[field] || isNaN(data[field] as any) || (data[field] as any) <= 0))
      ) {
        missingFields.push(field);
      }
    }
    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.applicantEmail || '')) {
      missingFields.push('applicantEmail');
    }
    if (missingFields.length > 0) {
      toast({
        title: 'Missing or invalid fields',
        description: `Please fill out: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }
    try {
      console.log("Submitting application:", { ...data, formData, signatures, documents, encryptedDocuments });
      console.log("Encrypted documents state:", encryptedDocuments);
      console.log("Encrypted documents keys:", Object.keys(encryptedDocuments));

      // Upload all encrypted documents first
      const allEncryptedFiles: EncryptedFile[] = [];
      Object.values(encryptedDocuments).forEach((docFiles: any) => {
        if (Array.isArray(docFiles)) {
          allEncryptedFiles.push(...docFiles);
        }
      });

      let uploadedFiles = [];
      if (allEncryptedFiles.length > 0) {
        const uploadResult = await uploadEncryptedFiles(allEncryptedFiles);
        uploadedFiles = uploadResult.files || [];
      }

      // Transform form data to match database schema
      const transformedData: any = {
        // Application Info
        buildingAddress: data.buildingAddress,
        apartmentNumber: data.apartmentNumber,
        moveInDate: data.moveInDate ? new Date(data.moveInDate) : null,
        monthlyRent: data.monthlyRent,
        apartmentType: data.apartmentType,
        howDidYouHear: data.howDidYouHear,
        
        // Primary Applicant
        applicantName: data.applicantName,
        applicantDob: data.applicantDob ? new Date(data.applicantDob) : null,
        applicantSsn: data.applicantSsn || '',
        applicantPhone: data.applicantPhone || '',
        applicantEmail: data.applicantEmail,
        applicantLicense: data.applicantLicense,
        applicantLicenseState: data.applicantLicenseState,
        applicantAddress: data.applicantAddress,
        applicantCity: data.applicantCity,
        applicantState: data.applicantState,
        applicantZip: data.applicantZip,
        applicantLengthAtAddress: data.applicantLengthAtAddress,
        applicantLandlordName: data.applicantLandlordName,
        applicantCurrentRent: data.applicantCurrentRent,
        applicantReasonForMoving: data.applicantReasonForMoving,
        
        // Primary Applicant Financial (from formData)
        applicantEmployer: formData.applicant?.employer || null,
        applicantPosition: formData.applicant?.position || null,
        applicantEmploymentStart: formData.applicant?.employmentStart ? new Date(formData.applicant.employmentStart) : null,
        applicantIncome: formData.applicant?.income ? parseFloat(formData.applicant.income) : null,
        applicantOtherIncome: formData.applicant?.otherIncome ? parseFloat(formData.applicant.otherIncome) : null,
        applicantOtherIncomeSource: formData.applicant?.otherIncomeSource || null,
        applicantBankName: formData.applicant?.bankRecords?.[0]?.bankName || null,
        applicantAccountType: formData.applicant?.bankRecords?.[0]?.accountType || null,
        
        // Co-Applicant
        hasCoApplicant: hasCoApplicant,
        coApplicantName: formData.coApplicant?.name || null,
        coApplicantRelationship: formData.coApplicant?.relationship || null,
        coApplicantDob: formData.coApplicant?.dob ? new Date(formData.coApplicant.dob) : null,
        coApplicantSsn: formData.coApplicant?.ssn || null,
        coApplicantPhone: formData.coApplicant?.phone || null,
        coApplicantEmail: formData.coApplicant?.email || null,
        coApplicantSameAddress: sameAddressCoApplicant,
        coApplicantAddress: formData.coApplicant?.address || null,
        coApplicantCity: formData.coApplicant?.city || null,
        coApplicantState: formData.coApplicant?.state || null,
        coApplicantZip: formData.coApplicant?.zip || null,
        coApplicantLengthAtAddress: formData.coApplicant?.lengthAtAddress || null,
        
        // Co-Applicant Financial
        coApplicantEmployer: formData.coApplicant?.employer || null,
        coApplicantPosition: formData.coApplicant?.position || null,
        coApplicantEmploymentStart: formData.coApplicant?.employmentStart ? new Date(formData.coApplicant.employmentStart) : null,
        coApplicantIncome: formData.coApplicant?.income ? parseFloat(formData.coApplicant.income) : null,
        coApplicantOtherIncome: formData.coApplicant?.otherIncome ? parseFloat(formData.coApplicant.otherIncome) : null,
        coApplicantBankName: formData.coApplicant?.bankRecords?.[0]?.bankName || null,
        coApplicantAccountType: formData.coApplicant?.bankRecords?.[0]?.accountType || null,
        
        // Guarantor - only include if hasGuarantor is true
        hasGuarantor: hasGuarantor,
      };

      // Only add guarantor fields if hasGuarantor is true
      console.log('hasGuarantor value:', hasGuarantor);
      if (hasGuarantor) {
        console.log('Adding guarantor fields...');
        transformedData.guarantorName = formData.guarantor?.name || null;
        transformedData.guarantorRelationship = formData.guarantor?.relationship || null;
        transformedData.guarantorDob = formData.guarantor?.dob ? new Date(formData.guarantor.dob) : null;
        transformedData.guarantorSsn = formData.guarantor?.ssn || null;
        transformedData.guarantorPhone = formData.guarantor?.phone || null;
        transformedData.guarantorEmail = formData.guarantor?.email || null;
        transformedData.guarantorAddress = formData.guarantor?.address || null;
        transformedData.guarantorCity = formData.guarantor?.city || null;
        transformedData.guarantorState = formData.guarantor?.state || null;
        transformedData.guarantorZip = formData.guarantor?.zip || null;
        transformedData.guarantorLengthAtAddress = formData.guarantor?.lengthAtAddress || null;
        
        // Guarantor Financial
        transformedData.guarantorEmployer = formData.guarantor?.employer || null;
        transformedData.guarantorPosition = formData.guarantor?.position || null;
        transformedData.guarantorEmploymentStart = formData.guarantor?.employmentStart ? new Date(formData.guarantor.employmentStart) : null;
        transformedData.guarantorIncome = formData.guarantor?.income ? parseFloat(formData.guarantor.income) : null;
        transformedData.guarantorOtherIncome = formData.guarantor?.otherIncome ? parseFloat(formData.guarantor.otherIncome) : null;
        transformedData.guarantorBankName = formData.guarantor?.bankRecords?.[0]?.bankName || null;
        transformedData.guarantorAccountType = formData.guarantor?.bankRecords?.[0]?.accountType || null;
        transformedData.guarantorSignature = signatures.guarantor || null;
      } else {
        console.log('Skipping guarantor fields - hasGuarantor is false');
      }

      // Add signatures for applicant and co-applicant
      transformedData.applicantSignature = signatures.applicant || null;
      transformedData.coApplicantSignature = signatures.coApplicant || null;
      
      // Legal Questions
      transformedData.hasBankruptcy = data.hasBankruptcy;
      transformedData.bankruptcyDetails = data.bankruptcyDetails;
      transformedData.hasEviction = data.hasEviction;
      transformedData.evictionDetails = data.evictionDetails;
      transformedData.hasCriminalHistory = data.hasCriminalHistory;
      transformedData.criminalHistoryDetails = data.criminalHistoryDetails;
      transformedData.hasPets = data.hasPets;
      transformedData.petDetails = data.petDetails;
      transformedData.smokingStatus = data.smokingStatus;
      
      // Documents
      transformedData.documents = JSON.stringify(uploadedFiles);
      
      // Encrypted Data
      const encryptedDataPayload = {
        documents: encryptedDocuments,
        allEncryptedFiles: allEncryptedFiles,
        encryptionTimestamp: new Date().toISOString(),
        encryptionVersion: '1.0.0',
        totalEncryptedFiles: allEncryptedFiles.length,
        documentTypes: Object.keys(encryptedDocuments)
      };
      
      console.log('Encrypted data payload before validation:', encryptedDataPayload);
      
      // Validate encrypted data before submission (only if there are encrypted files)
      if (allEncryptedFiles.length > 0 && !validateEncryptedData(encryptedDataPayload)) {
        throw new Error('Invalid encrypted data structure');
      }
      
      const encryptedDataSummary = createEncryptedDataSummary(encryptedDataPayload);
      console.log('Encrypted data summary:', encryptedDataSummary);
      
      transformedData.encryptedData = JSON.stringify(encryptedDataPayload);
      
      console.log('Final transformed data includes encryptedData:', !!transformedData.encryptedData);
      console.log('Encrypted data length:', transformedData.encryptedData ? transformedData.encryptedData.length : 0);
      
      console.log('Transformed application data:', JSON.stringify(transformedData, null, 2));
      console.log('Current window location:', window.location.href);
      console.log('Making request to:', window.location.origin + '/api/submit-application');
      
      const requestBody = {
        applicationData: transformedData,
        files: uploadedFiles,
        signatures: signatures,
        encryptedData: {
          documents: encryptedDocuments,
          allEncryptedFiles: allEncryptedFiles
        }
      };
      
      console.log('Request body being sent:', JSON.stringify(requestBody, null, 2));
      console.log('Request body encryptedData:', requestBody.encryptedData);
      
      const submissionResponse = await fetch('/api/submit-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!submissionResponse.ok) {
        const errorText = await submissionResponse.text();
        console.error('Submission response error:', submissionResponse.status, submissionResponse.statusText);
        console.error('Error response body:', errorText);
        throw new Error(`Submission failed: ${submissionResponse.status} ${submissionResponse.statusText}`);
      }

      const submissionResult = await submissionResponse.json();
      console.log('Application submitted successfully:', submissionResult);

      toast({
        title: "Application Submitted",
        description: "Your rental application has been submitted successfully and sent to our processing system.",
      });

      generatePDF();
    } catch (error) {
      console.error('Failed to submit application:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyAddressToCoApplicant = () => {
    if (sameAddressCoApplicant) {
      const applicantAddress = formData.applicant;
      updateFormData('coApplicant', 'address', applicantAddress.address);
      updateFormData('coApplicant', 'city', applicantAddress.city);
      updateFormData('coApplicant', 'state', applicantAddress.state);
      updateFormData('coApplicant', 'zip', applicantAddress.zip);
      updateFormData('coApplicant', 'landlordName', applicantAddress.landlordName);
      updateFormData('coApplicant', 'currentRent', applicantAddress.currentRent);
      updateFormData('coApplicant', 'lengthAtAddress', applicantAddress.lengthAtAddress);
    }
  };

  const copyAddressToGuarantor = () => {
    if (sameAddressGuarantor) {
      const applicantAddress = formData.applicant;
      updateFormData('guarantor', 'address', applicantAddress.address);
      updateFormData('guarantor', 'city', applicantAddress.city);
      updateFormData('guarantor', 'state', applicantAddress.state);
      updateFormData('guarantor', 'zip', applicantAddress.zip);
      updateFormData('guarantor', 'landlordName', applicantAddress.landlordName);
      updateFormData('guarantor', 'currentRent', applicantAddress.currentRent);
      updateFormData('guarantor', 'lengthAtAddress', applicantAddress.lengthAtAddress);
    }
  };



  // Refactor renderStep to accept a stepIdx argument
  const renderStep = (stepIdx = currentStep) => {
    switch (stepIdx) {
      case 0:
        return <ApplicationInstructions onNext={nextStep} />;
      case 1:
        return (
          <Card className="form-section">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Application Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="buildingAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter building address" 
                          {...field} 
                          className="input-field"
                          onChange={(e) => {
                            field.onChange(e);
                            updateFormData('application', 'buildingAddress', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apartmentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apartment #</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 5A" 
                          {...field}
                          className="input-field"
                          onChange={(e) => {
                            field.onChange(e);
                            updateFormData('application', 'apartmentNumber', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moveInDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Move-in Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={(date) => {
                            field.onChange(date);
                            updateFormData('application', 'moveInDate', date); // Store Date object, not string
                          }}
                          placeholder="Select move-in date"
                          disabled={(date) => date < new Date()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="monthlyRent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rent ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          {...field}
                          className="input-field"
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            field.onChange(value);
                            updateFormData('application', 'monthlyRent', value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apartmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apartment Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          updateFormData('application', 'apartmentType', value);
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select apartment type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="1br">1 Bedroom</SelectItem>
                          <SelectItem value="2br">2 Bedroom</SelectItem>
                          <SelectItem value="3br">3 Bedroom</SelectItem>
                          <SelectItem value="4br">4 Bedroom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <Label className="text-base font-medium">How did you hear about us?</Label>
                <div className="flex flex-wrap gap-4 mt-3">
                  {['Building Sign', 'Craigslist', 'Broker', 'Other'].map((option) => (
                    <div key={option} className="flex items-center space-x-2 checkbox-container">
                      <Checkbox 
                        id={option}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFormData('application', 'howDidYouHear', option);
                          }
                        }}
                      />
                      <Label htmlFor={option} className="text-sm font-normal">{option}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card className="form-section">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserCheck className="w-5 h-5 mr-2" />
                Primary Applicant Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <FormField
                    control={form.control}
                    name="applicantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter full name" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              field.onChange(e);
                              updateFormData('applicant', 'name', e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="applicantDob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={(date) => {
                            field.onChange(date);
                            updateFormData('applicant', 'dob', date);
                          }}
                          placeholder="Select date of birth"
                          disabled={(date) => date > new Date()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="applicantSsn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Social Security Number <span style={{color: 'red'}}>*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="XXX-XX-XXXX" 
                          {...field}
                          className="input-field"
                          onChange={(e) => {
                            field.onChange(e);
                            updateFormData('applicant', 'ssn', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicantPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number <span style={{color: 'red'}}>*</span></FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(XXX) XXX-XXXX" 
                          {...field}
                          className="input-field"
                          onChange={(e) => {
                            field.onChange(e);
                            updateFormData('applicant', 'phone', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicantEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="email@example.com" 
                          {...field}
                          className="input-field"
                          onChange={(e) => {
                            field.onChange(e);
                            updateFormData('applicant', 'email', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="applicantLicense"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver's License Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="License number" 
                          {...field}
                          className="input-field"
                          onChange={(e) => {
                            field.onChange(e);
                            updateFormData('applicant', 'license', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicantLicenseState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License State</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., NY" 
                          {...field}
                          className="input-field"
                          onChange={(e) => {
                            field.onChange(e);
                            updateFormData('applicant', 'licenseState', e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Current Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="applicantAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter street address" 
                              {...field}
                              className="input-field"
                              onChange={(e) => {
                                field.onChange(e);
                                updateFormData('applicant', 'address', e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="applicantCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter city" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              field.onChange(e);
                              updateFormData('applicant', 'city', e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., NY" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              field.onChange(e);
                              updateFormData('applicant', 'state', e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantZip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="XXXXX" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              field.onChange(e);
                              updateFormData('applicant', 'zip', e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantLengthAtAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Length at Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 2 years 3 months" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              field.onChange(e);
                              updateFormData('applicant', 'lengthAtAddress', e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 3:
        return (
          <FinancialSection 
            title="Primary Applicant Financial Information"
            person="applicant"
            formData={formData}
            updateFormData={updateFormData}
          />
        );

      case 4:
        return (
          <DocumentSection 
            title="Primary Applicant Documents"
            person="applicant"
            onDocumentChange={handleDocumentChange}
            onEncryptedDocumentChange={handleEncryptedDocumentChange}
          />
        );

      case 5:
        return (
          <div className="space-y-8">
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Additional People
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="hasCoApplicant"
                    checked={hasCoApplicant}
                    onCheckedChange={(checked) => {
                      setHasCoApplicant(checked as boolean);
                      form.setValue('hasCoApplicant', checked as boolean);
                    }}
                  />
                  <Label htmlFor="hasCoApplicant" className="text-base font-medium">
                    Add Co-Applicant
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="hasGuarantor"
                    checked={hasGuarantor}
                    onCheckedChange={(checked) => {
                      setHasGuarantor(checked as boolean);
                      form.setValue('hasGuarantor', checked as boolean);
                    }}
                  />
                  <Label htmlFor="hasGuarantor" className="text-base font-medium">
                    Add Guarantor
                  </Label>
                </div>
              </CardContent>
            </Card>

            {hasCoApplicant && (
              <Card className="form-section border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-700 dark:text-green-400">
                    <UserCheck className="w-5 h-5 mr-2" />
                    Co-Applicant Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input 
                        placeholder="Enter full name"
                        className="input-field"
                        onChange={(e) => updateFormData('coApplicant', 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Relationship to Primary Applicant</Label>
                      <Select onValueChange={(value) => updateFormData('coApplicant', 'relationship', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="roommate">Roommate</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Date of Birth *</Label>
                      <DatePicker
                        onChange={(date) => updateFormData('coApplicant', 'dob', date)}
                        placeholder="Select date of birth"
                        disabled={(date) => date > new Date()}
                      />
                    </div>
                    <div>
                      <Label>Social Security Number *</Label>
                      <Input 
                        placeholder="XXX-XX-XXXX"
                        className="input-field"
                        onChange={(e) => updateFormData('coApplicant', 'ssn', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Phone Number *</Label>
                      <Input 
                        placeholder="(XXX) XXX-XXXX"
                        className="input-field"
                        onChange={(e) => updateFormData('coApplicant', 'phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Email Address *</Label>
                    <Input 
                      type="email"
                      placeholder="email@example.com"
                      className="input-field"
                      onChange={(e) => updateFormData('coApplicant', 'email', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="sameAddressCoApplicant"
                      checked={sameAddressCoApplicant}
                      onCheckedChange={(checked) => {
                        setSameAddressCoApplicant(checked as boolean);
                        if (checked) {
                          copyAddressToCoApplicant();
                        }
                      }}
                    />
                    <Label htmlFor="sameAddressCoApplicant" className="text-sm">
                      Same address as primary applicant
                    </Label>
                  </div>

                  {!sameAddressCoApplicant && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">Current Address</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label>Street Address *</Label>
                          <Input 
                            placeholder="Enter street address"
                            className="input-field"
                            onChange={(e) => updateFormData('coApplicant', 'address', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>City *</Label>
                          <Input 
                            placeholder="Enter city"
                            className="input-field"
                            onChange={(e) => updateFormData('coApplicant', 'city', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>State *</Label>
                          <Input 
                            placeholder="e.g., NY"
                            className="input-field"
                            onChange={(e) => updateFormData('coApplicant', 'state', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>ZIP Code *</Label>
                          <Input 
                            placeholder="XXXXX"
                            className="input-field"
                            onChange={(e) => updateFormData('coApplicant', 'zip', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Length at Address</Label>
                          <Input 
                            placeholder="e.g., 2 years 3 months"
                            className="input-field"
                            onChange={(e) => updateFormData('coApplicant', 'lengthAtAddress', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <FinancialSection 
                    title="Co-Applicant Financial Information"
                    person="coApplicant"
                    formData={formData}
                    updateFormData={updateFormData}
                  />

                  <DocumentSection 
                    title="Co-Applicant Documents"
                    person="coApplicant"
                    onDocumentChange={handleDocumentChange}
                    onEncryptedDocumentChange={handleEncryptedDocumentChange}
                  />
                </CardContent>
              </Card>
            )}

            {hasGuarantor && (
              <Card className="form-section border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-purple-700 dark:text-purple-400">
                    <UserCheck className="w-5 h-5 mr-2" />
                    Guarantor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input 
                        placeholder="Enter full name"
                        className="input-field"
                        onChange={(e) => updateFormData('guarantor', 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Relationship to Applicant(s) *</Label>
                      <Select onValueChange={(value) => updateFormData('guarantor', 'relationship', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="family">Family Member</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="employer">Employer</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Date of Birth *</Label>
                      <DatePicker
                        onChange={(date) => updateFormData('guarantor', 'dob', date)}
                        placeholder="Select date of birth"
                        disabled={(date) => date > new Date()}
                      />
                    </div>
                    <div>
                      <Label>Social Security Number *</Label>
                      <Input 
                        placeholder="XXX-XX-XXXX"
                        className="input-field"
                        onChange={(e) => updateFormData('guarantor', 'ssn', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Phone Number *</Label>
                      <Input 
                        placeholder="(XXX) XXX-XXXX"
                        className="input-field"
                        onChange={(e) => updateFormData('guarantor', 'phone', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Email Address *</Label>
                    <Input 
                      type="email"
                      placeholder="email@example.com"
                      className="input-field"
                      onChange={(e) => updateFormData('guarantor', 'email', e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label>Street Address *</Label>
                        <Input 
                          placeholder="Enter street address"
                          className="input-field"
                          onChange={(e) => updateFormData('guarantor', 'address', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>City *</Label>
                        <Input 
                          placeholder="Enter city"
                          className="input-field"
                          onChange={(e) => updateFormData('guarantor', 'city', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>State *</Label>
                        <Input 
                          placeholder="e.g., NY"
                          className="input-field"
                          onChange={(e) => updateFormData('guarantor', 'state', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>ZIP Code *</Label>
                        <Input 
                          placeholder="XXXXX"
                          className="input-field"
                          onChange={(e) => updateFormData('guarantor', 'zip', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Length at Address</Label>
                        <Input 
                          placeholder="e.g., 2 years 3 months"
                          className="input-field"
                          onChange={(e) => updateFormData('guarantor', 'lengthAtAddress', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <FinancialSection 
                    title="Guarantor Financial Information"
                    person="guarantor"
                    formData={formData}
                    updateFormData={updateFormData}
                  />

                  <DocumentSection 
                    title="Guarantor Documents"
                    person="guarantor"
                    onDocumentChange={handleDocumentChange}
                    onEncryptedDocumentChange={handleEncryptedDocumentChange}
                  />
                </CardContent>
              </Card>
            )}

            {stepIdx === 5 && (
              <Card className="form-section border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-blue-700 dark:text-blue-400">
                    <Users className="w-5 h-5 mr-2" />
                    Other Occupants (Not Applicants)
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">List any other people who will be living in the apartment</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {formData.occupants && formData.occupants.length > 0 && formData.occupants.map((occ: any, idx: number) => (
                    <div key={idx} className="border rounded p-4 mb-2 bg-gray-50">
                      <div className="font-semibold mb-2">Occupant {idx + 1}</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={occ.name || ''}
                            onChange={e => {
                              const updated = [...formData.occupants];
                              updated[idx].name = e.target.value;
                              setFormData((prev: any) => ({ ...prev, occupants: updated }));
                            }}
                            placeholder="Full name"
                          />
                        </div>
                        <div>
                          <Label>Relationship</Label>
                          <Input
                            value={occ.relationship || ''}
                            onChange={e => {
                              const updated = [...formData.occupants];
                              updated[idx].relationship = e.target.value;
                              setFormData((prev: any) => ({ ...prev, occupants: updated }));
                            }}
                            placeholder="Relationship"
                          />
                        </div>
                        <div>
                          <Label>Date of Birth</Label>
                          <DatePicker
                            value={occ.dob || undefined}
                            onChange={date => {
                              const updated = [...formData.occupants];
                              updated[idx].dob = date;
                              setFormData((prev: any) => ({ ...prev, occupants: updated }));
                            }}
                            placeholder="dd-mm-yyyy"
                          />
                        </div>
                        <div>
                          <Label>Social Security #</Label>
                          <Input
                            value={occ.ssn || ''}
                            onChange={e => {
                              const updated = [...formData.occupants];
                              updated[idx].ssn = e.target.value;
                              setFormData((prev: any) => ({ ...prev, occupants: updated }));
                            }}
                            placeholder="XXX-XX-XXXX"
                          />
                        </div>
                        <div>
                          <Label>Age</Label>
                          <Input
                            type="number"
                            value={occ.age || ''}
                            onChange={e => {
                              const updated = [...formData.occupants];
                              updated[idx].age = e.target.value;
                              setFormData((prev: any) => ({ ...prev, occupants: updated }));
                            }}
                            placeholder="Age"
                          />
                        </div>
                        <div>
                          <Label>Sex</Label>
                          <Select
                            onValueChange={value => {
                              const updated = [...formData.occupants];
                              updated[idx].sex = value;
                              setFormData((prev: any) => ({ ...prev, occupants: updated }));
                            }}
                            value={occ.sex || ''}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Button type="button" variant="destructive" onClick={() => {
                          const updated = formData.occupants.filter((_: any, i: number) => i !== idx);
                          setFormData((prev: any) => ({ ...prev, occupants: updated }));
                        }}>Remove</Button>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => {
                    setFormData((prev: any) => ({ ...prev, occupants: [...(prev.occupants || []), { name: '', relationship: '', dob: undefined, ssn: '', age: '', sex: '' }] }));
                  }}>Add Another Occupant</Button>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 6:
        return (
          <Card className="form-section">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Legal Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LegalQuestions 
                formData={formData.application}
                updateFormData={(field, value) => updateFormData('application', field, value)}
              />
            </CardContent>
          </Card>
        );

      case 7:
        return (
          <div className="space-y-8">
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FolderOpen className="w-5 h-5 mr-2" />
                  Supporting Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SupportingDocuments 
                  formData={formData}
                  onDocumentChange={(documentType, files) => {
                    setDocuments((prev: any) => ({
                      ...prev,
                      [documentType]: files,
                    }));
                  }}
                  onEncryptedDocumentChange={(documentType, encryptedFiles) => {
                    console.log('Encrypted document change:', documentType, encryptedFiles);
                    setEncryptedDocuments((prev: any) => ({
                      ...prev,
                      [documentType]: encryptedFiles,
                    }));
                  }}
                />

              </CardContent>
            </Card>
          </div>
        );

      case 8:
        return (
          <div className="space-y-8">
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Digital Signatures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="mb-6">
                  <h3 className="font-bold uppercase text-sm mb-2">PLEASE READ CAREFULLY BEFORE SIGNING</h3>
                  <p className="text-xs text-gray-700 whitespace-pre-line">
                    The Landlord will in no event be bound, nor will possession be given, unless and until a lease executed by the Landlord has been delivered to the Tenant. The applicant and his/her references must be satisfactory to the Landlord. Please be advised that the date on page one of the lease is not your move-in date. Your move-in date will be arranged with you after you have been approved. No representations or agreements by agents, brokers or others are binding on the Landlord or Agent unless included in the written lease proposed to be executed. I hereby warrant that all my representations set forth herein are true. I recognize the truth of the information contained herein is essential. I further represent that I am not renting a room or an apartment under any other name, nor have I ever been dispossessed from any apartment, nor am I now being dispossessed. I represent that I am over 18 years of age. I have been advised that I have the right, under section 8068 of the Fair Credit Reporting Act, to make a written request, directed to the appropriate credit reporting agency, within reasonable time, for a complete and accurate disclosure of the nature and scope of any credit investigation. I understand that upon submission, this application and all related documents become the property of the Landlord, and will not be returned to me under any circumstances. I authorize the Landlord, Agent and credit reporting agency to obtain a consumer credit report on me and to verify any information on this application with regard to my employment history, current and prior tenancies, bank accounts, and all other information that the Landlord deems pertinent to my obtaining residency. I understand that I shall not be permitted to receive or review my application file or my credit consumer report. I authorize banks, financial institutions, landlords, business associates, credit bureaus, attorneys, accountants and other persons or institutions with whom I am acquainted to furnish any and all information regarding myself. This authorization also applies to any update reports which may be ordered as needed. A photocopy or fax of this authorization shall be accepted with the same authority as this original. I will present any other information required by the Landlord or Agent in connection with the lease contemplated herein. I understand that the application fee is non-refundable. The Civil Rights Act of 1968, as amended by the Fair Housing Amendments Act of 1988, prohibits discrimination in the rental of housing based on race, color, religion, sex, handicap, familial status or national origin. The Federal Agency, which administers compliance with this law, is the U.S. Department of Housing and Urban Development.
                  </p>
                </div>
                <div>
                  <Label className="text-base font-medium">Primary Applicant Signature *</Label>
                  <SignaturePad 
                    onSignatureChange={(signature) => handleSignatureChange('applicant', signature)}
                    className="mt-2"
                  />
                </div>

                {hasCoApplicant && (
                  <div>
                    <Label className="text-base font-medium">Co-Applicant Signature *</Label>
                    <SignaturePad 
                      onSignatureChange={(signature) => handleSignatureChange('coApplicant', signature)}
                      className="mt-2"
                    />
                  </div>
                )}

                {hasGuarantor && (
                  <div>
                    <Label className="text-base font-medium">Guarantor Signature *</Label>
                    <SignaturePad 
                      onSignatureChange={(signature) => handleSignatureChange('guarantor', signature)}
                      className="mt-2"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 sm:bg-gradient-to-br sm:from-blue-50 sm:to-gray-100 sm:dark:from-gray-900 sm:dark:to-gray-800">
      {/* Header - Hidden */}
      {/* <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Liberty Place Property Management</h1>
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p className="break-words">122 East 42nd Street, Suite 1903, New York, NY 10168</p>
              <p className="break-words">Tel: (646) 545-6700 | Fax: (646) 304-2255</p>
              <p className="text-blue-600 dark:text-blue-400 font-medium">Rental Application Form</p>
            </div>
          </div>
        </div>
      </header> */}

      <div className="w-full max-w-4xl mx-auto px-3 py-4 sm:px-4 sm:py-8">
        {/* Progress Steps */}
        <div className="mb-4 sm:mb-8">
          <div className="flex items-center justify-between mb-2 sm:mb-4 overflow-x-auto">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => goToStep(step.id)}
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-colors flex-shrink-0 ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-white border-gray-300 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      step.icon ? React.createElement(step.icon, { className: "w-4 h-4 sm:w-5 sm:h-5" }) : step.title[0]
                    )}
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 sm:mx-2 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Step title and progress indicator removed */}
        </div>

        {/* Action Buttons - Removed */}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-8">
            {/* Current Step Content */}
            <div className="form-container">
              {renderStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 sm:pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center text-xs sm:text-sm px-2 sm:px-4 py-2"
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </Button>

              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Step {currentStep} of {STEPS.length}
              </div>

              {currentStep === STEPS.length - 1 ? (
                <Button
                  type="button"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-8 py-2 sm:py-3 text-sm sm:text-base font-semibold"
                  onClick={() => onSubmit(form.getValues())}
                >
                  <span className="hidden sm:inline">Submit Application</span>
                  <span className="sm:hidden">Submit</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm px-3 sm:px-6 py-2"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 sm:ml-2" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}