import React from "react"
import { Tabs, TabsList } from "@/components/ui/tabs"

export default function TabsContainer({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <Tabs defaultValue="holdings" className="w-full">
            <TabsList className="grid grid-cols-6 mb-4">
                {children /* Each child should be a TabsTrigger + TabsContent pair */}
            </TabsList>
        </Tabs>
    )
}
