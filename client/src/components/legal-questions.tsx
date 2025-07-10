import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface LegalQuestionsProps {
  formData: any;
  updateFormData: (field: string, value: any) => void;
}

export function LegalQuestions({ formData, updateFormData }: LegalQuestionsProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Legal Questions</CardTitle>
        <p className="text-sm text-gray-600">
          Please answer all questions truthfully. False information may result in denial of application.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bankruptcy */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasBankruptcy"
              checked={formData.hasBankruptcy || false}
              onCheckedChange={(checked) => updateFormData('hasBankruptcy', checked)}
            />
            <Label htmlFor="hasBankruptcy" className="text-sm font-medium">
              Have you ever filed for bankruptcy?
            </Label>
          </div>
          {formData.hasBankruptcy && (
            <div>
              <Label htmlFor="bankruptcyDetails">Please provide details:</Label>
              <Textarea
                id="bankruptcyDetails"
                placeholder="Include dates, type of bankruptcy, and current status..."
                value={formData.bankruptcyDetails || ''}
                onChange={(e) => updateFormData('bankruptcyDetails', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Eviction */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasEviction"
              checked={formData.hasEviction || false}
              onCheckedChange={(checked) => updateFormData('hasEviction', checked)}
            />
            <Label htmlFor="hasEviction" className="text-sm font-medium">
              Have you ever been evicted or asked to vacate a rental property?
            </Label>
          </div>
          {formData.hasEviction && (
            <div>
              <Label htmlFor="evictionDetails">Please provide details:</Label>
              <Textarea
                id="evictionDetails"
                placeholder="Include dates, reasons, and circumstances..."
                value={formData.evictionDetails || ''}
                onChange={(e) => updateFormData('evictionDetails', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Criminal History */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasCriminalHistory"
              checked={formData.hasCriminalHistory || false}
              onCheckedChange={(checked) => updateFormData('hasCriminalHistory', checked)}
            />
            <Label htmlFor="hasCriminalHistory" className="text-sm font-medium">
              Have you ever been convicted of a felony or misdemeanor?
            </Label>
          </div>
          {formData.hasCriminalHistory && (
            <div>
              <Label htmlFor="criminalHistoryDetails">Please provide details:</Label>
              <Textarea
                id="criminalHistoryDetails"
                placeholder="Include dates, charges, and current status..."
                value={formData.criminalHistoryDetails || ''}
                onChange={(e) => updateFormData('criminalHistoryDetails', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Pets */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasPets"
              checked={formData.hasPets || false}
              onCheckedChange={(checked) => updateFormData('hasPets', checked)}
            />
            <Label htmlFor="hasPets" className="text-sm font-medium">
              Do you have any pets?
            </Label>
          </div>
          {formData.hasPets && (
            <div>
              <Label htmlFor="petDetails">Please provide details:</Label>
              <Textarea
                id="petDetails"
                placeholder="Include type, breed, age, weight, and any certifications..."
                value={formData.petDetails || ''}
                onChange={(e) => updateFormData('petDetails', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {/* Smoking Status */}
        <div className="space-y-3">
          <Label htmlFor="smokingStatus" className="text-sm font-medium">
            Smoking Status *
          </Label>
          <Select
            value={formData.smokingStatus || ''}
            onValueChange={(value) => updateFormData('smokingStatus', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select smoking status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="non-smoker">Non-Smoker</SelectItem>
              <SelectItem value="smoker">Smoker</SelectItem>
              <SelectItem value="occasional">Occasional Smoker</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}