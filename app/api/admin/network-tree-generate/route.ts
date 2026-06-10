import { NextResponse } from 'next/server'
import { generateAndSaveNetworkTree } from '@/lib/network-tree-generator'
import { requireAdmin } from '@/lib/require-admin'

export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  try {
    const success = await generateAndSaveNetworkTree()

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Network tree generated and saved successfully',
        timestamp: new Date().toISOString(),
        files: [
          'network-tree-LATEST.json',
          'network-tree-LATEST.txt',
          `network-tree-${new Date().toISOString().split('T')[0]}.json`,
          `network-tree-${new Date().toISOString().split('T')[0]}.txt`
        ]
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to generate network tree' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[API] Network tree generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  return NextResponse.json({
    message: 'Network tree generation endpoint',
    usage: 'POST to trigger generation',
    files_location: '/public/network-records/'
  })
}
