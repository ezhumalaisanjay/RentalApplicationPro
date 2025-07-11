// CommonJS version of storage for Netlify functions
class MemStorage {
  constructor() {
    this.applications = new Map();
    this.currentId = 1;
  }

  async getApplication(id) {
    return this.applications.get(id);
  }

  async createApplication(insertApplication) {
    const id = this.currentId++;
    const application = { 
      ...insertApplication, 
      id,
      applicationDate: new Date(),
      status: insertApplication.status || 'draft',
      submittedAt: insertApplication.status === 'submitted' ? new Date() : null,
      // Ensure required fields are not null
      moveInDate: insertApplication.moveInDate || new Date(),
      applicantDob: insertApplication.applicantDob || new Date(),
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
      encryptedData: insertApplication.encryptedData || null,
    };
    console.log('Storage: Creating application with encrypted data:', !!application.encryptedData);
    this.applications.set(id, application);
    return application;
  }

  async updateApplication(id, updateData) {
    const existing = this.applications.get(id);
    if (!existing) return undefined;

    const updated = { 
      ...existing, 
      ...updateData,
      submittedAt: updateData.status === 'submitted' ? new Date() : existing.submittedAt,
      // Ensure required fields are not null
      moveInDate: updateData.moveInDate || existing.moveInDate,
      applicantDob: updateData.applicantDob || existing.applicantDob,
    };
    this.applications.set(id, updated);
    return updated;
  }

  async getAllApplications() {
    return Array.from(this.applications.values());
  }
}

module.exports = { storage: new MemStorage() }; 