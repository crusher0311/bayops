import { useState } from 'react';
import { Input } from './input';
import { Button } from './button';
import { Loader2, Search, CheckCircle, AlertCircle } from 'lucide-react';

export interface VehicleInfo {
  year: string;
  make: string;
  model: string;
  trim?: string;
  bodyClass?: string;
  engineCylinders?: string;
  engineDisplacement?: string;
  fuelType?: string;
  driveType?: string;
  transmission?: string;
  doors?: string;
}

interface VinDecoderProps {
  value: string;
  onChange: (vin: string) => void;
  onDecode?: (info: VehicleInfo) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function VinDecoder({
  value,
  onChange,
  onDecode,
  placeholder = "Enter 17-character VIN",
  className,
  disabled,
}: VinDecoderProps) {
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeStatus, setDecodeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vin = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
    onChange(vin);
    setDecodeStatus('idle');
    setErrorMessage('');
  };

  const decodeVin = async () => {
    if (value.length !== 17) {
      setDecodeStatus('error');
      setErrorMessage('VIN must be 17 characters');
      return;
    }

    setIsDecoding(true);
    setDecodeStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${value}?format=json`
      );
      
      if (!response.ok) {
        throw new Error('Failed to decode VIN');
      }

      const data = await response.json();
      const result = data.Results?.[0];

      if (!result || result.ErrorCode !== '0') {
        const errorText = result?.ErrorText || 'VIN not found in database';
        if (errorText.includes('0 - VIN decoded clean')) {
          const info: VehicleInfo = {
            year: result.ModelYear || '',
            make: result.Make || '',
            model: result.Model || '',
            trim: result.Trim || '',
            bodyClass: result.BodyClass || '',
            engineCylinders: result.EngineCylinders || '',
            engineDisplacement: result.DisplacementL ? `${result.DisplacementL}L` : '',
            fuelType: result.FuelTypePrimary || '',
            driveType: result.DriveType || '',
            transmission: result.TransmissionStyle || '',
            doors: result.Doors || '',
          };

          if (info.year && info.make && info.model) {
            setDecodeStatus('success');
            onDecode?.(info);
          } else {
            setDecodeStatus('error');
            setErrorMessage('Could not extract vehicle info');
          }
        } else {
          setDecodeStatus('error');
          setErrorMessage('VIN not found or invalid');
        }
        return;
      }

      const info: VehicleInfo = {
        year: result.ModelYear || '',
        make: result.Make || '',
        model: result.Model || '',
        trim: result.Trim || '',
        bodyClass: result.BodyClass || '',
        engineCylinders: result.EngineCylinders || '',
        engineDisplacement: result.DisplacementL ? `${result.DisplacementL}L` : '',
        fuelType: result.FuelTypePrimary || '',
        driveType: result.DriveType || '',
        transmission: result.TransmissionStyle || '',
        doors: result.Doors || '',
      };

      if (info.year && info.make && info.model) {
        setDecodeStatus('success');
        onDecode?.(info);
      } else {
        setDecodeStatus('error');
        setErrorMessage('Could not extract vehicle info');
      }
    } catch (error) {
      console.error('VIN decode error:', error);
      setDecodeStatus('error');
      setErrorMessage('Failed to decode VIN');
    } finally {
      setIsDecoding(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={className}
            disabled={disabled || isDecoding}
            maxLength={17}
            data-testid="input-vin"
          />
          {decodeStatus === 'success' && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={decodeVin}
          disabled={disabled || isDecoding || value.length !== 17}
          data-testid="button-decode-vin"
        >
          {isDecoding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Decode
            </>
          )}
        </Button>
      </div>
      
      {value.length > 0 && value.length < 17 && (
        <p className="text-xs text-muted-foreground">
          {value.length}/17 characters
        </p>
      )}
      
      {decodeStatus === 'error' && errorMessage && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {errorMessage}
        </p>
      )}
      
      {decodeStatus === 'success' && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Vehicle info decoded and filled in
        </p>
      )}
    </div>
  );
}
