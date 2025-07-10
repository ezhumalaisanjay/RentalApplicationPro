import React from "react";
import { Button } from "@/components/ui/button";

interface ApplicationInstructionsProps {
  onNext: () => void;
}

export const ApplicationInstructions: React.FC<ApplicationInstructionsProps> = ({
  onNext,
}) => (
  <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8 mt-8">
    <div className="flex flex-col items-center mb-6">
      <img
        src="https://files.jotform.com/jufs/CRP_Affordable/form_files/image_686d7ef15b36a.png?md5=R8yf_l9uY_nIi8Q3B0xDnQ&expires=1752174415"
        alt="Liberty Place Logo"
        className="h-12 mb-2"
        style={{ objectFit: "contain" }}
      />
      <h1 className="text-2xl font-bold text-center mb-2">LIBERTY PLACE</h1>
    </div>
    <div className="text-sm text-gray-700 mb-4 text-center">
      122 East 42nd Street, Suite 1903 New York, NY 10168
      <br />
      Tel: (646) 545-6700 Fax: (646) 304-2255 Leasing Direct Line: (646)545-6700
    </div>
    <div className="mb-4">
      Thank you for choosing a Liberty Place Property Management apartment.
    </div>
    <ol className="list-decimal pl-5 mb-4 space-y-2">
      <li>
        Applicants must show income of 40 TIMES THE MONTHLY RENT. (may be
        combined among applicants)
      </li>
      <li>
        Guarantors must show income of 80 TIMES THE MONTHLY RENT. (may NOT be
        combined with applicants)
      </li>
      <li>
        Applications packages must be submitted in full as detailed below. Only
        complete applications will be reviewed and considered for tenancy.
      </li>
      <li>Applications will not remove apartments from the market.</li>
      <li>
        Lease signings must be scheduled within three (3) days of approval or
        the backup applicant will be considered.
      </li>
    </ol>
    <div className="mb-4">
      We look forward to servicing your residential needs.
    </div>
    <div className="font-semibold mb-2">
      YOUR APPLICATION PACKAGE MUST INCLUDE:
    </div>
    <ul className="list-disc pl-5 mb-4 text-sm space-y-1">
      <li>
        Completed and Signed application by applicants and guarantors $50.00
        Non-refundable processing fee per adult applicant and per guarantor-
        Money order or cashier's check
      </li>
      <li>
        Driver's License or Photo ID (18 & over) Social Security Card Financial
        Statement - First Page (Checking, Savings and/or other assets) Previous
        year tax returns - First Page
      </li>
      <li>
        Proof of Employment if you work for a company: 1. Letter on company
        letterhead including length of employment, salary & position 2. Last 4
        paystubs (If paid weekly) - or - Last 2 paystubs (if paid bi-weekly or
        semi-monthly)
      </li>
      <li>
        Proof of Employment if you are self-employed: 1. Previous year 1099 2.
        Notarized Letter from your accountant on his/her company letterhead
        verifying: A. Nature of the business B. Length of employment C. Income
        holdings D. Projected annual income expected for the current year and
        upcoming year.
      </li>
    </ul>
    <div className="font-semibold mb-2">
      CORPORATE APPLICANTS MUST SUBMIT A SEPARATE APPLICATION ALONG WITH:
    </div>
    <ul className="list-disc pl-5 mb-4 text-sm space-y-1">
      <li>
        $150.00 Non-refundable application fee Corporate officer as a guarantor
        Information of the company employee that will occupy the apartment
        Certified Financial Statements Corporate Tax Returns (two (2) most
        recent consecutive returns)
      </li>
    </ul>
  </div>
);

console.log("ApplicationInstructions component loaded");
export default ApplicationInstructions; 