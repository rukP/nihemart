"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  RefreshCw,
  CreditCard,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface PaymentStatus {
  id: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  reference: string;
  transactionId?: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  completedAt?: string;
  checkoutUrl?: string;
  failureReason?: string;
  kpayStatus?: {
    statusId: string;
    statusDescription: string;
    momTransactionId?: string;
  };
}

export interface PaymentStatusDisplayProps {
  payment: PaymentStatus;
  onRefresh?: () => void;
  onRetry?: () => void;
  isLoading?: boolean;
  className?: string;
}

const StatusIcon = ({ status, size = 'default' }: { 
  status: PaymentStatus['status']; 
  size?: 'small' | 'default' | 'large';
}) => {
  const iconSize = size === 'small' ? 'h-4 w-4' : size === 'large' ? 'h-8 w-8' : 'h-6 w-6';
  
  switch (status) {
    case 'completed':
      return <CheckCircle2 className={`${iconSize} text-green-600`} />;
    case 'failed':
    case 'cancelled':
      return <XCircle className={`${iconSize} text-red-600`} />;
    case 'pending':
      return <Clock className={`${iconSize} text-orange-600`} />;
    default:
      return <AlertTriangle className={`${iconSize} text-gray-600`} />;
  }
};

const StatusBadge = ({ status }: { status: PaymentStatus['status'] }) => {
  const variants = {
    completed: { className: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
    failed: { className: 'bg-red-100 text-red-800 border-red-200', label: 'Failed' },
    cancelled: { className: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Cancelled' },
    pending: { className: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Pending' },
  };

  const variant = variants[status];
  
  return (
    <Badge className={`${variant.className} border text-sm font-medium`}>
      <StatusIcon status={status} size="small" />
      <span className="ml-1">{variant.label}</span>
    </Badge>
  );
};

export default function PaymentStatusDisplay({
  payment,
  onRefresh,
  onRetry,
  isLoading = false,
  className = '',
}: PaymentStatusDisplayProps) {
  const { t } = useLanguage();
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh for pending payments
  useEffect(() => {
    if (payment.status === 'pending' && onRefresh && autoRefresh) {
      const interval = setInterval(() => {
        onRefresh();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [payment.status, onRefresh, autoRefresh]);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-RW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  return (
    <Card className={`border border-gray-200 shadow-sm ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon status={payment.status} size="large" />
            <div>
              <CardTitle className="text-lg font-medium text-gray-900">
                Payment Status
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Reference: {payment.reference}
              </p>
            </div>
          </div>
          <StatusBadge status={payment.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Amount</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatAmount(payment.amount, payment.currency)}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Payment Method</p>
            <p className="text-sm text-gray-900 capitalize">
              {payment.paymentMethod.replace(/_/g, ' ')}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Created</p>
            <p className="text-sm text-gray-600">
              {formatDate(payment.createdAt)}
            </p>
          </div>

          {payment.completedAt && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Completed</p>
              <p className="text-sm text-gray-600">
                {formatDate(payment.completedAt)}
              </p>
            </div>
          )}
        </div>

        {/* Transaction Details */}
        {payment.transactionId && (
          <div>
            <Separator className="mb-4" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Transaction Details</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Transaction ID</p>
                <p className="text-sm font-mono text-gray-900 break-all">
                  {payment.transactionId}
                </p>
                {payment.kpayStatus?.momTransactionId && (
                  <>
                    <p className="text-xs text-gray-600 mb-1 mt-2">Mobile Money Transaction ID</p>
                    <p className="text-sm font-mono text-gray-900 break-all">
                      {payment.kpayStatus.momTransactionId}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Status-specific Messages */}
        {payment.status === 'pending' && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-orange-900 mb-1">
                  Payment Processing
                </p>
                <p className="text-sm text-orange-800 leading-relaxed">
                  {payment.checkoutUrl ? (
                    <>
                      Please complete your payment. If you haven&apos;t been redirected,
                      <a 
                        href={payment.checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 ml-1 text-orange-700 hover:text-orange-900 underline"
                      >
                        click here to pay
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </>
                  ) : (
                    'Your payment is being processed. This may take a few minutes.'
                  )}
                </p>
                {payment.kpayStatus?.statusDescription && (
                  <p className="text-xs text-orange-700 mt-2">
                    {payment.kpayStatus.statusDescription}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {payment.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900 mb-1">
                  Payment Successful
                </p>
                <p className="text-sm text-green-800">
                  Your payment has been processed successfully. You will receive a confirmation email shortly.
                </p>
              </div>
            </div>
          </div>
        )}

        {(payment.status === 'failed' || payment.status === 'cancelled') && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-red-900 mb-1">
                  Payment {payment.status === 'failed' ? 'Failed' : 'Cancelled'}
                </p>
                <p className="text-sm text-red-800">
                  {payment.failureReason || 
                   payment.kpayStatus?.statusDescription || 
                   'Your payment could not be processed.'}
                </p>
                {payment.status === 'failed' && (
                  <p className="text-xs text-red-700 mt-2">
                    Please try again or contact support if the problem persists.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4">
          {payment.status === 'pending' && onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onRefresh();
                setAutoRefresh(!autoRefresh);
              }}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {autoRefresh ? 'Stop Auto Refresh' : 'Refresh Status'}
            </Button>
          )}

          {(payment.status === 'failed' || payment.status === 'cancelled') && onRetry && (
            <Button
              size="sm"
              onClick={onRetry}
              disabled={isLoading}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            >
              <CreditCard className="h-4 w-4" />
              Try Again
            </Button>
          )}

          {payment.checkoutUrl && payment.status === 'pending' && (
            <Button
              size="sm"
              asChild
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Complete Payment
              </a>
            </Button>
          )}
        </div>

        {/* Auto-refresh indicator */}
        {autoRefresh && payment.status === 'pending' && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            Auto-refreshing every 10 seconds...
          </div>
        )}
      </CardContent>
    </Card>
  );
}