"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Smartphone, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { PAYMENT_METHODS } from '@/lib/services/kpay';
import Image from 'next/image';
import mtnLogo from '@/assets/icons/mtn.png';
import airtelLogo from '@/assets/icons/airtel.png';

interface MobileMoneyPhoneDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  paymentMethod: 'mtn_momo' | 'airtel_money';
  onConfirm: (phoneNumber: string) => void;
  initialPhone?: string;
}

export default function MobileMoneyPhoneDialog({
  isOpen,
  onOpenChange,
  paymentMethod,
  onConfirm,
  initialPhone = '',
}: MobileMoneyPhoneDialogProps) {
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneValue, setPhoneValue] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  // Reset phone number when dialog opens
  useEffect(() => {
    if (isOpen) {
      const formatted = formatPhoneForDisplay(initialPhone);
      setPhoneDisplay(formatted);
      setPhoneValue(initialPhone);
      setError('');
      validatePhone(initialPhone);
    }
  }, [isOpen, initialPhone]);

  const formatPhoneForDisplay = (input: string): string => {
    const cleaned = input.replace(/[^\d]/g, '');
    
    // Format as 078 123 4567
    if (cleaned.startsWith('07')) {
      const digits = cleaned;
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    }
    
    return cleaned;
  };

  const normalizePhoneValue = (raw: string): string => {
    const digits = raw.replace(/[^\d]/g, '');
    
    // Return in 07XXXXXXXX format (10 digits)
    if (digits.startsWith('07') && digits.length <= 10) {
      return digits;
    }
    
    return digits;
  };

  const validateMobileOperator = (phone: string): { valid: boolean; message?: string } => {
    const cleaned = phone.replace(/[^\d]/g, '');
    
    if (cleaned.length !== 10) {
      return { valid: false, message: 'Phone number must be 10 digits' };
    }

    if (!cleaned.startsWith('07')) {
      return { valid: false, message: 'Phone number must start with 07' };
    }
    
    if (paymentMethod === 'mtn_momo') {
      // MTN numbers start with 078, 077, 076, 079
      if (/^0(78|77|76|79)/.test(cleaned)) {
        return { valid: true };
      }
      return { 
        valid: false, 
        message: 'Please enter a valid MTN number (078, 077, 076, or 079)' 
      };
    } else if (paymentMethod === 'airtel_money') {
      // Airtel numbers start with 073, 072, 070
      if (/^0(73|72|70)/.test(cleaned)) {
        return { valid: true };
      }
      return { 
        valid: false, 
        message: 'Please enter a valid Airtel number (073, 072, or 070)' 
      };
    }
    
    return { valid: false };
  };

  const validatePhone = (phone: string) => {
    const validation = validateMobileOperator(phone);
    setIsValid(validation.valid);
    return validation;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    const formatted = formatPhoneForDisplay(input);
    const normalized = normalizePhoneValue(input);

    // Enforce max length of 10 digits
    if (normalized.length <= 10) {
      setPhoneDisplay(formatted);
      setPhoneValue(normalized);
      setError('');
      
      // Real-time validation feedback
      if (normalized.length === 10) {
        const validation = validatePhone(normalized);
        if (!validation.valid && validation.message) {
          setError(validation.message);
        }
      } else {
        setIsValid(false);
      }
    }
  };

  const handleConfirm = () => {
    const trimmedPhone = phoneValue.trim();
    
    if (!trimmedPhone) {
      setError('Phone number is required');
      return;
    }

    if (trimmedPhone.length !== 10) {
      setError('Please enter a complete 10-digit phone number');
      return;
    }

    const validation = validateMobileOperator(trimmedPhone);
    if (!validation.valid) {
      setError(validation.message || 'Invalid phone number');
      return;
    }

    onConfirm(trimmedPhone);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isValid) {
      handleConfirm();
    }
  };

  const getPaymentMethodInfo = () => {
    const method = PAYMENT_METHODS[paymentMethod];
    const isMTN = paymentMethod === 'mtn_momo';
    
    return {
      name: method.name,
      prefixes: isMTN ? ['078', '077', '076', '079'] : ['073', '072', '070'],
      color: isMTN ? 'text-yellow-600' : 'text-red-600',
      bgColor: isMTN ? 'bg-gradient-to-br from-yellow-50 to-orange-50' : 'bg-gradient-to-br from-red-50 to-pink-50',
      borderColor: isMTN ? 'border-yellow-300' : 'border-red-300',
      iconBg: isMTN ? 'bg-yellow-100' : 'bg-red-100',
      logo: isMTN ? mtnLogo : airtelLogo,
    };
  };

  const methodInfo = getPaymentMethodInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 overflow-hidden">
        {/* Compact Header */}
        <div className={`${methodInfo.bgColor} px-6 py-4`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center p-2">
              <Image
                src={methodInfo.logo}
                alt={methodInfo.name}
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900">
                {methodInfo.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 mt-0.5">
                Mobile Money Payment
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Main Content - Compact */}
        <div className="px-6 py-5 space-y-4">
          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-900">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder={methodInfo.prefixes[0] + ' 123 4567'}
                value={phoneDisplay}
                onChange={handlePhoneChange}
                onKeyPress={handleKeyPress}
                className={`px-4 pr-12 h-12 text-lg font-bold tracking-wide transition-all ${
                  error 
                    ? 'border-red-500 focus-visible:ring-red-500' 
                    : isValid 
                    ? 'border-green-500 focus-visible:ring-green-500' 
                    : 'border-gray-300'
                }`}
                autoFocus
                maxLength={12}
              />
              {isValid && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
              )}
            </div>
            
            {/* Compact info/error */}
            {error ? (
              <div className="flex items-center gap-2 text-xs text-red-600">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-500">
                Starts with: {methodInfo.prefixes.join(', ')} • {phoneValue.length}/10 digits
              </p>
            )}
          </div>
        </div>

        {/* Compact Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex-1 h-10 text-sm"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!isValid}
              className="flex-1 h-10 text-sm bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}