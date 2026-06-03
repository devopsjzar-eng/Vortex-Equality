import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Generate and save complete network tree structure to file
 * Called whenever there's a change in the network (new member, referral update, etc)
 */

export async function generateAndSaveNetworkTree() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Get complete network tree
    const { data: members } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        total_deposit,
        referred_by,
        created_at
      `)
      .eq('is_admin', false)
      .order('full_name')

    // Build tree structure
    const tree: any = {
      generated_at: new Date().toISOString(),
      total_members: members?.length || 0,
      root_sponsor: null,
      levels: {}
    }

    if (!members) return

    // Find root sponsor (no referred_by)
    const rootMembers = members.filter(m => !m.referred_by)
    
    // Build hierarchical structure
    const memberMap = new Map(members.map(m => [m.id, m]))
    const treeMap = new Map<string, any>()

    // Initialize each member node
    members.forEach(member => {
      treeMap.set(member.id, {
        name: member.full_name,
        email: member.email,
        deposit: member.total_deposit,
        joined: member.created_at,
        direct_members: [],
        member_count: 0
      })
    })

    // Build relationships
    members.forEach(member => {
      if (member.referred_by) {
        const parent = treeMap.get(member.referred_by)
        if (parent) {
          parent.direct_members.push({
            name: member.full_name,
            email: member.email,
            deposit: member.total_deposit
          })
        }
      }
    })

    // Count total members under each sponsor
    function countMembers(nodeId: string): number {
      const node = treeMap.get(nodeId)
      if (!node) return 0
      
      let count = 0
      members.forEach(m => {
        if (m.referred_by === nodeId) {
          count += 1 + countMembers(m.id)
        }
      })
      return count
    }

    members.forEach(member => {
      treeMap.get(member.id).member_count = countMembers(member.id)
    })

    // Build level structure
    members.forEach(member => {
      const level = member.referred_by ? 
        (members.find(m => m.id === member.referred_by)?.full_name || 'ROOT') 
        : 'ROOT'
      
      if (!tree.levels[level]) {
        tree.levels[level] = []
      }
      
      tree.levels[level].push({
        name: member.full_name,
        email: member.email,
        deposit: member.total_deposit,
        direct_members_count: treeMap.get(member.id).direct_members.length,
        total_network_count: treeMap.get(member.id).member_count,
        joined: member.created_at
      })
    })

    // Set root sponsors
    tree.root_sponsors = rootMembers.map(m => ({
      name: m.full_name,
      email: m.email,
      direct_members_count: treeMap.get(m.id).direct_members.length,
      total_network_count: treeMap.get(m.id).member_count
    }))

    // Create text format untuk mudah dibaca
    const textFormat = generateTextFormat(tree, treeMap, memberMap)

    // Save to files
    const timestamp = new Date().toISOString().split('T')[0]
    const dir = path.join(process.cwd(), 'public/network-records')
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Save JSON
    fs.writeFileSync(
      path.join(dir, `network-tree-${timestamp}.json`),
      JSON.stringify(tree, null, 2)
    )

    // Save TEXT (readable format)
    fs.writeFileSync(
      path.join(dir, `network-tree-${timestamp}.txt`),
      textFormat
    )

    // Save LATEST (always updated)
    fs.writeFileSync(
      path.join(dir, `network-tree-LATEST.json`),
      JSON.stringify(tree, null, 2)
    )

    fs.writeFileSync(
      path.join(dir, `network-tree-LATEST.txt`),
      textFormat
    )

    console.log(`[Network Tree] Saved network record for ${timestamp}`)
    return true
  } catch (error) {
    console.error('[Network Tree] Error generating tree:', error)
    return false
  }
}

function generateTextFormat(tree: any, treeMap: Map<string, any>, memberMap: Map<string, any>): string {
  let text = `VORTEX EQUALITY - NETWORK TREE RECORD\n`
  text += `Generated: ${tree.generated_at}\n`
  text += `Total Members: ${tree.total_members}\n\n`
  text += `${'='.repeat(80)}\n\n`

  // Root sponsors
  text += `ROOT SPONSORS:\n`
  text += `-`.repeat(80) + `\n`
  tree.root_sponsors?.forEach((sponsor: any) => {
    text += `\n${sponsor.name} (${sponsor.email})\n`
    text += `  Direct Members: ${sponsor.direct_members_count}\n`
    text += `  Total Network: ${sponsor.total_network_count}\n`
  })

  text += `\n${'='.repeat(80)}\n\n`
  text += `COMPLETE NETWORK HIERARCHY:\n`
  text += `-`.repeat(80) + `\n`

  // Hierarchy by level
  Object.entries(tree.levels).forEach(([level, members]: [string, any]) => {
    text += `\n[${level}]\n`
    members.forEach((member: any) => {
      text += `  - ${member.name} (${member.email})\n`
      text += `    Deposit: $${member.deposit.toFixed(2)}\n`
      text += `    Direct Members: ${member.direct_members_count}\n`
      text += `    Total Network: ${member.total_network_count}\n`
    })
  })

  return text
}
