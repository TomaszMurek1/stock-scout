import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { LineChart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { apiClient } from '@/services/apiClient'

export default function FibonacciElliott() {
    const { ticker } = useParams()
    const [analysis, setAnalysis] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true)
                const response = await apiClient.get(
                    `/fibonacci-elliott/analyze/${ticker}`
                )
                setAnalysis(response.data)
            } catch (err) {
                setError(err.message || 'Failed to fetch analysis')
            } finally {
                setLoading(false)
            }
        }

        if (ticker) {
            fetchAnalysis()
        }
    }, [ticker])

    if (loading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-[200px]" />
                <Skeleton className="h-[300px] w-full" />
            </div>
        )
    }

    if (error) {
        return <div className="text-red-500">{error}</div>
    }

    if (!analysis) {
        return <div>No analysis data available</div>
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-6 h-6" />
                    Fibonacci & Elliott Wave Analysis: {analysis.ticker}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-semibold mb-2">Fibonacci Levels</h3>
                        <ul className="space-y-2">
                            {analysis.fibonacci_levels && Object.entries(analysis.fibonacci_levels).map(([key, value]) => (
                                <li key={key} className="flex justify-between">
                                    <span className="capitalize">{key.replace('_', ' ')}:</span>
                                    <span>${value.toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Current Status</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Current Price:</span>
                                <span>${analysis.current_price.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Signal:</span>
                                <span className={
                                    analysis.signal === 'buy' ? 'text-green-500' :
                                        analysis.signal === 'sell' ? 'text-red-500' : 'text-gray-500'
                                }>
                                    {analysis.signal}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}