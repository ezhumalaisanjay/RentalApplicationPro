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
import { WebhookService } from "@/lib/webhook-service";


const applicationSchema = z.object({
  // Application Info
  buildingAddress: z.string().optional(),
  apartmentNumber: z.string().optional(),
  moveInDate: z.date({
    required_error: "Move-in date is required",
    invalid_type_error: "Please select a valid move-in date",
  }),
  monthlyRent: z.number().optional(),
  apartmentType: z.string().optional(),
  howDidYouHear: z.string().optional(),

  // Primary Applicant
  applicantName: z.string().min(1, "Full name is required"),
  applicantDob: z.date({
    required_error: "Date of birth is required",
    invalid_type_error: "Please select a valid date of birth",
  }),
  applicantSsn: z.string().optional(),
  applicantPhone: z.string().optional(),
  applicantEmail: z.string().optional(),
  applicantLicense: z.string().optional(),
  applicantLicenseState: z.string().optional(),
  applicantAddress: z.string().optional(),
  applicantCity: z.string().optional(),
  applicantState: z.string().optional(),
  applicantZip: z.string().optional(),
  applicantLengthAtAddress: z.string().optional(),
  applicantLengthYears: z.number().optional(),
  applicantLengthMonths: z.number().optional(),
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
  { id: 4, title: "Supporting Documents", icon: FolderOpen },
  { id: 5, title: "Other Occupants", icon: Users },
  { id: 6, title: "Guarantor Documents", icon: Shield },
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
  const [referenceId] = useState(() => `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [applicationId] = useState(() => `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [uploadedFilesMetadata, setUploadedFilesMetadata] = useState<{ [section: string]: { file_name: string; file_size: number; mime_type: string; upload_date: string; }[] }>({});
  // Add state for uploadedDocuments
  const [uploadedDocuments, setUploadedDocuments] = useState<{
    reference_id: string;
    file_name: string;
    section_name: string;
  }[]>([]);

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
      applicantLengthYears: 0,
      applicantLengthMonths: 0,
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
    console.log('handleEncryptedDocumentChange called:', { person, documentType, encryptedFilesCount: encryptedFiles.length });
    
    // Special debugging for guarantor documents
    if (person === 'guarantor') {
      console.log('🚀 GUARANTOR ENCRYPTED DOCUMENT CHANGE:', {
        person,
        documentType,
        encryptedFilesCount: encryptedFiles.length,
        encryptedFiles: encryptedFiles.map(f => ({ filename: f.filename, size: f.encryptedData.length }))
      });
    }
    
    setEncryptedDocuments((prev: any) => ({
      ...prev,
      [person]: {
        ...prev[person],
        [documentType]: encryptedFiles,
      },
    }));

    // Track uploadedDocuments for webhook
    const sectionKey = `${person}_${documentType}`;
    const docs = encryptedFiles.map(file => ({
      reference_id: file.uploadDate + '-' + file.filename, // or use a better unique id if available
      file_name: file.filename,
      section_name: sectionKey
    }));
    setUploadedDocuments(prev => {
      // Remove any previous docs for this section
      const filtered = prev.filter(doc => doc.section_name !== sectionKey);
      return [...filtered, ...docs];
    });

    // Track uploaded files metadata for webhook
    const filesMetadata = encryptedFiles.map(file => ({
      file_name: file.filename,
      file_size: file.originalSize,
      mime_type: file.mimeType,
      upload_date: file.uploadDate
    }));

    setUploadedFilesMetadata(prev => ({
      ...prev,
      [sectionKey]: filesMetadata
    }));
  };

  const handleSignatureChange = (person: string, signature: string) => {
    setSignatures((prev: any) => ({
      ...prev,
      [person]: signature,
    }));
  };

  const generatePDF = async () => {
    try {
    const pdfGenerator = new PDFGenerator();

    const pdfData = pdfGenerator.generatePDF({
      application: formData.application,
      applicant: formData.applicant,
      coApplicant: hasCoApplicant ? formData.coApplicant : undefined,
      guarantor: hasGuarantor ? formData.guarantor : undefined,
      signatures,
    });

      // Extract base64 from data URL
      const base64 = pdfData.split(',')[1];

      // Prepare filename
      const filename = `rental-application-${new Date().toISOString().split('T')[0]}.pdf`;

      // Send PDF to webhook
      console.log('Sending PDF to webhook:', {
        filename,
        referenceId,
        applicationId,
        base64Length: base64.length
      });
      
      const webhookResult = await WebhookService.sendPDFToWebhook(
        base64,
        referenceId,
        applicationId,
        filename
      );

      // Notify user of result
      if (webhookResult.success) {
        toast({
          title: "PDF Generated & Sent",
          description: "Your rental application PDF has been generated and sent to the webhook.",
        });
      } else {
        toast({
          title: "PDF Generated",
          description: "Your rental application PDF has been generated, but webhook delivery failed.",
          variant: "destructive",
        });
      }

      // Trigger browser download
    const link = document.createElement('a');
    link.href = pdfData;
      link.download = filename;
    link.click();

    } catch (error) {
      console.error('Error generating PDF:', error);
    toast({
        title: "PDF Generation Failed",
        description: "There was an error generating your PDF.",
        variant: "destructive",
    });
    }
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

  const uploadEncryptedFiles = async (encryptedFiles: EncryptedFile[], personType: string) => {
    try {
      console.log(`Starting upload of ${encryptedFiles.length} files for ${personType}...`);
      
      // Create FormData
      const formData = new FormData();
      formData.append('personType', personType);
      formData.append('applicationId', Date.now().toString());
      
      // Add each file to FormData
      encryptedFiles.forEach((file, index) => {
        formData.append(`files[${index}][filename]`, file.filename);
        formData.append(`files[${index}][encryptedData]`, file.encryptedData);
        formData.append(`files[${index}][originalSize]`, file.originalSize.toString());
        formData.append(`files[${index}][mimeType]`, file.mimeType);
        formData.append(`files[${index}][uploadDate]`, file.uploadDate);
      });
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch('/api/upload-files', {
        method: 'POST',
        body: formData, // Use FormData instead of JSON
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response error:', response.status, response.statusText);
        console.error('Error response body:', errorText);
        
        // Handle specific error cases
        if (response.status === 413) {
          throw new Error('Files are too large. Please reduce file sizes and try again.');
        } else if (response.status === 504) {
          throw new Error('Upload timed out. Please try again with smaller files or fewer files at once.');
        } else {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
      }

      const result = await response.json();
      console.log(`Files uploaded successfully for ${personType}:`, result);
      

      
      return result;
    } catch (error) {
      console.error(`Failed to upload files for ${personType}:`, error);
      
      // Handle timeout errors specifically
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Upload timed out. Please try again with smaller files or fewer files at once.');
      }
      
      throw error;
    }
  };

  const onSubmit = async (data: ApplicationFormData) => {
    console.log("=== FORM SUBMISSION DEBUG ===");
    console.log("Form data received:", data);
    console.log("Form data applicantDob:", data.applicantDob);
    console.log("Form data moveInDate:", data.moveInDate);
    console.log("Form data applicantName:", data.applicantName);
    console.log("Form validation errors:", form.formState.errors);
    console.log("Form is valid:", form.formState.isValid);
    console.log("Form is dirty:", form.formState.isDirty);
    console.log("=== END DEBUG ===");
    
    // Ensure all required fields are present and valid
    const requiredFields: (keyof ApplicationFormData)[] = [
      'buildingAddress',
      'apartmentNumber',
      'moveInDate',
      'monthlyRent',
      'apartmentType',
      'applicantName',
      'applicantDob',
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
        (field === 'monthlyRent' && (!data[field] || isNaN(data[field] as any) || (data[field] as any) <= 0)) ||
        (field === 'applicantDob' && !data[field]) ||
        (field === 'moveInDate' && !data[field])
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
      console.log("Submitting application:", { ...data, formData, signatures });
      console.log("Uploaded files metadata:", uploadedFilesMetadata);

      // Helper function to safely convert date to ISO string
      const safeDateToISO = (dateValue: any): string | null => {
        if (!dateValue) return null;
        try {
          const date = new Date(dateValue);
          if (isNaN(date.getTime())) {
            console.warn('Invalid date value:', dateValue);
            return null;
          }
          return date.toISOString();
        } catch (error) {
          console.warn('Error converting date to ISO:', dateValue, error);
          return null;
        }
      };

      // Transform form data to match database schema
      const transformedData: any = {
        // Application Info
        buildingAddress: data.buildingAddress,
        apartmentNumber: data.apartmentNumber,
        moveInDate: safeDateToISO(data.moveInDate || formData.application?.moveInDate),
        monthlyRent: data.monthlyRent,
        apartmentType: data.apartmentType,
        howDidYouHear: data.howDidYouHear,
        
        // Primary Applicant
        applicantName: data.applicantName,
        applicantDob: safeDateToISO(data.applicantDob || formData.applicant?.dob),
        applicantSsn: data.applicantSsn && data.applicantSsn.trim() !== '' ? data.applicantSsn : null,
        applicantPhone: data.applicantPhone && data.applicantPhone.trim() !== '' ? data.applicantPhone : null,
        applicantEmail: data.applicantEmail,
        applicantLicense: data.applicantLicense,
        applicantLicenseState: data.applicantLicenseState,
        applicantAddress: data.applicantAddress,
        applicantCity: data.applicantCity,
        applicantState: data.applicantState,
        applicantZip: data.applicantZip,
        applicantLengthAtAddress: data.applicantLengthAtAddress,
        applicantLengthYears: data.applicantLengthYears,
        applicantLengthMonths: data.applicantLengthMonths,
        applicantLandlordName: data.applicantLandlordName,
        applicantCurrentRent: data.applicantCurrentRent,
        applicantReasonForMoving: data.applicantReasonForMoving,
        
        // Primary Applicant Financial (from formData)
        applicantEmployer: formData.applicant?.employer || null,
        applicantPosition: formData.applicant?.position || null,
        applicantEmploymentStart: safeDateToISO(formData.applicant?.employmentStart),
        applicantIncome: formData.applicant?.income ? parseFloat(formData.applicant.income) : null,
        applicantOtherIncome: formData.applicant?.otherIncome ? parseFloat(formData.applicant.otherIncome) : null,
        applicantOtherIncomeSource: formData.applicant?.otherIncomeSource || null,
        applicantBankName: formData.applicant?.bankRecords?.[0]?.bankName || null,
        applicantAccountType: formData.applicant?.bankRecords?.[0]?.accountType || null,
        applicantBankRecords: formData.applicant?.bankRecords || [],
        
        // Co-Applicant
        hasCoApplicant: hasCoApplicant,
        coApplicantName: formData.coApplicant?.name || null,
        coApplicantRelationship: formData.coApplicant?.relationship || null,
        coApplicantDob: safeDateToISO(formData.coApplicant?.dob),
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
        coApplicantEmploymentStart: safeDateToISO(formData.coApplicant?.employmentStart),
        coApplicantIncome: formData.coApplicant?.income ? parseFloat(formData.coApplicant.income) : null,
        coApplicantOtherIncome: formData.coApplicant?.otherIncome ? parseFloat(formData.coApplicant.otherIncome) : null,
        coApplicantBankName: formData.coApplicant?.bankRecords?.[0]?.bankName || null,
        coApplicantAccountType: formData.coApplicant?.bankRecords?.[0]?.accountType || null,
        coApplicantBankRecords: formData.coApplicant?.bankRecords || [],
        
        // Guarantor - only include if hasGuarantor is true
        hasGuarantor: hasGuarantor,
      };

      // Only add guarantor fields if hasGuarantor is true
      console.log('hasGuarantor value:', hasGuarantor);
      if (hasGuarantor) {
        console.log('Adding guarantor fields...');
        transformedData.guarantorName = formData.guarantor?.name || null;
        transformedData.guarantorRelationship = formData.guarantor?.relationship || null;
        transformedData.guarantorDob = safeDateToISO(formData.guarantor?.dob);
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
        transformedData.guarantorEmploymentStart = safeDateToISO(formData.guarantor?.employmentStart);
        transformedData.guarantorIncome = formData.guarantor?.income ? parseFloat(formData.guarantor.income) : null;
        transformedData.guarantorOtherIncome = formData.guarantor?.otherIncome ? parseFloat(formData.guarantor.otherIncome) : null;
        transformedData.guarantorBankName = formData.guarantor?.bankRecords?.[0]?.bankName || null;
        transformedData.guarantorAccountType = formData.guarantor?.bankRecords?.[0]?.accountType || null;
        transformedData.guarantorBankRecords = formData.guarantor?.bankRecords || [];
        transformedData.guarantorSignature = signatures.guarantor || null;
      } else {
        console.log('Skipping guarantor fields - hasGuarantor is false');
      }

      // Add signatures for applicant and co-applicant
      transformedData.applicantSignature = signatures.applicant || null;
      transformedData.coApplicantSignature = signatures.coApplicant || null;
      
      // Other Occupants - send as a list
      transformedData.otherOccupants = formData.occupants || [];
      
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
      
      // Note: Documents and encrypted data are now sent via webhooks, not included in server submission
      console.log('Documents and encrypted data will be sent via webhooks');
      
      console.log('Transformed application data:', JSON.stringify(transformedData, null, 2));
      console.log('Date fields debug:');
      console.log('  - applicantDob (raw):', data.applicantDob);
      console.log('  - applicantDob (raw type):', typeof data.applicantDob);
      console.log('  - applicantDob (raw instanceof Date):', data.applicantDob instanceof Date);
      console.log('  - applicantDob (transformed):', transformedData.applicantDob);
      console.log('  - moveInDate (raw):', data.moveInDate);
      console.log('  - moveInDate (raw type):', typeof data.moveInDate);
      console.log('  - moveInDate (raw instanceof Date):', data.moveInDate instanceof Date);
      console.log('  - moveInDate (transformed):', transformedData.moveInDate);
      console.log('Current window location:', window.location.href);
      
      // Use the regular API endpoint for local development
      const apiEndpoint = '/api';
      console.log('Making request to:', window.location.origin + apiEndpoint + '/submit-application');
      
      const requestBody = {
        applicationData: transformedData,
        uploadedFilesMetadata: uploadedFilesMetadata
      };
      
      console.log('Request body being sent:', JSON.stringify(requestBody, null, 2));
      console.log('Request body uploadedFilesMetadata:', requestBody.uploadedFilesMetadata);
      
      // Validate required fields before submission
      if (!transformedData.applicantDob) {
        throw new Error('Date of birth is required. Please select your date of birth.');
      }
      if (!transformedData.moveInDate) {
        throw new Error('Move-in date is required. Please select your move-in date.');
      }
      if (!transformedData.applicantName || transformedData.applicantName.trim() === '') {
        throw new Error('Full name is required. Please enter your full name.');
      }
      
      // Create AbortController for submission timeout
      const submissionController = new AbortController();
      const submissionTimeoutId = setTimeout(() => submissionController.abort(), 45000); // 45 second timeout
      
      const submissionResponse = await fetch(apiEndpoint + '/submit-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: submissionController.signal
      });

      clearTimeout(submissionTimeoutId);

      if (!submissionResponse.ok) {
        const errorText = await submissionResponse.text();
        console.error('Submission response error:', submissionResponse.status, submissionResponse.statusText);
        console.error('Error response body:', errorText);
        
        // Handle specific error cases
        if (submissionResponse.status === 413) {
          throw new Error('Application data is too large. Please reduce file sizes and try again.');
        } else if (submissionResponse.status === 504) {
          throw new Error('Submission timed out. Please try again with smaller files or fewer files at once.');
        } else {
          throw new Error(`Submission failed: ${submissionResponse.status} ${submissionResponse.statusText}`);
        }
      }

      const submissionResult = await submissionResponse.json();
      console.log('Application submitted successfully:', submissionResult);

      // Note: Encrypted data and files are now sent separately via webhooks
      console.log('Application submitted successfully. Files and encrypted data sent via webhooks.');

      // On form submit, send only form data, application_id, and uploadedDocuments to the webhook
      try {
        const webhookPayload = {
          ...transformedData, // all form fields
          application_id: applicationId,
          uploaded_documents: uploadedDocuments.map(doc => ({
            reference_id: doc.reference_id,
            file_name: doc.file_name,
            section_name: doc.section_name
          }))
        };

        console.log('=== WEBHOOK PAYLOAD DEBUG ===');
        console.log('Other Occupants:', transformedData.otherOccupants);
        console.log('Bank Records - Applicant:', transformedData.applicantBankRecords);
        console.log('Bank Records - Co-Applicant:', transformedData.coApplicantBankRecords);
        console.log('Bank Records - Guarantor:', transformedData.guarantorBankRecords);
        console.log('Uploaded Documents Count:', uploadedDocuments.length);
        console.log('=== END WEBHOOK PAYLOAD DEBUG ===');

        console.log('Form submission webhook payload:', JSON.stringify(webhookPayload, null, 2));
        console.log('Uploaded documents array:', JSON.stringify(uploadedDocuments, null, 2));
        const webhookResult = await WebhookService.sendFormDataToWebhook(
          webhookPayload,
          referenceId,
          applicationId,
          uploadedFilesMetadata
        );
        
        if (webhookResult.success) {
          toast({
            title: "Application Submitted & Sent",
            description: "Your rental application has been submitted and sent to the webhook successfully.",
          });
          } else {
          toast({
            title: "Application Submitted",
            description: "Your rental application has been submitted, but webhook delivery failed.",
          });
        }
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      toast({
        title: "Application Submitted",
          description: "Your rental application has been submitted, but webhook delivery failed.",
      });
      }

      generatePDF();
    } catch (error) {
      console.error('Failed to submit application:', error);
      
      let errorMessage = "Failed to submit application. Please try again.";
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Submission timed out. Please try again with smaller files or fewer files at once.";
        } else if (error.message.includes('413')) {
          errorMessage = "Application data is too large. Please reduce file sizes and try again.";
        } else if (error.message.includes('504')) {
          errorMessage = "Submission timed out. Please try again with smaller files or fewer files at once.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
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
                            console.log('DatePicker onChange - moveInDate:', date);
                            console.log('DatePicker onChange - moveInDate type:', typeof date);
                            console.log('DatePicker onChange - moveInDate instanceof Date:', date instanceof Date);
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
                  {['Building Sign', 'Broker', 'Street Easy', 'Other'].map((option) => (
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
                            console.log('DatePicker onChange - applicantDob:', date);
                            console.log('DatePicker onChange - applicantDob type:', typeof date);
                            console.log('DatePicker onChange - applicantDob instanceof Date:', date instanceof Date);
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
                      <FormLabel>Social Security Number</FormLabel>
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
                      <FormLabel>Phone Number</FormLabel>
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
                    name="applicantLengthYears"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Years</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="Years" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              const value = e.target.value ? parseInt(e.target.value) : 0;
                              field.onChange(value);
                              updateFormData('applicant', 'lengthYears', value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantLengthMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Months</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="Months" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              const value = e.target.value ? parseInt(e.target.value) : 0;
                              field.onChange(value);
                              updateFormData('applicant', 'lengthMonths', value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantLandlordName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Landlord's Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter landlord's name" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              field.onChange(e);
                              updateFormData('applicant', 'landlordName', e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantCurrentRent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="Enter monthly rent" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : 0;
                              field.onChange(value);
                              updateFormData('applicant', 'currentRent', value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="applicantReasonForMoving"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Why Are You Moving?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please explain your reason for moving" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              field.onChange(e);
                              updateFormData('applicant', 'reasonForMoving', e.target.value);
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

                  // Track uploadedDocuments for webhook
                  const sectionKey = `supporting_${documentType}`;
                  const docs = encryptedFiles.map(file => ({
                    reference_id: file.uploadDate + '-' + file.filename,
                    file_name: file.filename,
                    section_name: sectionKey
                  }));
                  setUploadedDocuments(prev => {
                    const filtered = prev.filter(doc => doc.section_name !== sectionKey);
                    return [...filtered, ...docs];
                  });

                  // Track uploaded files metadata for webhook
                  const filesMetadata = encryptedFiles.map(file => ({
                    file_name: file.filename,
                    file_size: file.originalSize,
                    mime_type: file.mimeType,
                    upload_date: file.uploadDate
                  }));

                  setUploadedFilesMetadata(prev => ({
                    ...prev,
                    [sectionKey]: filesMetadata
                  }));
                }}
                referenceId={referenceId}
                enableWebhook={true}
                applicationId={applicationId}
              />
            </CardContent>
          </Card>
        );

      case 5:
        return (
          <div className="space-y-8">
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Co-Applicant
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
                    referenceId={referenceId}
                    enableWebhook={true}
                    applicationId={applicationId}
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
          <div className="space-y-6">
            {/* Guarantor Information Section */}
            {hasGuarantor ? (
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
                </CardContent>
              </Card>
            ) : (
              <Card className="form-section border-l-4 border-l-gray-300">
                <CardHeader>
                  <CardTitle className="flex items-center text-gray-600">
                    <UserCheck className="w-5 h-5 mr-2" />
                    Guarantor Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No guarantor has been added to this application.</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setHasGuarantor(true);
                        form.setValue('hasGuarantor', true);
                      }}
                    >
                      Add Guarantor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Guarantor Documents Section */}
            {hasGuarantor && (
              <Card className="form-section border-l-4 border-l-purple-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-purple-700 dark:text-purple-400">
                    <Shield className="w-5 h-5 mr-2" />
                    Guarantor Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentSection 
                    title="Guarantor Documents"
                    person="guarantor"
                    onDocumentChange={handleDocumentChange}
                    onEncryptedDocumentChange={handleEncryptedDocumentChange}
                    referenceId={referenceId}
                    enableWebhook={true}
                    applicationId={applicationId}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 7:
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