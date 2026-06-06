from fastapi import FastAPI
#from app.api.router import router

app = FastAPI(title="My Professional FastAPI App")

content={
    "username":"Mohan_the_percival",
    "description":"my first project"

    
    
}

@app.get("/")
def get_content():
  return content

@app.post("/content")
def create_content(new_content: dict):
    content.update(new_content)
    return content