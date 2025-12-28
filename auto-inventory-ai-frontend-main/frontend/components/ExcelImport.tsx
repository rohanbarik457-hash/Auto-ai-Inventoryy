import React, { useState, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, Trash2, CheckSquare, Square, FileSpreadsheet, AlertTriangle, RefreshCw, ArrowRight, Check, EyeOff, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DataRow {
    [key: string]: any;
    __originalIndex: number;
}

export const ExcelImport: React.FC = () => {
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [data, setData] = useState<DataRow[]>([]);

    // State for interactive features
    const [removedRows, setRemovedRows] = useState<Set<number>>(new Set());
    const [removedCols, setRemovedCols] = useState<Set<string>>(new Set());
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- File Handling ---

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const uploadedFile = e.dataTransfer.files[0];
        if (uploadedFile) processFile(uploadedFile);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (uploadedFile) processFile(uploadedFile);
    };

    const processFile = (uploadedFile: File) => {
        setLoading(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                if (!data) throw new Error("Reading failed");

                // Read as ArrayBuffer for maximum compatibility
                const workbook = XLSX.read(data, { type: 'array' });
                const wsName = workbook.SheetNames[0];
                const ws = workbook.Sheets[wsName];

                // Get raw data (arrays of arrays)
                const jsonData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });

                console.log("Raw JSON Data:", jsonData);

                if (!jsonData || jsonData.length === 0) throw new Error("File appears to be empty");

                // Auto-generate headers from first row, or use defaults if missing
                let processedHeaders: string[] = [];
                let dataStartIndex = 1;

                if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
                    // Assume first row is header
                    processedHeaders = jsonData[0].map((h, i) =>
                        (h && typeof h !== 'object') ? String(h).trim() : `Column ${i + 1}`
                    );
                }

                if (processedHeaders.length === 0) throw new Error("Could not detect any headers.");

                // Map rows
                const processedRows = jsonData.slice(dataStartIndex).map((row, idx) => {
                    const rowObj: DataRow = { __originalIndex: idx };
                    // Map row data to headers. Handle cases where row might be shorter than headers
                    processedHeaders.forEach((header, colIdx) => {
                        rowObj[header] = row[colIdx] !== undefined ? row[colIdx] : "";
                    });
                    return rowObj;
                });

                console.log("Processed Headers:", processedHeaders);
                console.log("Processed Rows:", processedRows.length);

                setHeaders(processedHeaders);
                setData(processedRows);
                setFile(uploadedFile);

                // Reset states
                setRemovedRows(new Set());
                setRemovedCols(new Set());
                setSelectedRows(new Set());

            } catch (err: any) {
                console.error("Processing Error:", err);
                setError("Failed to parse file: " + (err.message || "Unknown error"));
            } finally {
                setLoading(false);
            }
        };

        reader.onerror = () => {
            setError("Failed to read file from disk.");
            setLoading(false);
        };

        reader.readAsArrayBuffer(uploadedFile);
    };

    // --- Interactive Actions ---

    const toggleRowRemove = (idx: number) => {
        const next = new Set(removedRows);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setRemovedRows(next);

        // If removing, also deselect
        if (!removedRows.has(idx)) {
            const nextSel = new Set(selectedRows);
            nextSel.delete(idx);
            setSelectedRows(nextSel);
        }
    };

    const toggleRowSelect = (idx: number) => {
        if (removedRows.has(idx)) return; // Cannot select removed
        const next = new Set(selectedRows);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedRows(next);
    };

    const toggleColRemove = (header: string) => {
        const next = new Set(removedCols);
        if (next.has(header)) next.delete(header);
        else next.add(header);
        setRemovedCols(next);
    };

    const selectAll = () => {
        const visibleRows = data.filter(r => !removedRows.has(r.__originalIndex)).map(r => r.__originalIndex);
        setSelectedRows(new Set(visibleRows));
    };

    const deselectAll = () => {
        setSelectedRows(new Set());
    };

    const resetOriginal = () => {
        if (confirm("Reset to original data state?")) {
            setRemovedRows(new Set());
            setRemovedCols(new Set());
            setSelectedRows(new Set());
        }
    };

    // --- Stats & Finalize ---

    const stats = useMemo(() => {
        const totalRows = data.length;
        const removedRowCount = removedRows.size;
        const keptRowCount = totalRows - removedRowCount;

        const totalCols = headers.length;
        const activeCols = totalCols - removedCols.size;

        return { totalRows, removedRowCount, keptRowCount, totalCols, activeCols };
    }, [data.length, headers.length, removedRows.size, removedCols.size]);

    const handleFinalize = () => {
        // Filter Data
        const activeHeaders = headers.filter(h => !removedCols.has(h));

        // Logic: If any rows selected, use ONLY selected. Else use ALL non-removed.
        const useSelected = selectedRows.size > 0;

        const finalRows = data
            .filter(row => {
                const idx = row.__originalIndex;
                if (removedRows.has(idx)) return false;
                if (useSelected && !selectedRows.has(idx)) return false;
                return true;
            })
            .map(row => {
                const clean: any = {};
                activeHeaders.forEach(h => clean[h] = row[h]);
                return clean;
            });

        console.log("FINAL IMPORT DATA:", finalRows);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        // Here: Send default API call or context update
    };

    // --- Render ---

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-slate-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-teal-700 flex items-center gap-2">
                        <FileSpreadsheet className="w-8 h-8" />
                        Import Customizer
                    </h1>
                    <p className="text-slate-500 mt-1">Refine your data before importing.</p>
                </div>

                {file && (
                    <div className="flex gap-2">
                        {success && <span className="text-green-600 font-bold animate-pulse flex items-center mr-4">Imported Successfully!</span>}
                        <button onClick={resetOriginal} className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition font-medium flex items-center gap-2">
                            <RefreshCw size={16} /> Reset
                        </button>
                        <button onClick={handleFinalize} className="px-6 py-2 bg-teal-600 text-white rounded-lg shadow hover:bg-teal-700 transition transform active:scale-95 font-bold flex items-center gap-2">
                            Finalize & Import <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            {/* Upload Area */}
            {!file && (
                <div
                    className="border-2 border-dashed border-slate-300 hover:border-teal-500 hover:bg-teal-50/50 rounded-2xl p-16 text-center cursor-pointer transition-all group"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileInput} />
                    <div className="w-20 h-20 bg-teal-100/50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                        <Upload size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">Drag & Drop your file here</h3>
                    <p className="text-slate-500 mt-2">or click to browse (.xlsx, .csv)</p>
                </div>
            )}

            {/* Dashboard & Tools */}
            {file && (
                <div className="space-y-4">
                    {/* Stats Panel */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rows to Keep</div>
                            <div className="text-3xl font-bold text-teal-700 mt-1">{stats.keptRowCount}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rows Removed</div>
                            <div className="text-3xl font-bold text-red-500 mt-1">{stats.removedRowCount}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Columns</div>
                            <div className="text-3xl font-bold text-indigo-600 mt-1">{stats.activeCols}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-sm font-medium text-slate-500">Selection Mode</div>
                                <div className="text-teal-600 font-bold">{selectedRows.size > 0 ? `${selectedRows.size} Selected` : 'All Visible'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        <button onClick={selectAll} className="px-3 py-1.5 text-sm bg-teal-50 text-teal-700 rounded-md hover:bg-teal-100 transition font-medium">Select All Rows</button>
                        <button onClick={deselectAll} className="px-3 py-1.5 text-sm bg-slate-50 text-slate-600 rounded-md hover:bg-slate-100 transition font-medium">Deselect All</button>
                    </div>

                    {/* Table */}
                    <div className="bg-white border boundary-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[65vh]">
                        <div className="overflow-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse relative">
                                <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 w-16 text-center font-semibold text-xs border-b">Action</th>
                                        {headers.map(h => {
                                            const isRemoved = removedCols.has(h);
                                            return (
                                                <th key={h} className={`p-3 min-w-[150px] text-sm font-semibold border-b group transition-colors ${isRemoved ? 'bg-slate-100 text-slate-400 line-through' : 'hover:bg-teal-50'}`}>
                                                    <div className="flex justify-between items-center gap-2">
                                                        <span>{h}</span>
                                                        <button
                                                            onClick={() => toggleColRemove(h)}
                                                            className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${isRemoved ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                                                            title={isRemoved ? "Restore" : "Remove Column"}
                                                        >
                                                            {isRemoved ? <RefreshCw size={14} /> : <X size={14} />}
                                                        </button>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.map((row) => {
                                        const idx = row.__originalIndex;
                                        const isRemoved = removedRows.has(idx);
                                        const isSelected = selectedRows.has(idx);

                                        return (
                                            <tr key={idx} className={`group transition-all ${isRemoved ? 'bg-slate-50 opacity-60' : 'hover:bg-teal-50/30'}`}>
                                                <td className="p-3 text-center border-r border-slate-100 relative">
                                                    {/* Hover Actions */}
                                                    <div className="flex items-center justify-center gap-2">
                                                        {isRemoved ? (
                                                            <button onClick={() => toggleRowRemove(idx)} className="text-slate-400 hover:text-teal-600" title="Restore"><RefreshCw size={16} /></button>
                                                        ) : (
                                                            <>
                                                                <button onClick={() => toggleRowSelect(idx)} className={`${isSelected ? 'text-teal-600' : 'text-slate-300 hover:text-teal-500'}`}>
                                                                    {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                                                                </button>
                                                                <button onClick={() => toggleRowRemove(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <X size={18} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                {headers.map(h => (
                                                    <td key={`${idx}-${h}`} className={`p-3 text-sm border-r border-slate-50 last:border-0 ${removedCols.has(h) ? 'bg-slate-50/50 text-slate-300 line-through' : 'text-slate-700'} ${isRemoved ? 'line-through decoration-slate-300' : ''}`}>
                                                        <span className="truncate block max-w-[200px]">{row[h]}</span>
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="fixed bottom-6 right-6 bg-red-100 border border-red-200 text-red-800 px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
                    <AlertTriangle size={24} />
                    <div>
                        <div className="font-bold">Error Importing File</div>
                        <div className="text-sm">{error}</div>
                    </div>
                    <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-red-200 rounded"><X size={16} /></button>
                </div>
            )}
        </div>
    );
};
