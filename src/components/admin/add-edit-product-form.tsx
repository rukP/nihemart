"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import "quill/dist/quill.snow.css";
import { useCallback, useEffect, useState } from "react";
import { SubmitHandler, useForm, useFieldArray, useWatch } from "react-hook-form";
import { useQuill } from "react-quilljs";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, Upload, X, Trash2, Wand2 } from "lucide-react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { Checkbox } from "@/components/ui/checkbox";

import { supabase } from "@/integrations/supabase/client";
import { createProductWithImages, updateProductWithImages, fetchCategoriesWithSubcategories } from "@/integrations/supabase/products";
import type { ProductBase, ProductVariationInput, CategoryWithSubcategories, Subcategory, Product, ProductImage } from "@/integrations/supabase/products";
import { VariantGeneratorDialog } from "@/components/admin/variant-generator-dialog";
import { getProductErrorMessage } from "./admin-products-utils";

const optionalNumber = z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().optional()
);

const variationSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    price: z.coerce.number().min(0, "Price must be 0 or more"),
    stock: z.coerce.number().int("Stock must be a whole number").min(0),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    attributes: z.array(z.object({ name: z.string().min(1, "Attribute name is required"), value: z.string().min(1, "Attribute value is required") })),
    imageFiles: z.custom<File[]>().optional(),
    existingImages: z.custom<ProductImage[]>().optional(),
});

const productSchema = z.object({
      name: z.string().min(3, "Product name is required"),
      description: z.preprocess((val) => val === null || val === undefined || val === "" ? undefined : val, z.string().optional()),
      short_description: z.string().optional(),
      categories: z.array(z.string()).default([]),
      subcategories: z.array(z.string()).default([]),
      price: z.coerce.number().min(0, "Base price is required"),
      cost_price: z.coerce.number().min(0, "Cost price is required").optional(),
      compare_at_price: optionalNumber,
      status: z.enum(["draft", "active", "out_of_stock"]),
      sku: z.string().optional(),
      featured: z.boolean().default(false),
      track_quantity: z.boolean().default(true),
      continue_selling_when_oos: z.boolean().default(false),
      requires_shipping: z.boolean().default(true),
      taxable: z.boolean().default(false),
      dimensions: z.string().optional(),
      tags: z.array(z.string()).default([]),
      variations: z.array(variationSchema).min(0),
      social_media_link: z.string().optional(),
  });

type ProductFormData = z.infer<typeof productSchema>;
interface DisplayImage { url: string; file?: File; isExisting?: boolean; }
interface QuillToolbar { addHandler: (name: string, handler: () => void) => void; }

const uploadFileToBucket = async (file: File, bucket: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
};

export default function AddEditProductForm({ initialData }: { initialData?: { product: Product; mainImages: ProductImage[]; variations: any[] } }) {
    const isEditMode = !!initialData;
    const router = useRouter();
    const [mainImages, setMainImages] = useState<DisplayImage[]>([]);
    const [selectedMainImageIndex, setSelectedMainImageIndex] = useState(0);
    const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const { quill, quillRef } = useQuill({ theme: "snow" });

    const form = useForm({
        resolver: zodResolver(productSchema),
        // @ts-ignore
        defaultValues: isEditMode
            ? {
                  ...initialData.product,
                  name: initialData.product.name || 'Product Name',
                  status: initialData.product.status && ["draft", "active", "out_of_stock"].includes(initialData.product.status) ? initialData.product.status : "draft",
                  price: initialData.product.price ?? 0,
                  cost_price: initialData.product.cost_price ?? 0,
                  sku: initialData.product.sku ?? undefined,
                  compare_at_price: initialData.product.compare_at_price ?? null,
                  short_description: initialData.product.short_description ?? '',
                  categories: initialData.product.categories ?? [],
                  subcategories: initialData.product.subcategories ?? [],
                  dimensions: initialData.product.dimensions ?? '',
                  tags: initialData.product.tags ?? [],
                  social_media_link: initialData.product.social_media_link ?? '',
                  variations: initialData.variations.map(v => ({
                      id: undefined,
                      price: v.price ?? 0,
                      stock: v.stock ?? 0,
                      name: v.name ?? '',
                      sku: v.sku ?? '',
                      barcode: v.barcode ?? '',
                      attributes: Object.entries(v.attributes || {}).filter(([name, value]) => typeof value === 'string' && name.trim() && value.trim()).map(([name, value]) => ({ name: name.trim(), value: (value as string).trim() })),
                      imageFiles: [],
                      existingImages: v.images || [],
                  })),
              }
            : {
                  name: "",
                  status: "draft",
                  price: 0,
                  cost_price: 0,
                  compare_at_price: null,
                  featured: false,
                  track_quantity: true,
                  continue_selling_when_oos: false,
                  requires_shipping: true,
                  taxable: false,
                  categories: [],
                  subcategories: [],
                  tags: [],
                  social_media_link: "",
                  variations: [],
                 //  variations: [{ name: "Default", price: 0, stock: 0, attributes: [{ name: "Title", value: "Default" }], imageFiles: [] }],
              },
    });
    
    useEffect(() => {
        if(isEditMode && initialData.mainImages) {
            setMainImages(initialData.mainImages.map(img => ({ url: img.url, isExisting: true })));
            const primaryIndex = initialData.mainImages.findIndex(img => img.is_primary);
            if (primaryIndex !== -1) {
                setSelectedMainImageIndex(primaryIndex);
            }
        }
    }, [isEditMode, initialData]);


    const { fields: variationFields, append: appendVariation, remove: removeVariation, replace: replaceVariations } = useFieldArray({
        control: form.control,
        name: "variations",
    });

    const selectedCategories = useWatch({ control: form.control, name: 'categories' });

    useEffect(() => {
        async function loadCats() {
            const cats = await fetchCategoriesWithSubcategories();
            setCategories(cats);
        }
        loadCats();
    }, []);

    useEffect(() => {
        if (selectedCategories && selectedCategories.length > 0) {
            const allSubs = categories
                .filter(c => selectedCategories.includes(c.id))
                .flatMap(c => c.subcategories);
            setSubcategories(allSubs);
        } else {
            setSubcategories([]);
        }
    }, [selectedCategories, categories]);

    useEffect(() => {
        if (quill) {
            if (initialData?.product.description && quill.root.innerHTML === '<p><br></p>') {
                quill.clipboard.dangerouslyPasteHTML(initialData.product.description);
            }
            quill.on("text-change", () => form.setValue("description", quill.root.innerHTML));
            const toolbar = quill.getModule("toolbar") as QuillToolbar;
            toolbar.addHandler("image", () => {
                const input = document.createElement("input");
                input.setAttribute("type", "file");
                input.setAttribute("accept", "image/*");
                input.onchange = async () => {
                    if (input.files?.[0]) {
                        try {
                            const url = await uploadFileToBucket(input.files[0], "prodct-content-bucket");
                            const range = quill.getSelection(true);
                            quill.insertEmbed(range.index, "image", url);
                        } catch (error) {
                            console.error("Quill image upload failed", error);
                            toast.error("Image upload failed. Check RLS policies on storage bucket.");
                        }
                    }
                };
                input.click();
            });
        }
    }, [quill, form, initialData]);

    const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
        console.log("onSubmit called", { isValid: form.formState.isValid, errors: form.formState.errors });
        const toastId = toast.loading(isEditMode ? "Updating product..." : "Creating product...");
        console.log("Toast shown with id:", toastId);
        try {
            const productBaseData: ProductBase = {
                name: data.name,
                sku: data.sku || undefined,
                description: data.description,
                short_description: data.short_description,
                price: data.price,
                cost_price: data.cost_price,
                compare_at_price: data.compare_at_price ?? null,
                status: data.status,
                featured: data.featured,
                track_quantity: data.track_quantity,
                continue_selling_when_oos: data.continue_selling_when_oos,
                requires_shipping: data.requires_shipping,
                taxable: data.taxable,
                dimensions: data.dimensions || null,
                tags: data.tags,
                stock: data.variations.reduce((sum, v) => sum + Number(v.stock), 0),
                categories: data.categories,
                subcategories: data.subcategories,
                social_media_link: data.social_media_link || null,
            };

            console.log({productBaseData})
            const variationsInput: ProductVariationInput[] = data.variations.map(v => ({
                name: v.name || null,
                price: v.price,
                stock: v.stock,
                sku: v.sku || null,
                barcode: v.barcode || null,
                attributes: v.attributes.reduce((acc, attr) => ({ ...acc, [attr.name]: attr.value }), {}),
                imageFiles: v.imageFiles,
                existingImages: v.existingImages,
            }));

            if (isEditMode) {
                 await updateProductWithImages(initialData.product.id, productBaseData, mainImages, variationsInput, selectedMainImageIndex);
             } else {
                 await createProductWithImages(productBaseData, mainImages.map(i => i.file!), variationsInput, selectedMainImageIndex);
             }

            toast.success(`Product ${isEditMode ? 'updated' : 'created'} successfully!`, { id: toastId });
            router.push('/admin/products');
            router.refresh();
        } catch (error: any) {
            console.error(error);
            const errorMessage = getProductErrorMessage(error, isEditMode);
            toast.error(errorMessage, { id: toastId });
        }
    };

    const onDropMain = useCallback((files: File[]) => {
        setMainImages(p => {
            const newImages = [...p, ...files.map(f => ({ url: URL.createObjectURL(f), file: f }))];
            // If this is the first image being added, set it as main
            if (p.length === 0 && newImages.length > 0) {
                setSelectedMainImageIndex(0);
            }
            return newImages;
        });
    }, []);
    const { getRootProps: getMainRootProps, getInputProps: getMainInputProps } = useDropzone({ onDrop: onDropMain, accept: { 'image/*': [] } });

    return (
        <>
        <ScrollArea className="h-[calc(100vh-5rem)]">
            <div className="p-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-semibold">{isEditMode ? 'Edit Product' : 'Add a New Product'}</h1>
                            <div className="flex gap-3">
                                <Button type="button" variant="outline" onClick={() => router.back()}>Discard</Button>
                                <Button type="button" className="bg-green-600 hover:bg-green-700" disabled={form.formState.isSubmitting} onClick={() => { console.log("Save button clicked", { isValid: form.formState.isValid, errors: form.formState.errors }); form.handleSubmit(onSubmit)(); }}>{form.formState.isSubmitting ? "Saving..." : "Save Product"}</Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card><CardHeader><CardTitle>General Information</CardTitle></CardHeader><CardContent className="space-y-4">
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="sku" render={({ field }) => <FormItem><FormLabel>Product Sku</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="short_description" render={({ field }) => <FormItem><FormLabel>Short Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="social_media_link" render={({ field }) => <FormItem><FormLabel>Social Media Link</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>} />
                                    <FormItem><FormLabel>Full Description</FormLabel><div className="border rounded-md"><div ref={quillRef} className="min-h-[200px] bg-white" /></div></FormItem>
                                </CardContent></Card>

                                <Card><CardHeader><CardTitle>Media</CardTitle></CardHeader><CardContent>
                                    <div {...getMainRootProps()} className="flex h-40 w-full items-center justify-center rounded-md border-2 border-dashed"><input {...getMainInputProps()} /><div className="text-center"><Upload className="h-8 w-8 mx-auto" /><p>Drop main images here, or click to select</p></div></div>
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {mainImages.map((img, i) => (
                                            <div
                                                key={i}
                                                className={`relative w-20 h-20 cursor-pointer rounded-md ${selectedMainImageIndex === i ? 'ring-2 ring-orange-500' : ''}`}
                                                onClick={() => setSelectedMainImageIndex(i)}
                                            >
                                                <Image src={img?.url} alt="" fill className="object-cover rounded-md" />
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute -top-2 -right-2 h-5 w-5"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setMainImages(p => {
                                                            const newImages = p.filter((_, idx) => idx !== i);
                                                            // If we're removing the main image, select the first remaining image
                                                            if (selectedMainImageIndex === i && newImages.length > 0) {
                                                                setSelectedMainImageIndex(0);
                                                            } else if (selectedMainImageIndex > i && selectedMainImageIndex > 0) {
                                                                setSelectedMainImageIndex(selectedMainImageIndex - 1);
                                                            }
                                                            return newImages;
                                                        });
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent></Card>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Variants</CardTitle>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setIsGeneratorOpen(true)}>
                                            <Wand2 className="mr-2 h-4 w-4" />
                                            Generate Combinations
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {variationFields.map((field, index) => (
                                            <VariantCard key={field.id} form={form} index={index} removeVariant={removeVariation} isEditMode={isEditMode} />
                                        ))}
                                        <Button type="button" variant="outline" onClick={() => appendVariation({ name: "", price: 0, stock: 0, attributes: [{ name: "", value: "" }], imageFiles: [] })}>
                                            <Plus className="mr-2 h-4 w-4" /> Add another variant
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-6">
                                <Card><CardHeader><CardTitle>Organization</CardTitle></CardHeader><CardContent className="space-y-4">
                                     {/* @ts-ignore */}
                                     <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="out_of_stock">Out of Stock</SelectItem></SelectContent></Select><FormMessage /></FormItem>} />
                                     {/* @ts-ignore */}
                                     <FormField control={form.control} name="categories" render={({ field }) => <FormItem><FormLabel>Categories</FormLabel><Select onValueChange={(value) => { if (!field.value.includes(value)) field.onChange([...field.value, value]); }}><FormControl><SelectTrigger><SelectValue placeholder="Select categories..." /></SelectTrigger></FormControl><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}><Checkbox checked={field.value.includes(c.id)} className="mr-2" />{c.name}</SelectItem>)}</SelectContent></Select><div className="flex flex-wrap gap-2 mt-2">{field.value.map(catId => { const cat = categories.find(c => c.id === catId); return cat ? <div key={catId} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm flex items-center gap-1"><span>{cat.name}</span><X className="h-3 w-3 cursor-pointer" onClick={() => field.onChange(field.value.filter(id => id !== catId))} /></div> : null; })}</div><FormMessage /></FormItem>} />
                                     {/* @ts-ignore */}
                                     <FormField control={form.control} name="subcategories" render={({ field }) => <FormItem><FormLabel>Subcategories</FormLabel><Select onValueChange={(value) => { if (!field.value.includes(value)) field.onChange([...field.value, value]); }} disabled={subcategories.length === 0}><FormControl><SelectTrigger><SelectValue placeholder="Select subcategories..." /></SelectTrigger></FormControl><SelectContent>{subcategories.map(s => <SelectItem key={s.id} value={s.id}><Checkbox checked={field.value.includes(s.id)} className="mr-2" />{s.name}</SelectItem>)}</SelectContent></Select><div className="flex flex-wrap gap-2 mt-2">{field.value.map(subId => { const sub = subcategories.find(s => s.id === subId); return sub ? <div key={subId} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm flex items-center gap-1"><span>{sub.name}</span><X className="h-3 w-3 cursor-pointer" onClick={() => field.onChange(field.value.filter(id => id !== subId))} /></div> : null; })}</div><FormMessage /></FormItem>} />
                                     {/* @ts-ignore */}
                                     <FormField control={form.control} name="tags" render={({ field }) => <FormItem><FormLabel>Tags</FormLabel><FormControl><TagInput value={field.value || []} onChange={field.onChange} placeholder="Add product tags, separated by commas..." /></FormControl><FormMessage /></FormItem>} />
                                 </CardContent></Card>

                                <Card><CardHeader><CardTitle>Pricing</CardTitle></CardHeader><CardContent className="space-y-4">
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="price" render={({ field }) => <FormItem><FormLabel>Base Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>} />
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="cost_price" render={({ field }) => <FormItem><FormLabel>Cost Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="compare_at_price" render={({ field }) => <FormItem><FormLabel>Compare-at Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>} />
                                    {/* <FormField control={form.control} name="taxable" render={({ field }) => <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Charge Tax</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} /> */}
                                </CardContent></Card>

                                <Card><CardHeader><CardTitle>Shipping & Inventory</CardTitle></CardHeader><CardContent className="space-y-4">
                                    {/* @ts-ignore */}
                                    {/* <FormField control={form.control} name="dimensions" render={({ field }) => <FormItem><FormLabel>Dimensions (e.g., 24x12x12 cm)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} /> */}
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="requires_shipping" render={({ field }) => <FormItem className="flex items-center justify-between border p-3 rounded-lg"><FormLabel>Requires Shipping</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="track_quantity" render={({ field }) => <FormItem className="flex items-center justify-between border p-3 rounded-lg"><FormLabel>Track Quantity</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="continue_selling_when_oos" render={({ field }) => <FormItem className="flex items-center justify-between border p-3 rounded-lg"><FormLabel>Sell when out of stock</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                                    {/* @ts-ignore */}
                                    <FormField control={form.control} name="featured" render={({ field }) => <FormItem className="flex items-center justify-between border p-3 rounded-lg"><FormLabel>Featured Product</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                                </CardContent></Card>
                            </div>
                        </div>
                    </form>
                </Form>
            </div>
        </ScrollArea>
        <VariantGeneratorDialog
            isOpen={isGeneratorOpen}
            onClose={() => setIsGeneratorOpen(false)}
            onGenerate={(generatedVariants) => {
                replaceVariations(generatedVariants);
            }}
        />
        </>
    );
}


function VariantCard({ form, index, removeVariant, isEditMode }: { form: any, index: number, removeVariant: (index: number) => void, isEditMode: boolean }) {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: `variations.${index}.attributes`
    });
    
    const [imageFiles, setImageFiles] = useState<DisplayImage[]>([]);
    
    useEffect(() => {
        if(isEditMode) {
            const existingImages = form.getValues(`variations.${index}.existingImages`);
            if (existingImages) {
                setImageFiles(existingImages.map((img: ProductImage) => ({ url: img.url, isExisting: true })));
            }
        }
    }, [isEditMode, form, index]);

    const onDrop = useCallback((files: File[]) => {
        const newFiles = files.map(f => ({ url: URL.createObjectURL(f), file: f, isExisting: false }));
        setImageFiles(p => [...p, ...newFiles]);
        const currentFiles = form.getValues(`variations.${index}.imageFiles`) || [];
        form.setValue(`variations.${index}.imageFiles`, [...currentFiles, ...files]);
    }, [form, index]);

    const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] } });

    const removeImg = (imgIndex: number) => {
        const imageToRemove = imageFiles[imgIndex];
        if (!imageToRemove.isExisting) {
            const currentFiles = form.getValues(`variations.${index}.imageFiles`);
            form.setValue(`variations.${index}.imageFiles`, currentFiles.filter((file: File) => file.name !== imageToRemove.file?.name));
        }
        setImageFiles(p => p.filter((_, i: number) => i !== imgIndex));
    };

    return (
        <div className="p-4 border rounded-lg space-y-4 relative bg-slate-50">
            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removeVariant(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            
            {/* @ts-ignore */}
            <FormField control={form.control} name={`variations.${index}.name`} render={({ field }) => <FormItem><Label>Variant Name (e.g., Large Black Pant)</Label><FormControl><Input placeholder="Auto-generates if empty" {...field} /></FormControl><FormMessage /></FormItem>} />

            <div className="grid grid-cols-2 gap-4">
                {/* @ts-ignore */}
                <FormField control={form.control} name={`variations.${index}.price`} render={({ field }) => <FormItem><Label>Variant Price</Label><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>} />
                {/* @ts-ignore */}
                <FormField control={form.control} name={`variations.${index}.stock`} render={({ field }) => <FormItem><Label>Stock</Label><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                {/* @ts-ignore */}
                <FormField control={form.control} name={`variations.${index}.sku`} render={({ field }) => <FormItem><Label>SKU</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                {/* @ts-ignore */}
                <FormField control={form.control} name={`variations.${index}.barcode`} render={({ field }) => <FormItem><Label>Barcode</Label><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <div>
                <Label>Attributes</Label>
                <div className="space-y-2 mt-1">
                    {fields.map((field, attrIndex) => {
                        const attributeName = form.watch(`variations.${index}.attributes.${attrIndex}.name`);
                        return (
                        <div key={field.id} className="flex items-center gap-2">
                            <div className="grid grid-cols-2 gap-2 flex-1">
                                {/* @ts-ignore */}
                                <FormField control={form.control} name={`variations.${index}.attributes.${attrIndex}.name`} render={({ field }) => <Input placeholder="Attribute Name (e.g., Color)" {...field} />} />
                                {/* @ts-ignore */}
                                <FormField control={form.control} name={`variations.${index}.attributes.${attrIndex}.value`} render={({ field }) => <Input placeholder="Value (e.g., Blue)" {...field} />} />
                            </div>
                            <Button type="button" size="icon" variant="ghost" onClick={() => remove(attrIndex)}><X className="h-4 w-4" /></Button>
                        </div>
                    )})}
                    <Button type="button" size="sm" variant="outline" onClick={() => append({ name: "", value: "" })}>Add Attribute</Button>
                </div>
            </div>
            <div>
                <Label>Variant Images</Label>
                <div {...getRootProps()} className="mt-1 flex h-24 w-full items-center justify-center rounded-md border-2 border-dashed"><input {...getInputProps()} /><div className="text-center text-xs"><Upload className="h-6 w-6 mx-auto" /><p>Drop variant images</p></div></div>
                <div className="flex flex-wrap gap-2 mt-2">{imageFiles.map((img, i) => <div key={i} className="relative w-16 h-16"><Image src={img.url} alt="" fill className="object-cover rounded-md" /><Button type="button" size="icon" variant="destructive" className="absolute -top-1 -right-1 h-4 w-4" onClick={() => removeImg(i)}><X className="h-2 w-2" /></Button></div>)}</div>
            </div>
        </div>
    );
}
