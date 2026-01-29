"use client";

import { useState, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DiscountsTable from "@/components/admin/discounts-table";
import ViewDiscountDialog from "@/components/admin/view-discount-dialog";
import AddEditDiscountDialog from "@/components/admin/add-edit-discount-dialog";
import {
  fetchDiscounts,
  deleteDiscount,
  type Discount,
  DiscountStatus,
} from "@/lib/api/discounts";
import { useDebounce } from "@/hooks/use-debounce";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DiscountsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<DiscountStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [viewingDiscount, setViewingDiscount] = useState<Discount | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [deletingDiscountId, setDeletingDiscountId] = useState<string | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const queryClient = useQueryClient();

  const {
    data: discountsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["discounts", debouncedSearchTerm, statusFilter, currentPage],
    queryFn: () =>
      fetchDiscounts({
        search: debouncedSearchTerm,
        status: statusFilter,
        page: currentPage,
        limit: 25,
      }),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const discounts = discountsData?.data || [];
  const totalCount = discountsData?.count || 0;
  const totalPages = Math.ceil(totalCount / 25);

  const loadDiscounts = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDiscountSuccess = () => {
    setIsDiscountDialogOpen(false);
    setEditingDiscount(null);
    queryClient.invalidateQueries({ queryKey: ["discounts"] });
    loadDiscounts();
  };

  const handleAddDiscount = () => {
    setEditingDiscount(null);
    setIsDiscountDialogOpen(true);
  };

  const handleEditDiscount = (discount: Discount) => {
    setEditingDiscount(discount);
    setIsDiscountDialogOpen(true);
  };

  const handleDeleteDiscount = async (id: string) => {
    setDeletingDiscountId(id);
  };

  const confirmDelete = async () => {
    if (!deletingDiscountId) return;

    try {
      await deleteDiscount(deletingDiscountId);
      toast.success("Discount deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["discounts"] });
      loadDiscounts();
    } catch (error: any) {
      console.error("Failed to delete discount:", error);
      toast.error(error.message || "Failed to delete discount");
    } finally {
      setDeletingDiscountId(null);
    }
  };

  const handleViewDiscount = (discount: Discount) => {
    setViewingDiscount(discount);
    setIsViewDialogOpen(true);
  };

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Discounts & Offers
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage discounts, promo codes, and special offers for your products.
          </p>
        </div>
        <Button
          onClick={handleAddDiscount}
          className="sm:self-start flex items-center space-x-2 bg-green-600 hover:bg-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Discount
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search discounts by name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full md:w-1/2 border-gray-300 rounded-md"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as DiscountStatus | "all");
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value={DiscountStatus.active}>Active</SelectItem>
            <SelectItem value={DiscountStatus.inactive}>Inactive</SelectItem>
            <SelectItem value={DiscountStatus.scheduled}>Scheduled</SelectItem>
            <SelectItem value={DiscountStatus.expired}>Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DiscountsTable
        discounts={discounts}
        loading={isLoading}
        onEdit={handleEditDiscount}
        onView={handleViewDiscount}
        onDelete={handleDeleteDiscount}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing page {currentPage} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ViewDiscountDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        discount={viewingDiscount}
      />

      <AddEditDiscountDialog
        open={isDiscountDialogOpen}
        onOpenChange={setIsDiscountDialogOpen}
        onSuccess={handleDiscountSuccess}
        discount={editingDiscount}
      />

      <AlertDialog open={!!deletingDiscountId} onOpenChange={() => setDeletingDiscountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this discount.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingDiscountId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
