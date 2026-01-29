"use client";
import React, { useState, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadCloud, Download, AlertCircle, Loader2 } from "lucide-react";
import type { ProductBase, Category, Subcategory } from "@/lib/api/products";
import { createBulkProducts } from "@/lib/api/products";
import { cn } from "@/lib/utils";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  categories: Category[];
  subcategories: Subcategory[];
}

interface ParsedProductRow {
  data: Partial<ProductBase> & {
    category_name?: string;
    subcategory_name?: string;
  };
  errors: { [key: string]: string };
  rowIndex: number;
}

const REQUIRED_HEADERS = [
  "name",
  "price",
  "stock",
  "categories",
  "subcategories",
];

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
  categories,
  subcategories,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.name.toLowerCase(), c.id])),
    [categories]
  );
  const subcategoryMap = useMemo(
    () =>
      new Map(
        subcategories.map((s) => [
          s.name.toLowerCase(),
          { id: s.id, category_id: s.category_id },
        ])
      ),
    [subcategories]
  );

  const resetState = useCallback(() => {
    setFile(null);
    setParsedRows([]);
    setGeneralErrors([]);
    setIsProcessing(false);
    setIsSubmitting(false);
  }, []);

  const handleFileParse = (fileToParse: File) => {
    setIsProcessing(true);
    setGeneralErrors([]);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          setGeneralErrors(["The uploaded file is empty."]);
          setIsProcessing(false);
          return;
        }

        const headers = Object.keys(json[0]);
        const missingHeaders = REQUIRED_HEADERS.filter(
          (h) => !headers.includes(h)
        );
        if (missingHeaders.length > 0) {
          setGeneralErrors([
            `Missing required column headers: ${missingHeaders.join(", ")}.`,
          ]);
          setIsProcessing(false);
          return;
        }

        const processedRows: ParsedProductRow[] = json.map((row, index) => {
          const rowIndex = index + 2;
          const errors: { [key: string]: string } = {};

          if (
            !row.name ||
            typeof row.name !== "string" ||
            row.name.trim().length === 0
          )
            errors.name = "Name is required.";
          if (row.price === undefined || isNaN(parseFloat(row.price)))
            errors.price = "Price must be a number.";
          if (row.stock === undefined || !Number.isInteger(Number(row.stock)))
            errors.stock = "Stock must be a whole number.";

          // Parse categories and subcategories (comma-separated)
          const categoryNames =
            row.categories
              ?.split(",")
              .map((c: string) => c.trim().toLowerCase())
              .filter((c: string) => c) || [];
          const subcategoryNames =
            row.subcategories
              ?.split(",")
              .map((s: string) => s.trim().toLowerCase())
              .filter((s: string) => s) || [];

          const categoryIds: string[] = [];
          const subcategoryIds: string[] = [];

          for (const catName of categoryNames) {
            if (!categoryMap.has(catName)) {
              errors.categories = `Invalid category: "${catName}".`;
              break;
            }
            categoryIds.push(categoryMap.get(catName)!);
          }

          for (const subName of subcategoryNames) {
            if (!subcategoryMap.has(subName)) {
              errors.subcategories = `Invalid subcategory: "${subName}".`;
              break;
            }
            subcategoryIds.push(subcategoryMap.get(subName)!.id);
          }

          return {
            rowIndex,
            errors,
            data: {
              name: row.name,
              description: row.description || null,
              price: parseFloat(row.price),
              compare_at_price: row.compare_at_price
                ? parseFloat(row.compare_at_price)
                : null,
              stock: parseInt(row.stock, 10),
              sku: row.sku || null,
              brand: row.brand || null,
              weight_kg: row.weight_kg ? parseFloat(row.weight_kg) : null,
              status: "draft",
              categories: categoryIds,
              subcategories: subcategoryIds,
            },
          };
        });

        setParsedRows(processedRows);
      } catch (err) {
        setGeneralErrors([
          "Failed to process the file. Please ensure it is a valid Excel file.",
        ]);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(fileToParse);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        resetState();
        setFile(acceptedFiles[0]);
        handleFileParse(acceptedFiles[0]);
      }
    },
    [resetState]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    multiple: false,
  });

  const handleDownloadSample = () => {
    const sampleData = [
      {
        name: "Classic T-Shirt",
        description: "A comfortable 100% cotton t-shirt.",
        price: 19.99,
        compare_at_price: 24.99,
        stock: 100,
        categories: "Apparel",
        subcategories: "T-Shirts",
        sku: "TS-BLK-L",
        brand: "BrandName",
        weight_kg: 0.2,
      },
      {
        name: "Wireless Headphones",
        description:
          "Noise-cancelling over-ear headphones with 20-hour battery life.",
        price: 99.5,
        compare_at_price: "",
        stock: 50,
        categories: "Electronics",
        subcategories: "Audio",
        sku: "WH-001",
        brand: "TechBrand",
        weight_kg: 0.35,
      },
    ];
    const instructions = [
      ["Column", "Required", "Description", "Example"],
      ["name", "Yes", "The name of the product.", "Classic T-Shirt"],
      [
        "description",
        "No",
        "A short description of the product.",
        "A comfortable 100% cotton t-shirt.",
      ],
      ["price", "Yes", "The selling price of the product (numeric).", 19.99],
      [
        "compare_at_price",
        "No",
        "The original price, to show a discount (numeric).",
        24.99,
      ],
      ["stock", "Yes", "The number of items in stock (whole number).", 100],
      [
        "categories",
        "Yes",
        "Comma-separated list of category names (e.g., 'Apparel,Electronics').",
        "Apparel",
      ],
      [
        "subcategories",
        "Yes",
        "Comma-separated list of subcategory names.",
        "T-Shirts",
      ],
      [
        "sku",
        "No",
        "The Stock Keeping Unit for inventory tracking.",
        "TS-BLK-L",
      ],
      ["brand", "No", "The brand name of the product.", "BrandName"],
      [
        "weight_kg",
        "No",
        "The weight of the item in kilograms (numeric).",
        0.2,
      ],
    ];

    const productSheet = XLSX.utils.json_to_sheet(sampleData);
    productSheet["!cols"] = [
      { wch: 25 },
      { wch: 70 },
      { wch: 15 },
      { wch: 20 },
      { wch: 10 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
    ];

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
    instructionSheet["!cols"] = [
      { wch: 20 },
      { wch: 10 },
      { wch: 70 },
      { wch: 25 },
    ];

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, productSheet, "Products");
    XLSX.utils.book_append_sheet(wb, instructionSheet, "Instructions");

    XLSX.writeFile(wb, "Bulk_Upload_Template.xlsx");
  };

  const handleRowChange = (
    index: number,
    field: "categories" | "subcategories",
    value: string
  ) => {
    const newRows = [...parsedRows];
    const rowToUpdate = newRows[index];
    const currentArray = rowToUpdate.data[field] || [];
    if (!currentArray.includes(value)) {
      rowToUpdate.data[field] = [...currentArray, value];
    }

    const newErrors: { [key: string]: string } = {};
    if (field === "categories") {
      const cat = categories.find((c) => c.id === value);
      if (!cat) newErrors.categories = `Invalid category.`;
    } else if (field === "subcategories") {
      const sub = subcategories.find((s) => s.id === value);
      if (!sub) newErrors.subcategories = `Invalid subcategory.`;
    }
    rowToUpdate.errors = newErrors;
    setParsedRows(newRows);
  };

  const hasErrors = useMemo(
    () => parsedRows.some((row) => Object.keys(row.errors).length > 0),
    [parsedRows]
  );

  const handleSubmit = async () => {
    if (hasErrors) {
      setGeneralErrors([
        "Please fix all validation errors before creating products.",
      ]);
      return;
    }
    setIsSubmitting(true);
    setGeneralErrors([]);
    try {
      const productsToCreate = parsedRows.map((row) => {
        return {
          ...row.data,
          status: "draft",
        };
      });

      await createBulkProducts(productsToCreate as ProductBase[]);
      onUploadComplete();
      onClose();
    } catch (error: any) {
      console.error("Submission Error:", error);

      // This is the new, improved error handling block
      if (error && error.code === "23505") {
        const detail = error.details || "";
        const match = detail.match(/Key \((.*?)\)=\((.*?)\) already exists/);
        if (match && match[1] && match[2]) {
          const column = match[1];
          const value = match[2];
          setGeneralErrors([
            `Upload failed: A product with the ${column} "${value}" already exists. Please check your file for duplicate values.`,
          ]);
        } else {
          setGeneralErrors([
            "Upload failed due to a duplicate value (e.g., SKU). Please ensure all unique fields are unique.",
          ]);
        }
      } else {
        setGeneralErrors([
          "An error occurred during submission. Please check the console for details.",
        ]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          onClose();
          resetState();
        }
      }}
    >
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Add Products</DialogTitle>
        </DialogHeader>
        <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-6 overflow-hidden">
          <div className="col-span-1 flex flex-col gap-4">
            <div
              {...getRootProps()}
              className="flex-grow border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary p-4"
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
              {isDragActive ? (
                <p>Drop file here</p>
              ) : (
                <p>Drag & drop or click to upload</p>
              )}
            </div>
            {file && (
              <div className="p-3 border rounded-lg text-sm">
                <p className="font-medium truncate">{file.name}</p>
              </div>
            )}
            <Button onClick={handleDownloadSample} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </div>
          <div className="md:col-span-3 flex flex-col gap-4 overflow-hidden">
            {isProcessing && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
            {generalErrors.length > 0 && !isProcessing && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5">
                    {generalErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {parsedRows.length > 0 && !isProcessing && (
              <>
                <div className="flex justify-between items-center">
                  <p>{parsedRows.length} products to import.</p>
                  {hasErrors && (
                    <p className="text-sm text-red-600">
                      Please fix the errors highlighted in red.
                    </p>
                  )}
                </div>
                <ScrollArea className="flex-grow border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[40px]">Row</TableHead>
                        <TableHead className="min-w-[250px]">Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="min-w-[200px]">
                          Categories
                        </TableHead>
                        <TableHead className="min-w-[200px]">
                          Subcategories
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedRows.map((row, index) => {
                        const categoryId = categoryMap.get(
                          row.data.category_name?.toLowerCase() ?? ""
                        );
                        const validSubcategories = subcategories.filter(
                          (s) => s.category_id === categoryId
                        );

                        return (
                          <TableRow
                            key={row.rowIndex}
                            className={cn(
                              Object.keys(row.errors).length > 0 && "bg-red-50"
                            )}
                          >
                            <TableCell>{row.rowIndex}</TableCell>
                            <TableCell>{row.data.name}</TableCell>
                            <TableCell>{row.data.price}</TableCell>
                            <TableCell>{row.data.stock}</TableCell>
                            <TableCell>
                              <Select
                                onValueChange={(value) =>
                                  handleRowChange(index, "categories", value)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    row.errors.categories && "border-red-500"
                                  )}
                                >
                                  <SelectValue placeholder="Select category..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(row.data.categories || []).map(
                                  (catId: string) => {
                                    const cat = categories.find(
                                      (c) => c.id === catId
                                    );
                                    return cat ? (
                                      <span
                                        key={catId}
                                        className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs"
                                      >
                                        {cat.name}
                                      </span>
                                    ) : null;
                                  }
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                onValueChange={(value) =>
                                  handleRowChange(index, "subcategories", value)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    row.errors.subcategories && "border-red-500"
                                  )}
                                >
                                  <SelectValue placeholder="Select subcategory..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {subcategories.map((sub) => (
                                    <SelectItem key={sub.id} value={sub.id}>
                                      {sub.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(row.data.subcategories || []).map(
                                  (subId: string) => {
                                    const sub = subcategories.find(
                                      (s) => s.id === subId
                                    );
                                    return sub ? (
                                      <span
                                        key={subId}
                                        className="bg-green-100 text-green-800 px-1 py-0.5 rounded text-xs"
                                      >
                                        {sub.name}
                                      </span>
                                    ) : null;
                                  }
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </>
            )}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" onClick={resetState}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={
              parsedRows.length === 0 ||
              isSubmitting ||
              isProcessing ||
              hasErrors
            }
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create {parsedRows.length > 0 ? parsedRows.length : ""} Products
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
