'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Link href="/dashboard/deposit">
        <Button className="w-full gap-2 bg-primary hover:bg-primary/90" size="lg">
          <ArrowDownToLine className="h-5 w-5" />
          Deposit
        </Button>
      </Link>
      <Link href="/dashboard/withdraw">
        <Button variant="outline" className="w-full gap-2" size="lg">
          <ArrowUpFromLine className="h-5 w-5" />
          Withdraw
        </Button>
      </Link>
    </div>
  )
}
