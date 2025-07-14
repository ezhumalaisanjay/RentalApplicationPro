// CommonJS version of schema validation for Netlify functions
const { z } = require('zod');

// Helper function to convert string dates to Date objects
const dateStringToDate = z.string().or(z.date()).or(z.null()).transform((val) => {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val === 'string') {
    return new Date(val);
  }
  return val;
});

// Base schema for rental applications
const baseSchema = z.object({
  // Application Info
  buildingAddress: z.string().min(1, "Building address is required"),
  apartmentNumber: z.string().min(1, "Apartment number is required"),
  moveInDate: dateStringToDate,
  monthlyRent: z.number().positive("Monthly rent must be a positive number"),
  apartmentType: z.string().min(1, "Apartment type is required"),
  howDidYouHear: z.string().optional(),
  
  // Primary Applicant
  applicantName: z.string().min(1, "Full name is required"),
  applicantDob: dateStringToDate,
  applicantSsn: z.string().optional().nullable(),
  applicantPhone: z.string().optional().nullable(),
  applicantEmail: z.string().email("Valid email is required"),
  applicantLicense: z.string().optional(),
  applicantLicenseState: z.string().optional(),
  applicantAddress: z.string().min(1, "Address is required"),
  applicantCity: z.string().min(1, "City is required"),
  applicantState: z.string().min(1, "State is required"),
  applicantZip: z.string().min(1, "ZIP code is required"),
  applicantLengthAtAddress: z.string().optional(),
  applicantLandlordName: z.string().optional(),
  applicantCurrentRent: z.number().optional(),
  applicantReasonForMoving: z.string().optional(),
  
  // Primary Applicant Financial - make optional
  applicantEmployer: z.string().optional().nullable(),
  applicantPosition: z.string().optional().nullable(),
  applicantEmploymentStart: dateStringToDate.optional(),
  applicantIncome: z.number().optional().nullable(),
  applicantOtherIncome: z.number().optional().nullable(),
  applicantOtherIncomeSource: z.string().optional().nullable(),
  applicantBankName: z.string().optional().nullable(),
  applicantAccountType: z.string().optional().nullable(),
  
  // Co-Applicant - make all fields optional and nullable
  hasCoApplicant: z.boolean().default(false),
  coApplicantName: z.string().optional().nullable(),
  coApplicantRelationship: z.string().optional().nullable(),
  coApplicantDob: dateStringToDate.optional(),
  coApplicantSsn: z.string().optional().nullable(),
  coApplicantPhone: z.string().optional().nullable(),
  coApplicantEmail: z.string().optional().nullable(),
  coApplicantSameAddress: z.boolean().default(false),
  coApplicantAddress: z.string().optional().nullable(),
  coApplicantCity: z.string().optional().nullable(),
  coApplicantState: z.string().optional().nullable(),
  coApplicantZip: z.string().optional().nullable(),
  coApplicantLengthAtAddress: z.string().optional().nullable(),
  
  // Co-Applicant Financial - make all fields optional and nullable
  coApplicantEmployer: z.string().optional().nullable(),
  coApplicantPosition: z.string().optional().nullable(),
  coApplicantEmploymentStart: dateStringToDate.optional(),
  coApplicantIncome: z.number().optional().nullable(),
  coApplicantOtherIncome: z.number().optional().nullable(),
  coApplicantBankName: z.string().optional().nullable(),
  coApplicantAccountType: z.string().optional().nullable(),
  
  // Guarantor - make all fields optional and nullable
  hasGuarantor: z.boolean().default(false),
  guarantorName: z.string().optional().nullable(),
  guarantorRelationship: z.string().optional().nullable(),
  guarantorDob: dateStringToDate.optional().nullable(),
  guarantorSsn: z.string().optional().nullable(),
  guarantorPhone: z.string().optional().nullable(),
  guarantorEmail: z.string().optional().nullable(),
  guarantorAddress: z.string().optional().nullable(),
  guarantorCity: z.string().optional().nullable(),
  guarantorState: z.string().optional().nullable(),
  guarantorZip: z.string().optional().nullable(),
  guarantorLengthAtAddress: z.string().optional().nullable(),
  
  // Guarantor Financial - make all fields optional and nullable
  guarantorEmployer: z.string().optional().nullable(),
  guarantorPosition: z.string().optional().nullable(),
  guarantorEmploymentStart: dateStringToDate.optional().nullable(),
  guarantorIncome: z.number().optional().nullable(),
  guarantorOtherIncome: z.number().optional().nullable(),
  guarantorBankName: z.string().optional().nullable(),
  guarantorAccountType: z.string().optional().nullable(),
  
  // Signatures - make optional
  applicantSignature: z.string().optional().nullable(),
  coApplicantSignature: z.string().optional().nullable(),
  guarantorSignature: z.string().optional().nullable(),
  
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
  
  // Documents
  documents: z.string().optional(),
  
  // Encrypted Data
  encryptedData: z.string().optional(),
  
  // Status
  status: z.string().default("draft"),
});

module.exports = {
  insertRentalApplicationSchema: baseSchema
}; 