import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";

interface DocumentSectionProps {
  title: string;
  person: "applicant" | "coApplicant" | "guarantor";
  onDocumentChange: (person: string, documentType: string, files: File[]) => void;
}

export function DocumentSection({ title, person, onDocumentChange }: DocumentSectionProps) {
  const documentTypes = [
    {
      key: "id",
      label: "Photo ID / Driver's License",
      description: "PNG, JPG, PDF up to 10MB",
      accept: ".pdf,.jpg,.jpeg,.png"
    },
    {
      key: "ssn",
      label: "Social Security Card",
      description: "PNG, JPG, PDF up to 10MB",
      accept: ".pdf,.jpg,.jpeg,.png"
    },
    {
      key: "payStubs",
      label: "Pay Stubs (Last 2-4)",
      description: "PDF up to 10MB each",
      accept: ".pdf",
      multiple: true
    },
    {
      key: "taxReturns",
      label: "Tax Returns (Previous Year)",
      description: "PDF up to 10MB",
      accept: ".pdf"
    },
    {
      key: "bankStatements",
      label: "Bank Statements",
      description: "PDF up to 10MB each",
      accept: ".pdf",
      multiple: true
    },
    {
      key: "employmentLetter",
      label: "Employment Letter",
      description: "PDF up to 10MB",
      accept: ".pdf"
    }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {documentTypes.map((docType) => (
            <FileUpload
              key={docType.key}
              label={docType.label}
              description={docType.description}
              accept={docType.accept}
              multiple={docType.multiple || false}
              onFileChange={(files) => onDocumentChange(person, docType.key, files)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
