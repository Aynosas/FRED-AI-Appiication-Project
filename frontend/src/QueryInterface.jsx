import { useState } from "react"

export default function QueryInterface() {
    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState(null)
    const [loading, setLoading] = useState(false)
    
    const handleSubmit = async () => {
        setLoading(true)
        const response = await fetch("http://127.0.0.1:8000/api/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: question })
        })
        const data = await response.json()
        setAnswer(data.response)
        setLoading(false)      
    }

   return (
    <div>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} />
        <button onClick={handleSubmit}>Ask</button>
        {loading && <p>Loading...</p>}
        {answer && <p>{answer}</p>}
    </div>
    )

}