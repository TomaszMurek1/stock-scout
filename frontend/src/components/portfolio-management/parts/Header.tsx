import React from "react"
import AddStockButton from "./AddStockButton"

interface HeaderProps {
    onAdd: () => void
}

export default function Header({ onAdd }: HeaderProps) {
    return (
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">Portfolio Management</h1>
            <AddStockButton onClick={onAdd} />
        </div>
    )
}
