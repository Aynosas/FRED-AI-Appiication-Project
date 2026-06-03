import { useState } from "react"
import DataUpload from "./DataUpload"
import QueryInterface from "./QueryInterface"

export default function App() {
    const [report, setReport] = useState(null)

    return (
        <div>
            <DataUpload
                apiEndpoint="http://127.0.0.1:8000/api/pipeline/run"
                onUploadSuccess={(data) => setReport(data)}
            />
            {report && <div>Raw rows: {report.quality_report.row_count_raw}</div>}
            {report && <div>Clean rows: {report.clean_row_count}</div>}
            {report && <div>Duplicates: {report.quality_report.issues.duplicate_row_count}</div>}
            <QueryInterface />
        </div>
    )
}