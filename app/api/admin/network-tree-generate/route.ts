import { NextResponse } from 'next/server'
import { generateAndSaveNetworkTree } from '@/lib/network-tree-generator'

/**
 * Admin endpoint to trigger network tree generation
 * Can be called manually or automatically on network changes
 */

export async function POST(request: Request) {
  try {
    // Optional: Verify admin token
    const authHeader = request.headers.get('authorization')
    const adminToken = process.env.ADMIN_TRIGGER_TOKEN
    
    if (adminToken && authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
  return NextResponse.json({
    message: 'Network tree generation endpoint',
    usage: 'POST with optional Bearer token',
    files_location: '/public/network-records/'
  })
}
