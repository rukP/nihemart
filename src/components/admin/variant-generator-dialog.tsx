"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Option {
  name: string;
  values: string;
}

interface VariantGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (variants: any[]) => void;
}


const generateCombinations = (options: Option[]) => {
    if (!options || options.length === 0) return [];
    
    let combinations = [{}];
    
    options.forEach(option => {
        if (!option.name || !option.values) return;
        
        const newCombinations: any[] = [];
        const values = option.values.split(',').map(v => v.trim()).filter(Boolean);
        
        combinations.forEach(existingCombination => {
            values.forEach(value => {
                newCombinations.push({ ...existingCombination, [option.name]: value });
            });
        });
        
        combinations = newCombinations;
    });

    return combinations.map(combo => {
        const attributes = Object.entries(combo).map(([name, value]) => ({ name, value: value as string }));
        const name = attributes.map(a => a.value).join(' / ');
        return { name, price: 0, stock: 0, attributes, imageFiles: [] };
    });
};

export const VariantGeneratorDialog = ({ isOpen, onClose, onGenerate }: VariantGeneratorDialogProps) => {
    const [options, setOptions] = useState<Option[]>([{ name: "", values: "" }]);
    const [price, setPrice] = useState("0");
    const [stock, setStock] = useState("0");
    
    const handleOptionChange = (index: number, field: 'name' | 'values', value: string) => {
        const newOptions = [...options];
        newOptions[index][field] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, { name: "", values: "" }]);
    };

    const removeOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleGenerate = () => {
        const hasEmptyFields = options.some(opt => !opt.name.trim() || !opt.values.trim());
        if (hasEmptyFields) {
            toast.error("Please fill in all option names and values.");
            return;
        }

        const generated = generateCombinations(options);
        
        const variantsWithDefaults = generated.map(variant => ({
            ...variant,
            price: Number(price) || 0,
            stock: Number(stock) || 0,
        }));
        
        onGenerate(variantsWithDefaults);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader><DialogTitle>Generate Variant Combinations</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    {options.map((option, index) => (
                        <div key={index} className="flex items-end gap-2">
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor={`option-name-${index}`}>Option Name</Label>
                                <Input id={`option-name-${index}`} placeholder="Attribute Name (e.g., Color)" value={option.name} onChange={e => handleOptionChange(index, 'name', e.target.value)} />
                            </div>
                            <div className="grid w-full items-center gap-1.5">
                                <Label htmlFor={`option-values-${index}`}>Values (comma-separated)</Label>
                                <Input id={`option-values-${index}`} placeholder="e.g., S, M, L" value={option.values} onChange={e => handleOptionChange(index, 'values', e.target.value)} />
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => removeOption(index)} disabled={options.length <= 1}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addOption}>
                        <Plus className="h-4 w-4 mr-2" />Add another option
                    </Button>
                    <hr className="my-4"/>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="default-price">Price for all variants</Label>
                            <Input id="default-price" type="number" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="default-stock">Stock for all variants</Label>
                            <Input id="default-stock" type="number" placeholder="0" value={stock} onChange={e => setStock(e.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleGenerate}>Generate Variants</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};