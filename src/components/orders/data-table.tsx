"use client";

import {
   ColumnDef,
   flexRender,
   getCoreRowModel,
   getSortedRowModel,
   useReactTable,
} from "@tanstack/react-table";

import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/components/ui/table";
import { useState } from "react";

interface DataTableProps<TData, TValue> {
   columns: ColumnDef<TData, TValue>[];
   data: TData[];
   loading?: boolean;
}

export function DataTable<TData, TValue>({
   columns,
   data,
   loading = false,
}: DataTableProps<TData, TValue>) {
   const [rowSelection, setRowSelection] = useState({});
   const [sorting, setSorting] = useState<any[]>([]);

   const table = useReactTable({
      data,
      columns,
      state: {
         rowSelection,
         sorting,
      },
      onRowSelectionChange: setRowSelection,
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
   });

   return (
      <div className="w-[84vw] lg:w-full rounded-md border">
         <Table>
            <TableHeader className="bg-surface-secondary">
               {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                     {headerGroup.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        const sortState = header.column.getIsSorted();

                        return (
                           <TableHead key={header.id}>
                              {header.isPlaceholder ? null : canSort ? (
                                 <button
                                    type="button"
                                    onClick={header.column.getToggleSortingHandler()}
                                    className="flex items-center gap-2"
                                 >
                                    {flexRender(
                                       header.column.columnDef.header,
                                       header.getContext()
                                    )}
                                    <span className="text-xs opacity-60">
                                       {sortState === "asc"
                                          ? "▲"
                                          : sortState === "desc"
                                          ? "▼"
                                          : ""}
                                    </span>
                                 </button>
                              ) : (
                                 flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                 )
                              )}
                           </TableHead>
                        );
                     })}
                  </TableRow>
               ))}
            </TableHeader>
            <TableBody>
               {!loading && table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                     // highlight the entire row only if any order item has a refund_status === 'requested'
                     const hasRefund = (row.original as any)?.items?.some(
                        (it: any) => it?.refund_status === "requested"
                     );

                     return (
                        <TableRow
                           key={row.id}
                           data-state={row.getIsSelected() && "selected"}
                           className={hasRefund ? "bg-yellow-50" : undefined}
                        >
                           {row.getVisibleCells().map((cell) => (
                              <TableCell
                                 key={cell.id}
                                 className="whitespace-nowrap"
                              >
                                 {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                 )}
                              </TableCell>
                           ))}
                        </TableRow>
                     );
                  })
               ) : loading ? (
                  <TableRow>
                     <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-sm text-muted-foreground"
                     >
                        Loading...
                     </TableCell>
                  </TableRow>
               ) : (
                  <TableRow>
                     <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                     >
                        No results.
                     </TableCell>
                  </TableRow>
               )}
            </TableBody>
         </Table>
      </div>
   );
}
