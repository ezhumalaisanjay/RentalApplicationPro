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
import { FinancialSection } from "./financial-section";
import { DocumentSection } from "./document-section";
import { PDFGenerator } from "@/lib/pdf-generator";
import { Download, FileText, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const applicationSchema = z.object({
  // Application Info
  buildingAddress: z.string().min(1, "Building address is required"),
  apartmentNumber: z.string().min(1, "Apartment number is required"),
  moveInDate: z.string().min(1, "Move-in date is required"),
  monthlyRent: z.number().min(0, "Monthly rent must be positive"),
  apartmentType: z.string().min(1, "Apartment type is required"),
  howDidYouHear: z.string().optional(),
  
  // Primary Applicant
  applicantName: z.string().min(1, "Full name is required"),
  applicantDob: z.string().min(1, "Date of birth is required"),
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
    
    // Create download link
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
    }));
    
    toast({
      title: "Draft Saved",
      description: "Your application has been saved as a draft.",
    });
  };

  const onSubmit = (data: ApplicationFormData) => {
    // Here you would submit to your backend API
    console.log("Submitting application:", { ...data, formData, signatures, documents });
    
    toast({
      title: "Application Submitted",
      description: "Your rental application has been submitted successfully.",
    });
    
    // Generate and download PDF
    generatePDF();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Liberty Place Property Management</h1>
            <p className="text-sm text-gray-600 mt-1">122 East 42nd Street, Suite 1903, New York, NY 10168</p>
            <p className="text-sm text-gray-600">Tel: (646) 545-6700 | Fax: (646) 304-2255</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Application Information */}
            <Card>
              <CardHeader>
                <CardTitle>Application Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-medium text-blue-900 mb-2">Requirements:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Applicants must show income of 40 TIMES THE MONTHLY RENT</li>
                    <li>• Guarantors must show income of 80 TIMES THE MONTHLY RENT</li>
                    <li>• $50.00 non-refundable processing fee per adult applicant and guarantor</li>
                    <li>• Applications must be submitted in full</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Today's Date</Label>
                    <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} disabled />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="buildingAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter building address" {...field} 
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
                          <Input placeholder="e.g., 5A" {...field}
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
                          <Input type="date" {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              updateFormData('application', 'moveInDate', e.target.value);
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
                    name="monthlyRent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monthly Rent ($) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field}
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
                              <SelectValue placeholder="Select type" />
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
                  <Label>How did you hear about us?</Label>
                  <div className="flex flex-wrap gap-4 mt-2">
                    {['Building Sign', 'Craigslist', 'Broker', 'Other'].map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox 
                          id={option}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateFormData('application', 'howDidYouHear', option);
                            }
                          }}
                        />
                        <Label htmlFor={option} className="text-sm">{option}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Primary Applicant Information */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Applicant Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <FormField
                      control={form.control}
                      name="applicantName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter full name" {...field}
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
                          <Input type="date" {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              updateFormData('applicant', 'dob', e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="applicantSsn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Social Security Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="XXX-XX-XXXX" {...field}
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
                          <Input placeholder="(555) 123-4567" {...field}
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
                          <Input type="email" placeholder="email@example.com" {...field}
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

                {/* Address fields and other applicant info would continue here... */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Driver's License Number</Label>
                    <Input 
                      placeholder="Enter license number"
                      onChange={(e) => updateFormData('applicant', 'license', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>License State</Label>
                    <Select onValueChange={(value) => updateFormData('applicant', 'licenseState', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NY">New York</SelectItem>
                        <SelectItem value="NJ">New Jersey</SelectItem>
                        <SelectItem value="CT">Connecticut</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <FormField
                    control={form.control}
                    name="applicantAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field}
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
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    <FormField
                      control={form.control}
                      name="applicantCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="City" {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                updateFormData('applicant', 'city', e.target.value);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="applicantState"
                      render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            updateFormData('applicant', 'state', value);
                          }}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="State" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="NY">NY</SelectItem>
                              <SelectItem value="NJ">NJ</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="applicantZip"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="ZIP" {...field}
                              onChange={(e) => {
                                field.onChange(e);
                                updateFormData('applicant', 'zip', e.target.value);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <Input 
                      placeholder="Length at address"
                      onChange={(e) => updateFormData('applicant', 'lengthAtAddress', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Current Landlord Name</Label>
                    <Input 
                      placeholder="Landlord name"
                      onChange={(e) => updateFormData('applicant', 'landlordName', e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>Current Monthly Rent ($)</Label>
                    <Input 
                      type="number" 
                      placeholder="0.00"
                      onChange={(e) => updateFormData('applicant', 'currentRent', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Reason for Moving</Label>
                  <Textarea 
                    placeholder="Explain reason for moving"
                    onChange={(e) => updateFormData('applicant', 'reasonForMoving', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Co-Applicant Toggle */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Checkbox 
                    id="coApplicantToggle"
                    checked={hasCoApplicant}
                    onCheckedChange={(checked) => {
                      setHasCoApplicant(!!checked);
                      form.setValue('hasCoApplicant', !!checked);
                    }}
                  />
                  <Label htmlFor="coApplicantToggle" className="text-lg font-semibold cursor-pointer">
                    Add Co-Applicant
                  </Label>
                </div>
                
                {hasCoApplicant && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-800">Co-Applicant Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2">
                        <Label>Full Name *</Label>
                        <Input 
                          placeholder="Enter full name"
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
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Social Security Number *</Label>
                        <Input 
                          placeholder="XXX-XX-XXXX"
                          onChange={(e) => updateFormData('coApplicant', 'ssn', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label>Date of Birth *</Label>
                        <Input 
                          type="date"
                          onChange={(e) => updateFormData('coApplicant', 'dob', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label>Phone Number *</Label>
                        <Input 
                          placeholder="(555) 123-4567"
                          onChange={(e) => updateFormData('coApplicant', 'phone', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Email Address *</Label>
                      <Input 
                        type="email" 
                        placeholder="email@example.com"
                        onChange={(e) => updateFormData('coApplicant', 'email', e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="flex items-center space-x-3 mb-4">
                        <Checkbox 
                          id="sameAddressCoApplicant"
                          checked={sameAddressCoApplicant}
                          onCheckedChange={(checked) => {
                            setSameAddressCoApplicant(!!checked);
                            if (checked) {
                              // Copy primary applicant address
                              updateFormData('coApplicant', 'address', formData.applicant.address);
                              updateFormData('coApplicant', 'city', formData.applicant.city);
                              updateFormData('coApplicant', 'state', formData.applicant.state);
                              updateFormData('coApplicant', 'zip', formData.applicant.zip);
                            }
                          }}
                        />
                        <Label htmlFor="sameAddressCoApplicant" className="cursor-pointer">
                          Same address as primary applicant
                        </Label>
                      </div>
                      
                      {!sameAddressCoApplicant && (
                        <div>
                          <Label>Current Address</Label>
                          <Input 
                            placeholder="Street address" 
                            className="mb-2"
                            onChange={(e) => updateFormData('coApplicant', 'address', e.target.value)}
                          />
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <Input 
                              placeholder="City"
                              onChange={(e) => updateFormData('coApplicant', 'city', e.target.value)}
                            />
                            <Select onValueChange={(value) => updateFormData('coApplicant', 'state', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="State" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NY">NY</SelectItem>
                                <SelectItem value="NJ">NJ</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input 
                              placeholder="ZIP"
                              onChange={(e) => updateFormData('coApplicant', 'zip', e.target.value)}
                            />
                            <Input 
                              placeholder="Length at address"
                              onChange={(e) => updateFormData('coApplicant', 'lengthAtAddress', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Guarantor Toggle */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Checkbox 
                    id="guarantorToggle"
                    checked={hasGuarantor}
                    onCheckedChange={(checked) => {
                      setHasGuarantor(!!checked);
                      form.setValue('hasGuarantor', !!checked);
                    }}
                  />
                  <Label htmlFor="guarantorToggle" className="text-lg font-semibold cursor-pointer">
                    Add Guarantor
                  </Label>
                </div>
                
                {hasGuarantor && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-800">Guarantor Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2">
                        <Label>Full Name *</Label>
                        <Input 
                          placeholder="Enter full name"
                          onChange={(e) => updateFormData('guarantor', 'name', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label>Relationship to Applicant(s)</Label>
                        <Select onValueChange={(value) => updateFormData('guarantor', 'relationship', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="relative">Relative</SelectItem>
                            <SelectItem value="friend">Friend</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Social Security Number *</Label>
                        <Input 
                          placeholder="XXX-XX-XXXX"
                          onChange={(e) => updateFormData('guarantor', 'ssn', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label>Date of Birth *</Label>
                        <Input 
                          type="date"
                          onChange={(e) => updateFormData('guarantor', 'dob', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label>Phone Number *</Label>
                        <Input 
                          placeholder="(555) 123-4567"
                          onChange={(e) => updateFormData('guarantor', 'phone', e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Email Address *</Label>
                      <Input 
                        type="email" 
                        placeholder="email@example.com"
                        onChange={(e) => updateFormData('guarantor', 'email', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label>Address</Label>
                      <Input 
                        placeholder="Street address" 
                        className="mb-2"
                        onChange={(e) => updateFormData('guarantor', 'address', e.target.value)}
                      />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <Input 
                          placeholder="City"
                          onChange={(e) => updateFormData('guarantor', 'city', e.target.value)}
                        />
                        <Select onValueChange={(value) => updateFormData('guarantor', 'state', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NY">NY</SelectItem>
                            <SelectItem value="NJ">NJ</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input 
                          placeholder="ZIP"
                          onChange={(e) => updateFormData('guarantor', 'zip', e.target.value)}
                        />
                        <Input 
                          placeholder="Length at address"
                          onChange={(e) => updateFormData('guarantor', 'lengthAtAddress', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Financial Information</h2>
              
              {/* Primary Applicant Financial */}
              <FinancialSection
                title="Primary Applicant Employment & Income"
                person="applicant"
                formData={formData}
                updateFormData={updateFormData}
              />
              
              {/* Co-Applicant Financial */}
              {hasCoApplicant && (
                <FinancialSection
                  title="Co-Applicant Employment & Income"
                  person="coApplicant"
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
              
              {/* Guarantor Financial */}
              {hasGuarantor && (
                <FinancialSection
                  title="Guarantor Employment & Income"
                  person="guarantor"
                  formData={formData}
                  updateFormData={updateFormData}
                />
              )}
            </div>

            {/* Supporting Documents */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Supporting Documents</h2>
              
              {/* Primary Applicant Documents */}
              <DocumentSection
                title="Primary Applicant Documents"
                person="applicant"
                onDocumentChange={handleDocumentChange}
              />
              
              {/* Co-Applicant Documents */}
              {hasCoApplicant && (
                <DocumentSection
                  title="Co-Applicant Documents"
                  person="coApplicant"
                  onDocumentChange={handleDocumentChange}
                />
              )}
              
              {/* Guarantor Documents */}
              {hasGuarantor && (
                <DocumentSection
                  title="Guarantor Documents"
                  person="guarantor"
                  onDocumentChange={handleDocumentChange}
                />
              )}
            </div>

            {/* Digital Signatures */}
            <Card>
              <CardHeader>
                <CardTitle>Digital Signatures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Primary Applicant Signature */}
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Primary Applicant Signature</h3>
                  <SignaturePad
                    onSignatureChange={(signature) => handleSignatureChange('applicant', signature)}
                  />
                  <div className="mt-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="applicantCertify" />
                      <Label htmlFor="applicantCertify" className="text-sm">
                        I certify that all information provided is true and accurate. I understand that false information may result in rejection of this application.
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Co-Applicant Signature */}
                {hasCoApplicant && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Co-Applicant Signature</h3>
                    <SignaturePad
                      onSignatureChange={(signature) => handleSignatureChange('coApplicant', signature)}
                    />
                    <div className="mt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="coApplicantCertify" />
                        <Label htmlFor="coApplicantCertify" className="text-sm">
                          I certify that all information provided is true and accurate. I understand that false information may result in rejection of this application.
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guarantor Signature */}
                {hasGuarantor && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-4">Guarantor Signature</h3>
                    <SignaturePad
                      onSignatureChange={(signature) => handleSignatureChange('guarantor', signature)}
                    />
                    <div className="mt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="guarantorCertify" />
                        <Label htmlFor="guarantorCertify" className="text-sm">
                          I certify that I will serve as guarantor for this lease and that all information provided is true and accurate.
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submission Actions */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={saveDraft}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save as Draft
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="secondary"
                    onClick={generatePDF}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Preview PDF
                  </Button>
                  
                  <Button 
                    type="submit"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Submit Application
                  </Button>
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    By submitting this application, you agree to the{' '}
                    <a href="#" className="text-blue-600 hover:text-blue-700 underline">
                      terms and conditions
                    </a>{' '}
                    and authorize a credit and background check.
                  </p>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  );
}
