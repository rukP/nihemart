import { ReactNode } from 'react'
import { cn } from '../lib/utils'
import { cva, VariantProps } from 'class-variance-authority'



const wrapperVariants = cva(
  'mx-auto w-full px-3 sm:px-5 md:px-20',
  {
   variants: {
    size: {
      lg: "max-w-screen-2xl",
      xl: "max-w-[1880px]",
      default: "max-w-[1280px]"
    }
   },
   defaultVariants: {
    size: "default"
   }
  }
)


interface MaxWidthWrapperProps extends VariantProps<typeof wrapperVariants> {
  className?: string,
  children: ReactNode
}

const MaxWidthWrapper = ({
  className,
  children,
  size
}: MaxWidthWrapperProps) => {
  return (
    <div
      className={cn(wrapperVariants({ size, className }))}>
      {children}
    </div>
  )
}

export default MaxWidthWrapper