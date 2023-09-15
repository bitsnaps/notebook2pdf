import os, subprocess, tempfile, asyncio
from fastapi import FastAPI, UploadFile, File
from starlette.responses import FileResponse
import json

app = FastAPI()

@app.get("/")
def read_root():
    return FileResponse("index.html")


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    with open(file.filename, "wb") as f:        
        try:
            content = await file.read()
            if not file.filename.endswith('.ipynb'):
                return {"error": "Invalid file format. Please upload a Jupyter Notebook file (.ipynb)."}
            notebook = json.loads(content)
            # Check if the notebook has the required fields and structure
            if "metadata" not in notebook or "cells" not in notebook:
                return {"error": "Invalid Jupyter Notebook file. Please upload a valid .ipynb file."}
            
            f.write(content)
            subprocess.run(["jupyter", "nbconvert", "--to", "pdf", file.filename])
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON format. Please upload a valid Jupyter Notebook file (.ipynb): {str(e)}"}
        except Exception as e:
            return {"error": f"Invalid file: {str(e)}"}
    
    file_name = file.filename.lower().replace('ipynb', 'pdf')
    file_location = os.path.basename(file_name)

    # Asynchronously delete the file after 5 minutes
    asyncio.create_task(delete_file_after_delay([file.filename, file_name], 5*60))

    if os.path.isfile(file_location):
        return FileResponse(file_location, media_type='application/pdf',filename=file_name)
    else:
        return {"error": "Sorry, this file could't be convertd."}

async def delete_file_after_delay(files_path, delay):
    for file_path in files_path:
        if os.path.isfile(file_path):
            await asyncio.sleep(delay)
            os.remove(file_path)