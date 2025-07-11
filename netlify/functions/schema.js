// CommonJS version of schema validation for Netlify functions
const { z } = require('zod');

// Basic schema for rental application
const insertRentalApplicationSchema = z.object({
  // Application Info
  buildingAddress: z.string().min(1, "Building address is required"),
  apartmentNumber: z.string().min(1, "Apartment number is required"),
  moveInDate: z.string().or(z.date()),
  monthlyRent: z.number().min(0, "Monthly rent must be positive"),
  apartmentType: z.string().min(1, "Apartment type is required"),
  howDidYouHear: z.string().optional(),

  // Primary Applicant
  applicantName: z.string().min(1, "Full name is required"),
  applicantDob: z.string().or(z.date()),
  applicantSsn: z.string().min(1, "SSN is required"),
  applicantPhone: z.string().min(1, "Phone number is required"),
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
  applicantEmployer: z.string().optional(),
  applicantPosition: z.string().optional(),
  applicantEmploymentStart: z.string().or(z.date()).optional(),
  applicantIncome: z.number().optional(),
  applicantOtherIncome: z.number().optional(),
  applicantOtherIncomeSource: z.string().optional(),
  applicantBankName: z.string().optional(),
  applicantAccountType: z.string().optional(),

  // Conditional fields
  hasCoApplicant: z.boolean().optional(),
  hasGuarantor: z.boolean().optional(),

  // Co-Applicant fields
  coApplicantName: z.string().optional(),
  coApplicantRelationship: z.string().optional(),
  coApplicantDob: z.string().or(z.date()).optional(),
  coApplicantSsn: z.string().optional(),
  coApplicantPhone: z.string().optional(),
  coApplicantEmail: z.string().email().optional(),
  coApplicantSameAddress: z.boolean().optional(),
  coApplicantAddress: z.string().optional(),
  coApplicantCity: z.string().optional(),
  coApplicantState: z.string().optional(),
  coApplicantZip: z.string().optional(),
  coApplicantLengthAtAddress: z.string().optional(),
  coApplicantEmployer: z.string().optional(),
  coApplicantPosition: z.string().optional(),
  coApplicantEmploymentStart: z.string().or(z.date()).optional(),
  coApplicantIncome: z.number().optional(),
  coApplicantOtherIncome: z.number().optional(),
  coApplicantBankName: z.string().optional(),
  coApplicantAccountType: z.string().optional(),

  // Guarantor fields
  guarantorName: z.string().optional(),
  guarantorRelationship: z.string().optional(),
  guarantorDob: z.string().or(z.date()).optional(),
  guarantorSsn: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorEmail: z.string().email().optional(),
  guarantorAddress: z.string().optional(),
  guarantorCity: z.string().optional(),
  guarantorState: z.string().optional(),
  guarantorZip: z.string().optional(),
  guarantorLengthAtAddress: z.string().optional(),
  guarantorEmployer: z.string().optional(),
  guarantorPosition: z.string().optional(),
  guarantorEmploymentStart: z.string().or(z.date()).optional(),
  guarantorIncome: z.number().optional(),
  guarantorOtherIncome: z.number().optional(),
  guarantorBankName: z.string().optional(),
  guarantorAccountType: z.string().optional(),

  // Signatures
  applicantSignature: z.string().optional(),
  coApplicantSignature: z.string().optional(),
  guarantorSignature: z.string().optional(),

  // Legal Questions
  hasBankruptcy: z.boolean().optional(),
  bankruptcyDetails: z.string().optional(),
  hasEviction: z.boolean().optional(),
  evictionDetails: z.string().optional(),
  hasCriminalHistory: z.boolean().optional(),
  criminalHistoryDetails: z.string().optional(),
  hasPets: z.boolean().optional(),
  petDetails: z.string().optional(),
  smokingStatus: z.string().optional(),
  documents: z.string().optional(),
  encryptedData: z.string().optional(),
  status: z.string().optional(),
});

module.exports = { insertRentalApplicationSchema }; 