"use client"

import { FC, useState, useMemo } from 'react'
import { DataTable } from './data-table'
import { columns } from './columns'
import { AnimatedBackground } from '../ui/animated-background'
import { Input } from '../ui/input'
import { ArrowUpDown, Download, Ellipsis, ListFilter, SearchIcon, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useTransactions, useTransactionCounts } from '@/hooks/useTransactions'
import { toast } from 'sonner'
import { TransactionQueryOptions } from '@/integrations/supabase/transactions'

interface TransactionsTableProps {

}

const statusFilters = ['All', 'Pending', 'Completed', 'Failed', 'Timeout']
const statusMapping: Record<string, string | undefined> = {
  'All': undefined,
  'Pending': 'pending',
  'Completed': 'completed', 
  'Failed': 'failed',
  'Timeout': 'timeout'
}

const TransactionsTable: FC<TransactionsTableProps> = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const limit = 20

  const queryOptions: TransactionQueryOptions = useMemo(() => ({
    page: currentPage,
    limit,
    search: searchTerm || undefined,
    status: statusMapping[activeFilter],
    sortBy,
    sortOrder,
  }), [currentPage, searchTerm, activeFilter, sortBy, sortOrder])

  const { data, isLoading, error, refetch } = useTransactions(queryOptions)
  const { data: countsData } = useTransactionCounts()

  const transactions = data?.transactions || []
  const pagination = data?.pagination || { page: 1, limit, total: 0, pages: 1 }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleFilterChange = async (filter: string) => {
    console.log('Status change initiated:', filter)
    setActiveFilter(filter)
    setCurrentPage(1) // Reset to first page when filtering
    setSearchTerm('') // Clear search when changing filter
    
    try {
      // Force a refetch with the new filter
      await refetch()
    } catch (error) {
      console.error('Error refetching transactions:', error)
    }
  }

  const handleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  const handleExport = async () => {
    try {
      toast.info('Export functionality coming soon!')
    } catch (error) {
      toast.error('Failed to export data')
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page)
    }
  }

  const getFilterCount = (filter: string) => {
    if (!countsData) return 0;
    
    switch (filter) {
      case 'All':
        return countsData.all || 0;
      case 'Pending':
        return countsData.pending || 0;
      case 'Completed':
        return countsData.completed || 0;
      case 'Failed':
        return countsData.failed || 0;
      case 'Timeout':
        return countsData.timeout || 0;
      default:
        return 0;
    }
  }
  if (error) {
    return (
      <div className='p-5 rounded-2xl bg-white mt-10'>
        <div className="text-center py-10">
          <p className="text-red-500 mb-4">Failed to load transactions</p>
          <p className="text-gray-500 text-sm mb-4">There was an error loading the transaction data.</p>
          <Button onClick={() => refetch()} variant="outline">
            <Loader2 className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return <div className='p-5 rounded-2xl bg-white mt-10'>
    <div className="flex gap-5 justify-between flex-col 2xl:flex-row pb-8">
      <div className='hidden md:block rounded-[8px] h-fit py-2 px-3 bg-[#E8F6FB] p-[2px] relative'>
        <AnimatedBackground
          defaultValue={activeFilter}
          className='rounded-lg bg-white dark:bg-zinc-700'
          onValueChange={(value) => {
            if (value && statusFilters.includes(value)) {
              console.log('Filter change triggered:', value)
              handleFilterChange(value)
            }
          }}
          transition={{
            ease: 'easeInOut',
            duration: 0.2,
          }}
        >
          {statusFilters.map((label, index) => {
            return (
              <button
                key={index}
                data-id={label}
                type='button'
                aria-label={`${label} view`}
                className={`inline-flex h-10 px-2 items-center text-zinc-800 transition-transform active:scale-[0.98] dark:text-zinc-50 group ${
                  activeFilter === label ? 'text-red-500' : ''
                }`}
              >
                <span className='font-semibold mr-2'>{label}</span>
                <span className='text-[#F26823] transition-all'>
                  ({getFilterCount(label)})
                </span>
              </button>
            );
          })}
        </AnimatedBackground>
      </div>
      <div className="flex gap-2 items-center max-[500px]:flex-wrap">
        <div className="relative max-[500px]:w-full">
          <Input
            className="peer pe-10 border-none shadow-none h-10 sm:h-12 md:min-w-80 md:text-base bg-neutral-100 rounded-xl px-4"
            placeholder="Search transactions, customer, reference..."
            type="search"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <div className="text-muted-foreground/80 !cursor-pointer absolute inset-y-0 end-0 flex items-center justify-center pe-3 peer-disabled:opacity-50">
            <SearchIcon size={20} className='text-black' />
          </div>
        </div>
        <Button variant={'outline'} className='px-3 h-10 sm:h-12' disabled>
          <ListFilter className='text-neutral-600' />
        </Button>
        <Button 
          variant={'outline'} 
          className='px-3 h-10 sm:h-12'
          onClick={handleSort}
          title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        >
          <ArrowUpDown className='text-neutral-600' />
        </Button>
        <Button variant={'outline'} className='px-3 h-10 sm:h-12' disabled>
          <Ellipsis className='text-neutral-600' />
        </Button>
      </div>
    </div>
    <div className="flex flex-col sm:flex-row justify-between mb-3">
      <div className="flex flex-col">
        <h3 className='text-text-primary text-xl font-bold'>Transaction List</h3>
        <p className='text-text-secondary'>
          Track payment transactions across your store.
          {!isLoading && ` Showing ${transactions.length} of ${pagination.total} transactions.`}
        </p>
      </div>
      <Button 
        className="bg-orange-500 hover:bg-orange-600 text-white"
        onClick={handleExport}
        disabled={isLoading}
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
    </div>
    
    {isLoading ? (
      <div className="text-center py-10">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading transactions...</p>
      </div>
    ) : transactions.length === 0 ? (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg mb-2">No transactions found</p>
        <p className="text-gray-400 text-sm">
          {searchTerm ? 'Try adjusting your search terms or filters' : 'Transactions will appear here once customers start making purchases'}
        </p>
        {(searchTerm || activeFilter !== 'All') && (
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              setSearchTerm('')
              setActiveFilter('All')
              setCurrentPage(1)
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
    ) : (
      <DataTable columns={columns} data={transactions} />
    )}
    {!isLoading && transactions.length > 0 && (
      <Pagination className='mt-5'>
        <PaginationContent>
          <PaginationItem className="hidden xs:block">
            <PaginationPrevious 
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(currentPage - 1)
              }}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
            const pageNum = i + 1
            return (
              <PaginationItem key={pageNum}>
                <PaginationLink 
                  onClick={(e) => {
                    e.preventDefault()
                    handlePageChange(pageNum)
                  }}
                  className={pageNum === currentPage ? "bg-orange-500 text-white cursor-pointer" : "cursor-pointer"}
                  size='sm'
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          })}
          {pagination.pages > 5 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          <PaginationItem className="hidden xs:block">
            <PaginationNext 
              onClick={(e) => {
                e.preventDefault()
                handlePageChange(currentPage + 1)
              }}
              className={currentPage === pagination.pages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )}
  </div>
}

export default TransactionsTable