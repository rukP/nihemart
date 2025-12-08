"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUp, ArrowDown, Loader2, RefreshCw } from "lucide-react"
import { useTransactionStats } from "@/hooks/useTransactions"
import { toast } from "sonner"

interface TransactionMetric {
  title: string
  value: number
  change: number
  isPositive: boolean
  period: string
  isCurrency?: boolean
}

export default function TransactionsMetrics() {
  const { data: stats, isLoading, error, refetch } = useTransactionStats()

  const handleRefresh = async () => {
    try {
      await refetch()
      toast.success('Transaction statistics refreshed')
    } catch (error) {
      toast.error('Failed to refresh statistics')
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          <Card className="relative">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-500 mb-2">Failed to load transaction statistics</p>
                <Button onClick={handleRefresh} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const transactionMetrics: TransactionMetric[] = [
    {
      title: "Total Revenue",
      value: stats?.totalRevenue || 0,
      change: stats?.revenueChange || 0,
      isPositive: (stats?.revenueChange || 0) >= 0,
      period: "Last 7 days",
      isCurrency: true,
    },
    {
      title: "Completed Transactions",
      value: stats?.completedTransactions || 0,
      change: stats?.completedChange || 0,
      isPositive: (stats?.completedChange || 0) >= 0,
      period: "Last 7 days",
    },
    {
      title: "Failed Transactions",
      value: stats?.failedTransactions || 0,
      change: stats?.failedChange || 0,
      isPositive: (stats?.failedChange || 0) <= 0, // Lower failure rate is positive
      period: "Last 7 days",
    },
    {
      title: "Pending Transactions",
      value: stats?.pendingTransactions || 0,
      change: stats?.pendingChange || 0,
      isPositive: (stats?.pendingChange || 0) <= 0, // Lower pending count is positive
      period: "Last 7 days",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
        {transactionMetrics.map((metric, index) => (
          <Card key={index} className="relative">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-lg text-[#23272E] font-semibold">{metric.title}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </DropdownMenuItem>
                  <DropdownMenuItem>Export Data</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 flex items-end gap-2">
                <div className="text-3xl font-bold text-[#023337]">
                  {isLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    <>
                      {metric.isCurrency ? 'Rwf ' : ''}
                      {metric.isCurrency 
                        ? metric.value.toLocaleString() 
                        : metric.value
                      }
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2 flex items-center justify-between gap-1">
                <span>{metric.period}</span>
                {!isLoading && (
                  <div className={`flex items-center gap-1 ${
                    metric.isPositive ? "text-blue-600" : "text-red-600"
                  }`}>
                    {metric.isPositive ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(metric.change).toFixed(1)}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
