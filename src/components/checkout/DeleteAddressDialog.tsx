'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ============================================================================
// DELETE ADDRESS DIALOG COMPONENT
// Confirmation dialog for deleting saved or temporary addresses.
// ============================================================================

export interface AddressToDelete {
  id?: string;
  _isTemp?: boolean;
  display_name?: string;
}

export interface DeleteAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addressToDelete: AddressToDelete | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAddressDialog({
  open,
  onOpenChange,
  addressToDelete,
  onConfirm,
  onCancel,
}: DeleteAddressDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Address</AlertDialogTitle>
          <AlertDialogDescription>
            {addressToDelete?._isTemp
              ? 'Are you sure you want to remove this temporary address?'
              : 'Are you sure you want to delete this address? This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DeleteAddressDialog;
