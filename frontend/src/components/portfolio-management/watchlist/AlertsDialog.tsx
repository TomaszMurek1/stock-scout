import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"

interface AlertsDialogProps {
    stockName: string
}

export function AlertsDialog({ stockName }: AlertsDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-600">
                    <Bell className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Alerts for {stockName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Price Alerts</h3>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="price-drop" className="rounded border-gray-300" />
                            <label htmlFor="price-drop" className="text-sm">
                                Alert me if price drops by
                            </label>
                            <select className="rounded border-gray-300 text-sm">
                                <option>10%</option>
                                <option>20%</option>
                                <option>30%</option>
                                <option>40%</option>
                                <option>50%</option>
                            </select>
                            <span className="text-sm">from peak</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Technical Indicators</h3>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="golden-cross" className="rounded border-gray-300" />
                            <label htmlFor="golden-cross" className="text-sm">
                                Alert me on Golden Cross (50 SMA crosses above 200 SMA)
                            </label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="death-cross" className="rounded border-gray-300" />
                            <label htmlFor="death-cross" className="text-sm">
                                Alert me on Death Cross (50 SMA crosses below 200 SMA)
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-medium">Volume Alerts</h3>
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id="unusual-volume" className="rounded border-gray-300" />
                            <label htmlFor="unusual-volume" className="text-sm">
                                Alert me on unusual volume (2x average)
                            </label>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button className="bg-gray-800 text-white hover:bg-gray-700">Save Alerts</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}