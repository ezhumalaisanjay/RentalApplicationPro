import { rentalApplications, type RentalApplication, type InsertRentalApplication } from "@shared/schema";

export interface IStorage {
  getApplication(id: number): Promise<RentalApplication | undefined>;
  createApplication(application: InsertRentalApplication): Promise<RentalApplication>;
  updateApplication(id: number, application: Partial<InsertRentalApplication>): Promise<RentalApplication | undefined>;
  getAllApplications(): Promise<RentalApplication[]>;
}

export class MemStorage implements IStorage {
  private applications: Map<number, RentalApplication>;
  private currentId: number;

  constructor() {
    this.applications = new Map();
    this.currentId = 1;
  }

  async getApplication(id: number): Promise<RentalApplication | undefined> {
    return this.applications.get(id);
  }

  async createApplication(insertApplication: InsertRentalApplication): Promise<RentalApplication> {
    const id = this.currentId++;
    const application: RentalApplication = { 
      ...insertApplication, 
      id,
      applicationDate: new Date(),
      status: insertApplication.status || 'draft',
      submittedAt: insertApplication.status === 'submitted' ? new Date() : null,
      howDidYouHear: insertApplication.howDidYouHear || null,
      applicantLicense: insertApplication.applicantLicense || null,
      applicantLicenseState: insertApplication.applicantLicenseState || null,
      applicantLengthAtAddress: insertApplication.applicantLengthAtAddress || null,
      applicantLandlordName: insertApplication.applicantLandlordName || null,
      applicantCurrentRent: insertApplication.applicantCurrentRent || null,
      applicantReasonForMoving: insertApplication.applicantReasonForMoving || null,
      applicantEmployer: insertApplication.applicantEmployer || null,
      applicantPosition: insertApplication.applicantPosition || null,
      applicantEmploymentStart: insertApplication.applicantEmploymentStart || null,
      applicantIncome: insertApplication.applicantIncome || null,
      applicantOtherIncome: insertApplication.applicantOtherIncome || null,
      applicantOtherIncomeSource: insertApplication.applicantOtherIncomeSource || null,
      applicantBankName: insertApplication.applicantBankName || null,
      applicantAccountType: insertApplication.applicantAccountType || null,
      hasCoApplicant: insertApplication.hasCoApplicant || null,
      hasGuarantor: insertApplication.hasGuarantor || null,
      // Co-applicant fields
      coApplicantName: insertApplication.coApplicantName || null,
      coApplicantRelationship: insertApplication.coApplicantRelationship || null,
      coApplicantDob: insertApplication.coApplicantDob || null,
      coApplicantSsn: insertApplication.coApplicantSsn || null,
      coApplicantPhone: insertApplication.coApplicantPhone || null,
      coApplicantEmail: insertApplication.coApplicantEmail || null,
      coApplicantSameAddress: insertApplication.coApplicantSameAddress || null,
      coApplicantAddress: insertApplication.coApplicantAddress || null,
      coApplicantCity: insertApplication.coApplicantCity || null,
      coApplicantState: insertApplication.coApplicantState || null,
      coApplicantZip: insertApplication.coApplicantZip || null,
      coApplicantLengthAtAddress: insertApplication.coApplicantLengthAtAddress || null,
      coApplicantEmployer: insertApplication.coApplicantEmployer || null,
      coApplicantPosition: insertApplication.coApplicantPosition || null,
      coApplicantEmploymentStart: insertApplication.coApplicantEmploymentStart || null,
      coApplicantIncome: insertApplication.coApplicantIncome || null,
      coApplicantOtherIncome: insertApplication.coApplicantOtherIncome || null,
      coApplicantBankName: insertApplication.coApplicantBankName || null,
      coApplicantAccountType: insertApplication.coApplicantAccountType || null,
      // Guarantor fields
      guarantorName: insertApplication.guarantorName || null,
      guarantorRelationship: insertApplication.guarantorRelationship || null,
      guarantorDob: insertApplication.guarantorDob || null,
      guarantorSsn: insertApplication.guarantorSsn || null,
      guarantorPhone: insertApplication.guarantorPhone || null,
      guarantorEmail: insertApplication.guarantorEmail || null,
      guarantorAddress: insertApplication.guarantorAddress || null,
      guarantorCity: insertApplication.guarantorCity || null,
      guarantorState: insertApplication.guarantorState || null,
      guarantorZip: insertApplication.guarantorZip || null,
      guarantorLengthAtAddress: insertApplication.guarantorLengthAtAddress || null,
      guarantorEmployer: insertApplication.guarantorEmployer || null,
      guarantorPosition: insertApplication.guarantorPosition || null,
      guarantorEmploymentStart: insertApplication.guarantorEmploymentStart || null,
      guarantorIncome: insertApplication.guarantorIncome || null,
      guarantorOtherIncome: insertApplication.guarantorOtherIncome || null,
      guarantorBankName: insertApplication.guarantorBankName || null,
      guarantorAccountType: insertApplication.guarantorAccountType || null,
      // Signatures
      applicantSignature: insertApplication.applicantSignature || null,
      coApplicantSignature: insertApplication.coApplicantSignature || null,
      guarantorSignature: insertApplication.guarantorSignature || null,
      // Legal Questions
      hasBankruptcy: insertApplication.hasBankruptcy || null,
      bankruptcyDetails: insertApplication.bankruptcyDetails || null,
      hasEviction: insertApplication.hasEviction || null,
      evictionDetails: insertApplication.evictionDetails || null,
      hasCriminalHistory: insertApplication.hasCriminalHistory || null,
      criminalHistoryDetails: insertApplication.criminalHistoryDetails || null,
      hasPets: insertApplication.hasPets || null,
      petDetails: insertApplication.petDetails || null,
      smokingStatus: insertApplication.smokingStatus || null,
      documents: insertApplication.documents || null,
    };
    this.applications.set(id, application);
    return application;
  }

  async updateApplication(id: number, updateData: Partial<InsertRentalApplication>): Promise<RentalApplication | undefined> {
    const existing = this.applications.get(id);
    if (!existing) return undefined;

    const updated: RentalApplication = { 
      ...existing, 
      ...updateData,
      submittedAt: updateData.status === 'submitted' ? new Date() : existing.submittedAt,
    };
    this.applications.set(id, updated);
    return updated;
  }

  async getAllApplications(): Promise<RentalApplication[]> {
    return Array.from(this.applications.values());
  }
}

export const storage = new MemStorage();
