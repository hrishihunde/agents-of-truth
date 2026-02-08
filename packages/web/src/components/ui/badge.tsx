import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-gray-700 text-gray-50 hover:bg-gray-600",
                secondary: "border-transparent bg-gray-800 text-gray-300 hover:bg-gray-700",
                destructive: "border-transparent bg-red-900/50 text-red-300 hover:bg-red-900/70",
                success: "border-transparent bg-green-900/50 text-green-300 hover:bg-green-900/70",
                warning: "border-transparent bg-yellow-900/50 text-yellow-300 hover:bg-yellow-900/70",
                outline: "text-gray-300 border-gray-600",
                blue: "border-transparent bg-blue-900/50 text-blue-300 hover:bg-blue-900/70",
                purple: "border-transparent bg-purple-900/50 text-purple-300 hover:bg-purple-900/70",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Badge({
    className,
    variant,
    ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
