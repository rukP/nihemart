"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function parseCSV(text: string) {
   // Very simple CSV parser (no quoted fields with commas support)
   const lines = text.split(/\r?\n/).filter(Boolean);
   if (lines.length === 0) return [];
   const headers = lines[0].split(",").map((h) => h.trim());
   const rows = lines.slice(1).map((l) => {
      const cols = l.split(",");
      const obj: any = {};
      headers.forEach((h, i) => {
         obj[h] = (cols[i] || "").trim();
      });
      return obj;
   });
   return rows;
}

export default function ImportRidersPage() {
   const [fileText, setFileText] = useState("");
   const [rows, setRows] = useState<any[]>([]);
   const [loading, setLoading] = useState(false);

   const onFile = async (f?: File) => {
      if (!f) return;
      const txt = await f.text();
      setFileText(txt);
      const parsed = parseCSV(txt);
      setRows(parsed);
   };

   const handleSubmit = async () => {
      if (rows.length === 0) {
         toast.error("No rows to import");
         return;
      }
      setLoading(true);
      try {
         const res = await fetch("/api/admin/import-riders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rows }),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Import failed");
         toast.success(`Imported ${data.imported} rows`);
         setRows([]);
         setFileText("");
      } catch (err: any) {
         toast.error(err?.message || "Import failed");
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="p-6">
         <div className="mb-4">
            <Link
               href="/admin/riders"
               className="text-orange-500"
            >
               ← Back to riders
            </Link>
         </div>

         <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Import Riders</h1>
            <div>
               <Link href="/admin/riders/new">
                  <Button variant="outline">Create Single</Button>
               </Link>
            </div>
         </div>

         <Card>
            <CardHeader>
               <CardTitle>Upload CSV</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                  <div>
                     <Label>CSV file</Label>
                     <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => onFile(e.target.files?.[0])}
                     />
                  </div>

                  <div>
                     <Label>Preview</Label>
                     <div className="max-h-60 overflow-auto border rounded p-2 bg-white">
                        {rows.length === 0 ? (
                           <div className="text-muted-foreground">No data</div>
                        ) : (
                           <table className="w-full text-sm">
                              <thead>
                                 <tr>
                                    {Object.keys(rows[0]).map((h) => (
                                       <th
                                          key={h}
                                          className="text-left pr-4"
                                       >
                                          {h}
                                       </th>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody>
                                 {rows.slice(0, 50).map((r, i) => (
                                    <tr
                                       key={i}
                                       className="odd:bg-gray-50"
                                    >
                                       {Object.keys(r).map((k) => (
                                          <td
                                             key={k}
                                             className="pr-4"
                                          >
                                             {r[k]}
                                          </td>
                                       ))}
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        )}
                     </div>
                  </div>

                  <div className="flex justify-end gap-3">
                     <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                           setRows([]);
                           setFileText("");
                        }}
                        disabled={loading}
                     >
                        Clear
                     </Button>
                     <Button
                        onClick={handleSubmit}
                        disabled={loading || rows.length === 0}
                        className="bg-orange-600 hover:bg-orange-700"
                     >
                        {loading ? "Importing..." : "Import Riders"}
                     </Button>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>
   );
}
