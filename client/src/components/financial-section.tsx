import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

interface FinancialSectionProps {
  title: string;
  person: "applicant" | "coApplicant" | "guarantor";
  formData: any;
  updateFormData: (person: string, field: string, value: any) => void;
}

export function FinancialSection({ title, person, formData, updateFormData }: FinancialSectionProps) {
  const personData = formData[person] || {};

  const handleChange = (field: string, value: string) => {
    updateFormData(person, field, value);
  };

  const handleDateChange = (field: string, date: Date | undefined) => {
    updateFormData(person, field, date?.toISOString());
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${person}-employer`}>Current Employer *</Label>
            <Input
              id={`${person}-employer`}
              placeholder="Company name"
              value={personData.employer || ""}
              onChange={(e) => handleChange("employer", e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor={`${person}-position`}>Position/Title *</Label>
            <Input
              id={`${person}-position`}
              placeholder="Job title"
              value={personData.position || ""}
              onChange={(e) => handleChange("position", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor={`${person}-employmentStart`}>Employment Start Date</Label>
            <DatePicker
              value={personData.employmentStart ? new Date(personData.employmentStart) : undefined}
              onChange={(date) => handleDateChange("employmentStart", date)}
              placeholder="Select employment start date"
            />
          </div>
          
          <div>
            <Label htmlFor={`${person}-income`}>Annual Income ($) *</Label>
            <Input
              id={`${person}-income`}
              type="number"
              placeholder="0.00"
              value={personData.income || ""}
              onChange={(e) => handleChange("income", e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor={`${person}-otherIncome`}>Other Income ($)</Label>
            <Input
              id={`${person}-otherIncome`}
              type="number"
              placeholder="0.00"
              value={personData.otherIncome || ""}
              onChange={(e) => handleChange("otherIncome", e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`${person}-otherIncomeSource`}>Other Income Source</Label>
          <Input
            id={`${person}-otherIncomeSource`}
            placeholder="e.g., investments, alimony, etc."
            value={personData.otherIncomeSource || ""}
            onChange={(e) => handleChange("otherIncomeSource", e.target.value)}
          />
        </div>

        <div className="space-y-3">
          <h4 className="text-md font-medium text-gray-700">Banking Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`${person}-bankName`}>Bank Name</Label>
              <Input
                id={`${person}-bankName`}
                placeholder="Bank name"
                value={personData.bankName || ""}
                onChange={(e) => handleChange("bankName", e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor={`${person}-accountType`}>Account Type</Label>
              <Select value={personData.accountType || ""} onValueChange={(value) => handleChange("accountType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
