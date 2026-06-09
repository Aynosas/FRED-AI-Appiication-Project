Anthropic API key required - enter api key where indicated (rag_engine.py line 51)
To run app, first cd into the backend folder.
Next, run the command uvicorn main:app --reload (Ensure you download the necessary packages and corequisites if needed)
Go to http://127.0.0.1:8000/docs to check that the fastapi backend server is running properly and showing the pipeline and query.
Next, open a new terminal, cd into the frontend folder, run npm install to get React's dependencies, and then npm run dev to run the front end
From the frontend, you can now upload the fred csv dataset in the data folder, and query questions to the AI using the input box at the bottom of the window 
Note that you might need to scroll down a little to see the query input box

