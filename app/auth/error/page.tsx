import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-destructive text-destructive-foreground">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Authentication Error</CardTitle>
            <CardDescription className="mt-2 text-muted-foreground">
              Something went wrong during authentication. Please try again.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/auth/login">
            <Button className="w-full">Back to Login</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
