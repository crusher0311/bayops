import { useState } from 'react';
import { Input } from './input';
import { Button } from './button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Loader2, Search, CheckCircle, AlertCircle } from 'lucide-react';

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export interface PlateVehicleInfo {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  drivetrain?: string;
  engine?: string;
  transmission?: string;
}

interface PlateLookupProps {
  plateValue: string;
  stateValue: string;
  onPlateChange: (plate: string) => void;
  onStateChange: (state: string) => void;
  onLookup?: (info: PlateVehicleInfo) => void;
  disabled?: boolean;
}

export function PlateLookup({
  plateValue,
  stateValue,
  onPlateChange,
  onStateChange,
  onLookup,
  disabled,
}: PlateLookupProps) {
  const [isLooking, setIsLooking] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handlePlateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const plate = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    onPlateChange(plate);
    setLookupStatus('idle');
    setErrorMessage('');
  };

  const lookupPlate = async () => {
    if (!plateValue || !stateValue) {
      setLookupStatus('error');
      setErrorMessage('Please enter plate number and select state');
      return;
    }

    setIsLooking(true);
    setLookupStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(
        `/api/plate-lookup?plate=${encodeURIComponent(plateValue)}&state=${encodeURIComponent(stateValue)}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Plate lookup failed');
      }

      const data = await response.json();
      
      if (data.vin && data.make && data.model) {
        setLookupStatus('success');
        onLookup?.({
          vin: data.vin,
          year: data.year,
          make: data.make,
          model: data.model,
          trim: data.trim,
          drivetrain: data.drivetrain,
          engine: data.engine,
          transmission: data.transmission,
        });
      } else {
        setLookupStatus('error');
        setErrorMessage('No vehicle data found');
      }
    } catch (error: any) {
      console.error('Plate lookup error:', error);
      setLookupStatus('error');
      setErrorMessage(error.message || 'Failed to lookup plate');
    } finally {
      setIsLooking(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={stateValue} onValueChange={onStateChange} disabled={disabled || isLooking}>
          <SelectTrigger className="w-[100px]" data-testid="select-state">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            {US_STATES.map((state) => (
              <SelectItem key={state.code} value={state.code}>
                {state.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Input
            value={plateValue}
            onChange={handlePlateChange}
            placeholder="ABC-1234"
            disabled={disabled || isLooking}
            maxLength={8}
            data-testid="input-plate-lookup"
          />
          {lookupStatus === 'success' && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={lookupPlate}
          disabled={disabled || isLooking || !plateValue || !stateValue}
          data-testid="button-lookup-plate"
        >
          {isLooking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Lookup
            </>
          )}
        </Button>
      </div>
      
      {lookupStatus === 'error' && errorMessage && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {errorMessage}
        </p>
      )}
      
      {lookupStatus === 'success' && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Vehicle found! Info filled in below.
        </p>
      )}
    </div>
  );
}
