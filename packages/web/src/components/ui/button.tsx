import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950",
    {
        variants: {
            variant: {
                default: "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:from-purple-500 hover:to-blue-500 focus-visible:ring-purple-500",
                destructive: "bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:ring-red-500",
                outline: "border border-gray-700 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white focus-visible:ring-gray-500",
                secondary: "bg-gray-800 text-gray-100 shadow-sm hover:bg-gray-700 focus-visible:ring-gray-500",
                ghost: "text-gray-400 hover:bg-gray-800 hover:text-white",
                link: "text-blue-400 underline-offset-4 hover:underline",
                success: "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:from-green-500 hover:to-emerald-500 focus-visible:ring-green-500",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-12 rounded-lg px-6 text-base",
                icon: "size-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

function Button({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
    }) {
    const Comp = asChild ? Slot : "button"

    return (
        <Comp
            data-slot="button"
            className={cn(buttonVariants({ variant, size, className }))}
            {...props}
        />
    )
}

export { Button, buttonVariants }
