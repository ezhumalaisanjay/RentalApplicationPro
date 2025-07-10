import jsPDF from 'jspdf';

interface FormData {
  application: any;
  applicant: any;
  coApplicant?: any;
  guarantor?: any;
  signatures: {
    applicant?: string;
    coApplicant?: string;
    guarantor?: string;
  };
}

export class PDFGenerator {
  private doc: jsPDF;
  private yPosition: number = 20;
  private readonly pageWidth: number = 210;
  private readonly marginLeft: number = 20;
  private readonly marginRight: number = 20;

  constructor() {
    this.doc = new jsPDF();
  }

  private addText(text: string, fontSize: number = 10, isBold: boolean = false): void {
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    this.doc.text(text, this.marginLeft, this.yPosition);
    this.yPosition += fontSize * 0.6;
  }

  private addSection(title: string): void {
    this.yPosition += 10;
    this.addText(title, 14, true);
    this.yPosition += 5;
  }

  private addField(label: string, value: string | number | undefined): void {
    if (value !== undefined && value !== null && value !== '') {
      this.addText(`${label}: ${value}`, 10);
    }
  }

  private checkPageBreak(): void {
    if (this.yPosition > 270) {
      this.doc.addPage();
      this.yPosition = 20;
    }
  }

  private addHeader(): void {
    // Company name
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text("Liberty Place Property Management", 105, this.yPosition, { align: 'center' });
    this.yPosition += 8;
    
    // Address and contact info
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text("122 East 42nd Street, Suite 1903, New York, NY 10168", 105, this.yPosition, { align: 'center' });
    this.yPosition += 5;
    this.doc.text("Tel: (646) 545-6700 | Fax: (646) 304-2255", 105, this.yPosition, { align: 'center' });
    this.yPosition += 5;
    this.doc.text("Leasing Direct Line: (646) 545-6700", 105, this.yPosition, { align: 'center' });
    this.yPosition += 10;
    
    // Title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text("RENTAL APPLICATION", 105, this.yPosition, { align: 'center' });
    this.yPosition += 10;
    
    // Decorative line
    this.doc.setDrawColor(0, 102, 204);
    this.doc.setLineWidth(1);
    this.doc.line(this.marginLeft, this.yPosition, this.pageWidth - this.marginRight, this.yPosition);
    this.yPosition += 10;
  }

  private addRequirements(): void {
    this.addSection("Application Requirements");
    this.addText("• Applicants must show income of 40 TIMES THE MONTHLY RENT", 10);
    this.addText("• Guarantors must show income of 80 TIMES THE MONTHLY RENT", 10);
    this.addText("• $50.00 non-refundable processing fee per adult applicant and guarantor", 10);
    this.addText("• Applications must be submitted in full", 10);
  }

  private addApplicationInfo(data: FormData): void {
    this.checkPageBreak();
    this.addSection("Application Information");
    
    this.addField("Application Date", new Date().toLocaleDateString());
    this.addField("Building Address", data.application.buildingAddress);
    this.addField("Apartment Number", data.application.apartmentNumber);
    this.addField("Move-in Date", data.application.moveInDate);
    this.addField("Monthly Rent", `$${data.application.monthlyRent}`);
    this.addField("Apartment Type", data.application.apartmentType);
    this.addField("How did you hear about us", data.application.howDidYouHear);
  }

  private addPersonalInfo(title: string, person: any): void {
    this.checkPageBreak();
    this.addSection(title);
    
    this.addField("Full Name", person.name);
    this.addField("Date of Birth", person.dob);
    this.addField("Social Security Number", person.ssn);
    this.addField("Phone Number", person.phone);
    this.addField("Email Address", person.email);
    this.addField("Driver's License", person.license);
    this.addField("License State", person.licenseState);
    
    if (person.address) {
      this.addText("Address:", 10, true);
      this.addField("Street", person.address);
      this.addField("City", person.city);
      this.addField("State", person.state);
      this.addField("ZIP Code", person.zip);
      this.addField("Length at Address", person.lengthAtAddress);
    }
    
    this.addField("Current Landlord", person.landlordName);
    this.addField("Current Monthly Rent", person.currentRent ? `$${person.currentRent}` : undefined);
    this.addField("Reason for Moving", person.reasonForMoving);
  }

  private addFinancialInfo(title: string, person: any): void {
    this.checkPageBreak();
    this.addSection(`${title} - Employment & Financial Information`);
    
    this.addField("Current Employer", person.employer);
    this.addField("Position/Title", person.position);
    this.addField("Employment Start Date", person.employmentStart);
    this.addField("Annual Income", person.income ? `$${person.income}` : undefined);
    this.addField("Other Income", person.otherIncome ? `$${person.otherIncome}` : undefined);
    this.addField("Other Income Source", person.otherIncomeSource);
    this.addField("Bank Name", person.bankName);
    this.addField("Account Type", person.accountType);
  }

  private addSignature(title: string, signature: string): void {
    this.checkPageBreak();
    this.addSection(`${title} Signature`);
    
    if (signature) {
      try {
        // Add signature image
        this.doc.addImage(signature, 'PNG', this.marginLeft, this.yPosition, 60, 20);
        this.yPosition += 25;
      } catch (error) {
        this.addText("Digital signature provided", 10);
      }
    } else {
      this.addText("No signature provided", 10);
    }
    
    this.addText("Date: " + new Date().toLocaleDateString(), 10);
  }

  public generatePDF(formData: FormData): string {
    // Add header
    this.addHeader();
    
    // Add requirements
    this.addRequirements();
    
    // Add application information
    this.addApplicationInfo(formData);
    
    // Add primary applicant information
    this.addPersonalInfo("Primary Applicant Information", formData.applicant);
    this.addFinancialInfo("Primary Applicant", formData.applicant);
    
    // Add co-applicant information if present
    if (formData.coApplicant && formData.coApplicant.name) {
      this.addPersonalInfo("Co-Applicant Information", formData.coApplicant);
      this.addFinancialInfo("Co-Applicant", formData.coApplicant);
    }
    
    // Add guarantor information if present
    if (formData.guarantor && formData.guarantor.name) {
      this.addPersonalInfo("Guarantor Information", formData.guarantor);
      this.addFinancialInfo("Guarantor", formData.guarantor);
    }
    
    // Add signatures
    if (formData.signatures.applicant) {
      this.addSignature("Primary Applicant", formData.signatures.applicant);
    }
    
    if (formData.signatures.coApplicant) {
      this.addSignature("Co-Applicant", formData.signatures.coApplicant);
    }
    
    if (formData.signatures.guarantor) {
      this.addSignature("Guarantor", formData.signatures.guarantor);
    }
    
    // Add footer
    this.checkPageBreak();
    this.yPosition += 10;
    this.addText("This application was submitted electronically on " + new Date().toLocaleString(), 8);
    this.addText("Liberty Place Property Management - Rental Application", 8);
    
    return this.doc.output('datauristring');
  }
}
