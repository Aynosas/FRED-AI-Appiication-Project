import pandas as pd
import anthropic

from dotenv import load_dotenv
import os

load_dotenv()
# api_key = os.getenv("ANTHROPIC_API_KEY")

# Finds relevant rows for the question and returns them as formatted strings
def search_context(question: str, df: pd.DataFrame) -> str:

    keywords = {
    "inflation": "CPIAUCSL",
    "cpi": "CPIAUCSL",
    "unemployment": "UNRATE",
    "jobs": "UNRATE",
    "rate": "FEDFUNDS",
    "gdp": "GDP",
    "mortgage": "MORTGAGE30US",
    "sentiment": "UMCSENT",
    }
    question_word_list = question.split()
    relevant_rows = []

    for word in question_word_list:
        # Check and get appropriate rows for year
        if word.isdigit() and len(word) == 4:
            relevant_rows.append(df[df["date"].str.contains(word)])
        # Check and get appropriate columns for everything else
        if word in keywords:
            relevant_rows.append(df[df['series_id'] == keywords[word]])

    if not relevant_rows:
        return "No relevant data found"
    
    return pd.concat(relevant_rows).drop_duplicates().to_string()

# Combines context and the question into a prompt for Claude
def build_prompt(question: str, context: str) -> str:
    return f"""You are a financial data analyst with access to real FRED economic data. Answer
    this question with provided data only. Ensure to answer in a concise manner, and cite 
    specific values from the data.

    Data: {context}
    Question: {question}
    """

# Calls the Anthropic API and returns Claude's answer
def ask_claude(prompt: str) -> str:
    client = anthropic.Anthropic(api_key="Add Anthropic API key here")
    
    message = client.messages.create(
        messages= [{"role": "user", "content": prompt}],
        model="claude-sonnet-4-5",
        max_tokens=1000
    )
    return message.content[0].text

def query(question: str, df: pd.DataFrame):
    context = search_context(question, df)
    prompt = build_prompt(question, context)
    response = ask_claude(prompt)
    return response