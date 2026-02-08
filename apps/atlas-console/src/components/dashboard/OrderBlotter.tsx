import {
    type ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import type { OrderRow } from "../../types"

export function OrderBlotter({ data }: { data: OrderRow[] }) {
    const columns: ColumnDef<OrderRow>[] = [
        {
            accessorKey: "order_id",
            header: "Order ID",
            cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("order_id")}</span>
        },
        {
            accessorKey: "execution",
            header: "Execution",
            cell: ({ row }) => {
                const status = row.getValue("status") as string
                let display = "WAITING"
                let color = "text-yellow-500"

                if (status === "FILLED") {
                    display = "CONFIRMED"
                    color = "text-green-500 font-bold"
                } else if (status === "CANCELED") {
                    display = "CANCELED"
                    color = "text-gray-500"
                } else if (status === "REJECTED") {
                    display = "REJECTED"
                    color = "text-red-500"
                }

                return <span className={`text-xs ${color}`}>{display}</span>
            }
        },
        {
            accessorKey: "status",
            header: "OMS State",
            cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.getValue("status")}</span>
        },
        {
            accessorKey: "symbol",
            header: "Symbol",
        },
        {
            accessorKey: "side",
            header: "Side",
            cell: ({ row }) => {
                const side = row.getValue("side") as string
                return <span className={side === "BUY" ? "text-green-400" : "text-red-400"}>{side}</span>
            }
        },
        {
            accessorKey: "quantity",
            header: "Qty",
        },
        {
            accessorKey: "filled_qty",
            header: "Filled",
        },
        {
            accessorKey: "price",
            header: "Price",
        },
        {
            accessorKey: "updated_at",
            header: "Time",
            cell: ({ row }) => <span className="text-muted-foreground text-xs">{new Date(row.getValue("updated_at")).toLocaleTimeString()}</span>
        },
    ]

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <div className="rounded-md border">
            <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 sticky top-0 z-10">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                return (
                                    <th key={header.id} className="h-10 px-2 text-left font-medium text-muted-foreground">
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                    </th>
                                )
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <tr
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                                className="border-b transition-colors hover:bg-muted/50"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <td key={cell.id} className="p-2 align-middle">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={columns.length} className="h-24 text-center">
                                No results.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
