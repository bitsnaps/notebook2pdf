# Notebook2PDF

A small tool to convert Notebook (*.ipynb) file to PDF file.

## Run on dev mode
Add a new `micro`to your `Spacefile`:
```
uvicorn main:app --reload --host 0.0.0.0
```
and don't forget to install dependencies:
```
pip install -r requirements.txt
```

## Known issues:
You can't deploy this app using this configuration for free you'll get something like: `Output size limit exceeded 555.98 MB > 250.00 MB`, you probably need a premium account at Deta or remove some depdencies to make it smaller then try with different approach.