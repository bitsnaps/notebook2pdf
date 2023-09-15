import subprocess
from fastapi import FastAPI, UploadFile, File
from starlette.responses import FileResponse

app = FastAPI()

@app.get("/")
def read_root():
    return FileResponse("index.html")

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    with open(file.filename, "wb") as f:
        f.write(await file.read())
    subprocess.run(["jupyter", "nbconvert", "--to", "pdf", file.filename])
    return {"filename": file.filename}
