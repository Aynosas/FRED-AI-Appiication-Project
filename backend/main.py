from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import StringIO
from data_pipeline import run_pipeline
from pydantic import BaseModel
from rag_engine import query

class QuestionRequest(BaseModel):
    question: str

app = FastAPI()
current_df = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/pipeline/run")
async def pipeline_route(file: UploadFile = File(...)):
    global current_df
    raw = await file.read()
    raw_str = raw.decode("utf-8")
    str_obj = StringIO(raw_str)
    current_df = pd.read_csv(str_obj)
    return run_pipeline(current_df)

@app.post("/api/query")
async def query_route(request: QuestionRequest):
    if current_df is None:
        return {"error": "No dataset uploaded yet!"}
    return {"response": query(request.question, current_df)}

