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
import { PDFGenerator } from "@/lib/pdf-generator";
import { Download, FileText, Save, Users, UserCheck, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const applicationSchema = z.object({
  // Application Info
  buildingAddress: z.string().min(1, "Building address is required"),
  apartmentNumber: z.string().min(1, "Apartment number is required"),
  moveInDate: z.date({ required_error: "Move-in date is required" }),
  monthlyRent: z.number().min(0, "Monthly rent must be positive"),
  apartmentType: z.string().min(1, "Apartment type is required"),
  howDidYouHear: z.string().optional(),
  
  // Primary Applicant
  applicantName: z.string().min(1, "Full name is required"),
  applicantDob: z.date({ required_error: "Date of birth is required" }),
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
  
  // Conditional fields
  hasCoApplicant: z.boolean().default(false),
  hasGuarantor: z.boolean().default(false),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export function ApplicationForm() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<any>({
    application: {},
    applicant: {},
    coApplicant: {},
    guarantor: {},
  });
  const [signatures, setSignatures] = useState<any>({});
  const [documents, setDocuments] = useState<any>({});
  const [hasCoApplicant, setHasCoApplicant] = useState(false);
  const [hasGuarantor, setHasGuarantor] = useState(false);
  const [sameAddressCoApplicant, setSameAddressCoApplicant] = useState(false);
  const [sameAddressGuarantor, setSameAddressGuarantor] = useState(false);

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      hasCoApplicant: false,
      hasGuarantor: false,
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
    }));
    
    toast({
      title: "Draft Saved",
      description: "Your application has been saved as a draft.",
    });
  };

  const onSubmit = (data: ApplicationFormData) => {
    console.log("Submitting application:", { ...data, formData, signatures, documents });
    
    toast({
      title: "Application Submitted",
      description: "Your rental application has been submitted successfully.",
    });
    
    generatePDF();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
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
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={saveDraft} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button type="button" variant="outline" onClick={generatePDF} className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Generate PDF
            </Button>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 w-full sm:w-auto text-center sm:text-right">
            <CalendarDays className="w-4 h-4 inline mr-1" />
            Today: {new Date().toLocaleDateString()}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Application Requirements */}
            <Card className="border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="mb-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Application Requirements
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Applicants must show income of <strong>40 TIMES THE MONTHLY RENT</strong>
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Guarantors must show income of <strong>80 TIMES THE MONTHLY RENT</strong>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        <strong>$50.00</strong> non-refundable processing fee per adult
                      </div>
                      <div className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Applications must be submitted in full
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Application Information */}
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
                        <FormLabel>Building Address *</FormLabel>
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
                        <FormLabel>Apartment # *</FormLabel>
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
                        <FormLabel>Move-in Date *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={(date) => {
                              field.onChange(date);
                              updateFormData('application', 'moveInDate', date?.toISOString());
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
                        <FormLabel>Monthly Rent ($) *</FormLabel>
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
                        <FormLabel>Apartment Type *</FormLabel>
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

            {/* Primary Applicant Information */}
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
                          <FormLabel>Full Name *</FormLabel>
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
                        <FormLabel>Date of Birth *</FormLabel>
                        <FormControl>
                          <DatePicker
                            value={field.value}
                            onChange={(date) => {
                              field.onChange(date);
                              updateFormData('applicant', 'dob', date?.toISOString());
                            }}
                            placeholder="Select date of birth"
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
                        <FormLabel>Social Security Number *</FormLabel>
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
                        <FormLabel>Phone Number *</FormLabel>
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
                        <FormLabel>Email Address *</FormLabel>
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
                            <FormLabel>Street Address *</FormLabel>
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
                          <FormLabel>City *</FormLabel>
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
                          <FormLabel>State *</FormLabel>
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
                          <FormLabel>ZIP Code *</FormLabel>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="applicantLandlordName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Landlord Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Landlord name" 
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
                        <FormLabel>Current Monthly Rent ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field}
                            className="input-field"
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              field.onChange(value);
                              updateFormData('applicant', 'currentRent', value);
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
                  name="applicantReasonForMoving"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Moving</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Why are you moving?" 
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
              </CardContent>
            </Card>

            {/* Primary Applicant Financial Information */}
            <FinancialSection 
              title="Primary Applicant Financial Information"
              person="applicant"
              formData={formData}
              updateFormData={updateFormData}
            />

            {/* Primary Applicant Documents */}
            <DocumentSection 
              title="Primary Applicant Documents"
              person="applicant"
              onDocumentChange={handleDocumentChange}
            />

            {/* Co-Applicant Option */}
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

            {/* Co-Applicant Information */}
            {hasCoApplicant && (
              <div className="conditional-section">
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
                        <Label>Relationship to Primary Applicant *</Label>
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
                          onChange={(date) => updateFormData('coApplicant', 'dob', date?.toISOString())}
                          placeholder="Select date of birth"
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
                  </CardContent>
                </Card>

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
                />
              </div>
            )}

            {/* Guarantor Information */}
            {hasGuarantor && (
              <div className="conditional-section">
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
                        <Label>Full Name *</Label>
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
                          onChange={(date) => updateFormData('guarantor', 'dob', date?.toISOString())}
                          placeholder="Select date of birth"
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
                  </CardContent>
                </Card>

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
                />
              </div>
            )}

            {/* Signatures */}
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Digital Signatures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button 
                type="submit" 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 sm:px-12 py-3 text-base sm:text-lg font-semibold w-full sm:w-auto max-w-md"
              >
                Submit Application
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}